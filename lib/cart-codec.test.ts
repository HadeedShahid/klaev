import { describe, expect, test } from "vitest";

import { addLine, cartCount, decodeCart, encodeCart, MAX_QUANTITY, readCartCount, removeLine } from "./cart-codec";

describe("decodeCart", () => {
  test("returns an empty cart for a missing or malformed cookie", () => {
    expect(decodeCart(undefined)).toEqual([]);
    expect(decodeCart("")).toEqual([]);
    expect(decodeCart("not json")).toEqual([]);
    expect(decodeCart('{"a":1}')).toEqual([]);
  });

  test("drops lines with a bad variant id or quantity", () => {
    const raw = JSON.stringify([
      { v: "123", q: 1 },
      { v: "", q: 1 },
      { v: "456", q: 0 },
      { v: "789", q: 2.5 },
      { v: 12, q: 1 },
    ]);
    expect(decodeCart(raw)).toEqual([{ variantId: "123", quantity: 1 }]);
  });

  test("round-trips through encodeCart", () => {
    const lines = [
      { variantId: "1", quantity: 2 },
      { variantId: "2", quantity: 1 },
    ];
    expect(decodeCart(encodeCart(lines))).toEqual(lines);
  });
});

describe("addLine", () => {
  test("adds a new variant to the end", () => {
    expect(addLine([], "1")).toEqual([{ variantId: "1", quantity: 1 }]);
  });

  test("bumps the quantity of a variant already in the cart", () => {
    expect(addLine([{ variantId: "1", quantity: 1 }], "1")).toEqual([{ variantId: "1", quantity: 2 }]);
  });

  test("caps the quantity", () => {
    expect(addLine([{ variantId: "1", quantity: MAX_QUANTITY }], "1")).toEqual([
      { variantId: "1", quantity: MAX_QUANTITY },
    ]);
  });
});

describe("removeLine", () => {
  test("removes the variant and keeps the rest", () => {
    const lines = [
      { variantId: "1", quantity: 1 },
      { variantId: "2", quantity: 3 },
    ];
    expect(removeLine(lines, "1")).toEqual([{ variantId: "2", quantity: 3 }]);
  });
});

describe("cartCount", () => {
  test("adds up the quantities", () => {
    expect(cartCount([])).toBe(0);
    expect(cartCount([{ variantId: "1", quantity: 2 }, { variantId: "2", quantity: 1 }])).toBe(3);
  });
});

describe("readCartCount", () => {
  test("reads the count cookie out of document.cookie", () => {
    expect(readCartCount("a=1; klaev_cart_count=3; b=2")).toBe(3);
    expect(readCartCount("klaev_cart_count=0")).toBe(0);
  });

  test("treats a missing or garbled count as an empty cart", () => {
    expect(readCartCount("")).toBe(0);
    expect(readCartCount("a=1")).toBe(0);
    expect(readCartCount("klaev_cart_count=abc")).toBe(0);
    expect(readCartCount("klaev_cart_count=-4")).toBe(0);
  });
});
