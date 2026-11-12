// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import { createTestDb } from "./db/test-db";
import { alertDevices } from "./db/schema";
import { encryptPayload, getPushKeys, removeDevice, saveDevice, sendAlert } from "./push";

const fromB64 = (value: string) => new Uint8Array(Buffer.from(value, "base64url"));
const toB64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

// RFC 8291, Appendix A: the standard's own worked example of an encrypted push message.
const RFC = {
  plaintext: "When I grow up, I want to be a watermelon",
  serverPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  serverPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  phonePublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  body: "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

// A phone's subscription, as its browser hands it over: a fresh key pair and secret.
async function phone(endpoint = "https://fcm.googleapis.com/fcm/send/abc123") {
  const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const p256dh = toB64(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)));
  return { endpoint, p256dh, auth: toB64(crypto.getRandomValues(new Uint8Array(16))) };
}

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
}, 60_000);
afterAll(() => store?.dispose());

describe("push messages", () => {
  test("are encrypted for the phone exactly as the standard's worked example", async () => {
    const raw = fromB64(RFC.serverPublic);
    const privateKey = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", d: RFC.serverPrivate, x: toB64(raw.slice(1, 33)), y: toB64(raw.slice(33)) },
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveBits"],
    );
    const publicKey = await crypto.subtle.importKey("raw", raw, { name: "ECDH", namedCurve: "P-256" }, true, []);
    const body = await encryptPayload(new TextEncoder().encode(RFC.plaintext), { p256dh: RFC.phonePublic, auth: RFC.auth }, {
      salt: fromB64(RFC.salt),
      localKeys: { privateKey, publicKey },
    });
    expect(toB64(body)).toBe(RFC.body);
  });

  test("the store's key is made once and kept", async () => {
    const first = await getPushKeys(store.db);
    expect(fromB64(first.publicKey)).toHaveLength(65);
    expect(await getPushKeys(store.db)).toEqual(first);
  });

  test("a phone signs up once however often it asks, and can sign off", async () => {
    const device = await phone();
    expect(await saveDevice(store.db, device)).toEqual({ ok: true });
    expect(await saveDevice(store.db, device)).toEqual({ ok: true });
    expect(await store.db.select().from(alertDevices)).toHaveLength(1);
    expect(await saveDevice(store.db, { ...device, endpoint: "http://10.0.0.1/push" })).toMatchObject({ ok: false });
    expect(await saveDevice(store.db, { ...device, auth: "short" })).toMatchObject({ ok: false });
    await removeDevice(store.db, device.endpoint);
    expect(await store.db.select().from(alertDevices)).toHaveLength(0);
  });

  test("an alert goes to every phone, signed by the store, and a phone that's gone is forgotten", async () => {
    const kept = await phone("https://fcm.googleapis.com/fcm/send/kept");
    const gone = await phone("https://updates.push.services.mozilla.com/wpush/v2/gone");
    await saveDevice(store.db, kept);
    await saveDevice(store.db, gone);
    const keys = await getPushKeys(store.db);

    const sent: { url: string; init: RequestInit }[] = [];
    const send = async (url: string | URL | Request, init?: RequestInit) => {
      sent.push({ url: String(url), init: init! });
      return new Response(null, { status: String(url).endsWith("gone") ? 410 : 201 });
    };
    const delivered = await sendAlert(store.db, { title: "New order #1040, PKR 17,999", body: "Ali Khan, Lahore.", url: "/admin/orders/1040", tag: "order-1040" }, { send });
    expect(delivered).toBe(1);

    expect(sent.map((request) => request.url).sort()).toEqual([gone.endpoint, kept.endpoint].sort());
    const request = sent.find((candidate) => candidate.url === kept.endpoint)!;
    const headers = new Headers(request.init.headers);
    expect(headers.get("Content-Encoding")).toBe("aes128gcm");
    expect(headers.get("TTL")).toBe("86400");
    expect(headers.get("Urgency")).toBe("high");

    // The signature is the store's: the push service checks it against the key the phone signed up with.
    const [, token, key] = headers.get("Authorization")!.match(/^vapid t=([^,]+), k=(.+)$/)!;
    expect(key).toBe(keys.publicKey);
    const [header, claims, signature] = token.split(".");
    const verifier = await crypto.subtle.importKey("raw", fromB64(keys.publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, verifier, fromB64(signature), new TextEncoder().encode(`${header}.${claims}`));
    expect(valid).toBe(true);
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toMatchObject({ aud: "https://fcm.googleapis.com", sub: "mailto:business.klaev@gmail.com" });

    // Sealed for that phone alone: its own key travels in the message's header.
    const body = new Uint8Array(request.init.body as ArrayBuffer);
    expect(body[20]).toBe(65);

    expect((await store.db.select().from(alertDevices)).map((device) => device.endpoint)).toEqual([kept.endpoint]);
  });

  test("with no phones signed up, nothing is sent", async () => {
    let calls = 0;
    await sendAlert(store.db, { title: "x", body: "y", url: "/admin" }, { send: async () => (calls++, new Response(null, { status: 201 })) });
    expect(calls).toBe(0);
  });
});
