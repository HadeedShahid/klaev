// @vitest-environment node
import { describe, expect, test } from "vitest";

import { signSession, verifySession } from "./session";

const SECRET = "a-test-secret-of-at-least-thirty-two-characters";
const NOW = 1_800_000_000;

describe("admin session", () => {
  test("a signed session is valid until it expires", async () => {
    const token = await signSession(SECRET, NOW + 60);
    expect(await verifySession(SECRET, token, NOW)).toBe(true);
    expect(await verifySession(SECRET, token, NOW + 59)).toBe(true);
    expect(await verifySession(SECRET, token, NOW + 60)).toBe(false);
  });

  test("a session signed with another secret, or edited, is refused", async () => {
    const token = await signSession(SECRET, NOW + 60);
    expect(await verifySession("another-secret-of-at-least-thirty-two-chars", token, NOW)).toBe(false);
    const [, signature] = token.split(".");
    // Pushing the expiry out breaks the signature.
    expect(await verifySession(SECRET, `${NOW + 9999}.${signature}`, NOW)).toBe(false);
  });

  test("a new password version ends sessions signed under the old one", async () => {
    const token = await signSession(SECRET, NOW + 60, 1_700_000_000);
    expect(await verifySession(SECRET, token, NOW, 1_700_000_000)).toBe(true);
    expect(await verifySession(SECRET, token, NOW, 1_700_000_500)).toBe(false);
    expect(await verifySession(SECRET, token, NOW)).toBe(false);
  });

  test("no cookie, a malformed one, or no secret is no session", async () => {
    expect(await verifySession(SECRET, undefined, NOW)).toBe(false);
    expect(await verifySession(SECRET, "", NOW)).toBe(false);
    expect(await verifySession(SECRET, "not-a-session", NOW)).toBe(false);
    const token = await signSession(SECRET, NOW + 60);
    expect(await verifySession(undefined, token, NOW)).toBe(false);
    expect(await verifySession("short", token, NOW)).toBe(false);
  });
});
