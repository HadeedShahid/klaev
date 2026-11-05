import { describe, expect, test } from "vitest";

import { isRestocking } from "./restock";

const sizes = (...available: boolean[]) => available.map((ok, index) => ({ id: String(index), sku: "", size: "SMLX"[index], colour: null, available: ok }));

describe("restocking soon", () => {
  test("shows on a tagged product while any size is sold out", () => {
    expect(isRestocking({ tags: ["burgundy", "restocking"], variants: sizes(false, false, false, false) })).toBe(true);
    expect(isRestocking({ tags: ["Restocking "], variants: sizes(true, false, false, false) })).toBe(true);
  });

  test("goes by itself once every size is back, tag or no tag", () => {
    expect(isRestocking({ tags: ["restocking"], variants: sizes(true, true, true, true) })).toBe(false);
  });

  test("never shows on a sold-out product that isn't tagged", () => {
    expect(isRestocking({ tags: ["dark brown"], variants: sizes(false, false, false, false) })).toBe(false);
  });
});
