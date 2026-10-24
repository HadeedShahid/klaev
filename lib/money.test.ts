import { describe, expect, test } from "vitest";

import { formatPKR } from "./money";

describe("formatPKR", () => {
  test("groups thousands and prefixes the currency", () => {
    expect(formatPKR(17999)).toBe("PKR 17,999");
    expect(formatPKR(2500)).toBe("PKR 2,500");
    expect(formatPKR(118999)).toBe("PKR 118,999");
  });

  test("formats zero", () => {
    expect(formatPKR(0)).toBe("PKR 0");
  });

  test("rejects non-integer amounts, since money is whole rupees", () => {
    expect(() => formatPKR(17999.5)).toThrow();
  });
});
