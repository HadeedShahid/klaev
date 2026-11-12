import "server-only";

import { eq } from "drizzle-orm";

import type { Db } from "./db";
import { alertDevices, settings } from "./db/schema";
import { STORE } from "./store";

// Alerts on the owner's phones, through each browser's own push service (Web Push, RFC 8030). Each
// message is sealed for one phone with the keys it signed up with (RFC 8291, aes128gcm), and each
// request carries the store's signature (VAPID, RFC 8292), so a push service only takes messages from
// Klaev for phones that signed up with Klaev. Plain WebCrypto: no library, and it runs the same on the
// Worker and in tests. The phones show them through public/admin/sw.js.

export type Alert = { title: string; body: string; url: string; tag?: string };
export type Device = { endpoint: string; p256dh: string; auth: string };
type Keys = { publicKey: string; privateKey: JsonWebKey };
type Bytes = Uint8Array<ArrayBuffer>;

const KEY_SETTING = "push_keys";
const P256 = { namedCurve: "P-256" } as const;
const DAY_SECONDS = 24 * 60 * 60;
// One record holds the whole message; a push service takes at most 4,096 bytes.
const RECORD_SIZE = 4096;
// A sign-up this new can still be unknown to its push service for a moment (seen with Google's right
// after a phone signed up again), so "gone" isn't believed yet.
const SETTLING_MS = 2 * 60 * 1000;

const encoder = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (value: string) => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (char) => char.charCodeAt(0));
const concat = (...parts: Uint8Array[]): Bytes => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, bytes: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bytes * 8));
}

// The message sealed for one phone: only the browser holding that subscription's private key can
// open it. `salt` and `localKeys` are fixed only by tests, to match the standard's worked example.
export async function encryptPayload(
  payload: Bytes,
  device: { p256dh: string; auth: string },
  { salt = crypto.getRandomValues(new Uint8Array(16)), localKeys }: { salt?: Bytes; localKeys?: CryptoKeyPair } = {},
) {
  const phonePublic = fromB64url(device.p256dh);
  const local = localKeys ?? ((await crypto.subtle.generateKey({ name: "ECDH", ...P256 }, true, ["deriveBits"])) as CryptoKeyPair);
  const localPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const phoneKey = await crypto.subtle.importKey("raw", phonePublic, { name: "ECDH", ...P256 }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: phoneKey }, local.privateKey, 256));

  const ikm = await hkdf(fromB64url(device.auth), shared, concat(encoder.encode("WebPush: info\0"), phonePublic, localPublic), 32);
  const cek = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 2 marks the last (and only) record.
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(payload, new Uint8Array([2]))));

  const header = new Uint8Array(21);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = localPublic.length;
  return concat(header, localPublic, sealed);
}

// The store's own signing key, made the first time it's needed and kept in settings. Its public half
// goes to each phone as it signs up; the private half signs every push and never leaves the server.
export async function getPushKeys(db: Db): Promise<Keys> {
  const read = async () => (await db.select({ value: settings.value }).from(settings).where(eq(settings.key, KEY_SETTING)))[0]?.value as Keys | undefined;
  const existing = await read();
  if (existing) return existing;
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", ...P256 }, true, ["sign", "verify"])) as CryptoKeyPair;
  const keys: Keys = {
    publicKey: b64url(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))),
    privateKey: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
  // Two first alerts at once keep whichever key was saved first.
  await db.insert(settings).values({ key: KEY_SETTING, value: keys }).onConflictDoNothing();
  return (await read())!;
}

// "This is Klaev": a short-lived token for one push service, signed with the store's key.
async function vapid(endpoint: string, keys: Keys) {
  const part = (value: object) => b64url(encoder.encode(JSON.stringify(value)));
  const unsigned = `${part({ typ: "JWT", alg: "ES256" })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: `mailto:${STORE.email}` })}`;
  const key = await crypto.subtle.importKey("jwk", keys.privateKey, { name: "ECDSA", ...P256 }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(unsigned)));
  return `vapid t=${unsigned}.${b64url(signature)}, k=${keys.publicKey}`;
}

// A phone that turned alerts on. Its browser's push service gave it the address and keys; asking
// again (the Settings page does on every visit) changes nothing. `replaces` is the address this
// browser had before, which its push service has dropped (on Android, installing the app makes Chrome
// drop the sign-up it had), so it goes, and the count stays one per phone.
export async function saveDevice(db: Db, device: Device, { replaces }: { replaces?: string } = {}): Promise<{ ok: true } | { ok: false; message: string }> {
  let url: URL;
  try {
    url = new URL(device.endpoint);
  } catch {
    return { ok: false, message: "That isn't a push address." };
  }
  if (url.protocol !== "https:") return { ok: false, message: "That isn't a push address." };
  try {
    if (fromB64url(device.p256dh).length !== 65 || fromB64url(device.auth).length !== 16) throw new Error();
  } catch {
    return { ok: false, message: "The phone's keys didn't come through." };
  }
  await db.insert(alertDevices).values(device).onConflictDoUpdate({ target: alertDevices.endpoint, set: { p256dh: device.p256dh, auth: device.auth } });
  if (replaces && replaces !== device.endpoint) await removeDevice(db, replaces);
  return { ok: true };
}

export async function removeDevice(db: Db, endpoint: string) {
  await db.delete(alertDevices).where(eq(alertDevices.endpoint, endpoint));
}

export async function countDevices(db: Db) {
  return (await db.select({ id: alertDevices.id }).from(alertDevices)).length;
}

// Sends one alert to every signed-up phone, or only to `endpoint`'s, and says how many push services
// took it. It never throws: a phone that can't be reached is logged, and one whose push service says
// it's gone (turned off, or the browser dropped it) is forgotten, unless it signed up moments ago.
export async function sendAlert(db: Db, alert: Alert, { send = fetch, endpoint }: { send?: typeof fetch; endpoint?: string } = {}) {
  let sent = 0;
  try {
    const devices = await (endpoint ? db.select().from(alertDevices).where(eq(alertDevices.endpoint, endpoint)) : db.select().from(alertDevices));
    if (devices.length === 0) return sent;
    const keys = await getPushKeys(db);
    const payload = encoder.encode(JSON.stringify(alert));
    await Promise.all(
      devices.map(async (device) => {
        try {
          const response = await send(device.endpoint, {
            method: "POST",
            headers: {
              Authorization: await vapid(device.endpoint, keys),
              "Content-Encoding": "aes128gcm",
              "Content-Type": "application/octet-stream",
              TTL: String(DAY_SECONDS),
              Urgency: "high",
            },
            body: await encryptPayload(payload, device),
          });
          if (response.ok) sent++;
          else if (response.status === 404 || response.status === 410) {
            const settling = Date.now() - device.createdAt.getTime() < SETTLING_MS;
            console.warn(`Alert to phone ${device.id}: its push service says it's gone (${response.status})${settling ? ", but it only just signed up, so it stays" : ", so it's forgotten"}`);
            if (!settling) await removeDevice(db, device.endpoint);
          }
          else console.error(`Alert to phone ${device.id} failed: ${response.status} ${await response.text()}`);
        } catch (error) {
          console.error(`Alert to phone ${device.id} failed`, error);
        }
      }),
    );
  } catch (error) {
    console.error("Alerts failed", error);
  }
  return sent;
}
