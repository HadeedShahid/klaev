// @vitest-environment node
import { describe, expect, test } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("admin password", () => {
  test("a hash verifies the password it was made from, and nothing else", async () => {
    const stored = await hashPassword("correct horse battery staple");
    expect(stored).toMatch(/^pbkdf2-sha256\$100000\$[\w-]+\$[\w-]+$/);
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(await verifyPassword("correct horse battery stapler", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  test("the same password hashes differently each time (a fresh salt)", async () => {
    expect(await hashPassword("same password")).not.toBe(await hashPassword("same password"));
  });

  test("a missing or malformed hash refuses every password", async () => {
    expect(await verifyPassword("anything", undefined)).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "plain-text-password")).toBe(false);
    expect(await verifyPassword("anything", "pbkdf2-sha256$1$abc$def")).toBe(false);
  });
});
