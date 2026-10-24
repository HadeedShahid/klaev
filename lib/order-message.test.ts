import { describe, expect, test } from "vitest";

import { orderMessage } from "./order-message";

describe("orderMessage", () => {
  test("lists each line with size, quantity and price, then the subtotal", () => {
    const message = orderMessage(
      [
        { title: "Dark Brown Cropped Sheepskin Leather Jacket", size: "M", quantity: 1, lineTotal: 17999 },
        { title: "Black Stitched Leather Belt", size: null, quantity: 2, lineTotal: 5000 },
      ],
      22999,
    );
    expect(message).toBe(
      [
        "Hi Klaev, I'd like to order:",
        "- Dark Brown Cropped Sheepskin Leather Jacket, size M (PKR 17,999)",
        "- Black Stitched Leather Belt, quantity 2 (PKR 5,000)",
        "Subtotal: PKR 22,999",
      ].join("\n"),
    );
  });
});
