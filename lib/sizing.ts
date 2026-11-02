// A jacket's full size chart, as Shopify's size guide images had it: one row per measurement, one
// value per size, in the unit those images used.
export type SizeChart = {
  unit: "in" | "cm";
  sizes: string[];
  rows: { name: string; values: number[] }[];
  notes: string[];
};

// The rows here give the one line under each size card; the chart is the full table.
export type SizeGuide = { chart: SizeChart } & (
  | {
      kind: "garment";
      rows: { size: string; chestFlat: number; length: number }[];
    }
  | {
      kind: "body";
      rows: { size: string; chest: [number, number] }[];
    }
);

// A jacket measured laid flat shows half its chest. Shoppers compare a full chest, so double it.
export function jacketChest(chestFlat: number) {
  return chestFlat * 2;
}

// The one line under each size card: what that size actually measures.
export function sizeMeasurement(guide: SizeGuide | null, size: string): string | null {
  if (!guide) return null;
  if (guide.kind === "garment") {
    const row = guide.rows.find((candidate) => candidate.size === size);
    return row ? `Jacket chest ${jacketChest(row.chestFlat)} in` : null;
  }
  const row = guide.rows.find((candidate) => candidate.size === size);
  return row ? `Fits chest ${row.chest[0]} to ${row.chest[1]} in` : null;
}
