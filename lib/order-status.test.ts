import { describe, expect, test } from "vitest";

import { orderSteps, pickedUp } from "./order-status";

const day = (n: number) => new Date(Date.UTC(2026, 10, n, 10));
const labels = (steps: { label: string }[]) => steps.map((step) => step.label);

describe("order steps", () => {
  test("a parcel goes through every step, the ones still ahead waiting", () => {
    const shipped = { createdAt: day(1), confirmedAt: day(1), packedAt: day(2), shippedAt: day(2), deliveredAt: null };
    expect(pickedUp(shipped)).toBe(false);
    expect(orderSteps(shipped)).toEqual([
      { label: "Placed", at: day(1) },
      { label: "Confirmed", at: day(1) },
      { label: "Packed", at: day(2) },
      { label: "Shipped", at: day(2) },
      { label: "Delivered", at: null },
    ]);
  });

  test("a jacket handed over without ever shipping was picked up, so packing and shipping never come into it", () => {
    const counter = { createdAt: day(7), confirmedAt: day(7), packedAt: null, shippedAt: null, deliveredAt: day(7) };
    expect(pickedUp(counter)).toBe(true);
    expect(orderSteps(counter)).toEqual([
      { label: "Placed", at: day(7) },
      { label: "Confirmed", at: day(7) },
      { label: "Picked up", at: day(7) },
    ]);
  });

  test("an order delivered after it shipped keeps its shipping steps, whatever it was paid by", () => {
    const delivered = { createdAt: day(1), confirmedAt: day(1), packedAt: null, shippedAt: day(2), deliveredAt: day(4) };
    expect(pickedUp(delivered)).toBe(false);
    expect(labels(orderSteps(delivered))).toEqual(["Placed", "Confirmed", "Packed", "Shipped", "Delivered"]);
  });
});
