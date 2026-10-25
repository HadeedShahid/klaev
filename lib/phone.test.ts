import { describe, expect, test } from "vitest";

import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  test.each([
    ["03231483650", "+923231483650"],
    ["0323 1483650", "+923231483650"],
    ["0323-1483650", "+923231483650"],
    ["+92 323 1483650", "+923231483650"],
    ["923231483650", "+923231483650"],
    ["00923231483650", "+923231483650"],
    ["3231483650", "+923231483650"],
    // Shopify's exports put a quote in front of phone numbers so spreadsheets keep them as text.
    ["'+923231483650", "+923231483650"],
    ["'03231483650", "+923231483650"],
    ["04235761234", "+924235761234"],
    ["+966597651149", "+966597651149"],
    ["+1 (209) 640-3328", "+12096403328"],
  ])("%s becomes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  test.each(["", "   ", "phone", "12345", "4763431484", "+12"])("%j is not a usable number", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});
