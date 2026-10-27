import { fromBase64Url, toBase64Url } from "../base64url";

// An admin session is `<expiry>.<signature>`: the Unix second it ends, signed with HMAC-SHA256
// under ADMIN_SESSION_SECRET together with the password's version. Nothing else is in it, because
// there is one admin. Setting a new secret (scripts/set-admin-password.ts does, with every new
// password) ends every session, and so does changing the password in the admin, which moves the
// version on.
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
const MIN_SECRET_LENGTH = 32;

function key(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const payload = (expiresAt: number, version: number) => new TextEncoder().encode(`klaev-admin:${version}:${expiresAt}`);

export async function signSession(secret: string, expiresAt: number, version = 0) {
  const signature = await crypto.subtle.sign("HMAC", await key(secret), payload(expiresAt, version));
  return `${expiresAt}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(secret: string | undefined, token: string | undefined, now: number, version = 0) {
  if (!secret || secret.length < MIN_SECRET_LENGTH || !token) return false;
  const match = token.match(/^(\d{1,12})\.([\w-]+)$/);
  if (!match) return false;
  const expiresAt = Number(match[1]);
  const signature = fromBase64Url(match[2]);
  if (!signature || expiresAt <= now) return false;
  // crypto.subtle.verify compares in constant time.
  return crypto.subtle.verify("HMAC", await key(secret), signature, payload(expiresAt, version));
}
