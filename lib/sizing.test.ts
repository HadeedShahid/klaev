import { describe, expect, test } from "vitest";

import { sizeMeasurement } from "./sizing";

const chart = { unit: "in" as const, sizes: [], rows: [], notes: [] };

const garment = {
  kind: "garment" as const,
  chart,
  rows: [{ size: "M", chestFlat: 21.5, length: 23 }],
};

const body = {
  kind: "body" as const,
  chart,
  rows: [{ size: "M", chest: [38, 40] as [number, number] }],
};

describe("sizeMeasurement", () => {
  test("garment-measured jackets give the jacket's full chest, twice the flat width", () => {
    expect(sizeMeasurement(garment, "M")).toBe("Jacket chest 43 in");
  });

  test("body-measured jackets give the chest range the size fits", () => {
    expect(sizeMeasurement(body, "M")).toBe("Fits chest 38 to 40 in");
  });

  test("returns null when the guide has no row for the size, or there is no guide", () => {
    expect(sizeMeasurement(body, "S")).toBeNull();
    expect(sizeMeasurement(null, "M")).toBeNull();
  });
});
