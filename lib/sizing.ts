export type SizeGuide =
  | {
      kind: "garment";
      note: string;
      rows: { size: string; chestFlat: number; length: number }[];
    }
  | {
      kind: "body";
      note: string;
      rows: { size: string; chest: [number, number] }[];
    };

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
