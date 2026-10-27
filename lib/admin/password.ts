import { fromBase64Url, toBase64Url } from "../base64url";

// The admin password is never stored, only this hash of it: PBKDF2 with SHA-256 at 100,000 rounds
// (the most Cloudflare Workers allow) over a random 16-byte salt, written as
// `pbkdf2-sha256$100000$<salt>$<hash>`. It lives in the ADMIN_PASSWORD_HASH secret
// (scripts/set-admin-password.ts sets it).
const ITERATIONS = 100_000;
const PREFIX = "pbkdf2-sha256";

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return [PREFIX, ITERATIONS, toBase64Url(salt), toBase64Url(hash)].join("$");
}

// False for a wrong password, and for a missing or malformed hash, so a store without the secret
// set lets nobody in.
export async function verifyPassword(password: string, stored: string | undefined) {
  const [prefix, rounds, saltText, hashText] = stored?.split("$") ?? [];
  if (prefix !== PREFIX || Number(rounds) !== ITERATIONS || !saltText || !hashText) return false;
  const salt = fromBase64Url(saltText);
  const expected = fromBase64Url(hashText);
  if (!salt || !expected || expected.length !== 32) return false;

  const actual = await derive(password, salt, ITERATIONS);
  // Compare every byte, whatever the first difference, so timing says nothing about the hash.
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= expected[index] ^ actual[index];
  return difference === 0;
}
