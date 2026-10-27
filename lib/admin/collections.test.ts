// @vitest-environment node
import { afterAll, beforeEach, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { catalogSeedStatements } from "@/scripts/lib/catalog-seed";

import { createTestDb } from "../db/test-db";
import { createCollection, deleteCollection, listCollectionsWithCounts, moveCollection, renameCollection } from "./collections";

let store: Awaited<ReturnType<typeof createTestDb>>;
beforeEach(async () => {
  await store?.dispose();
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
}, 60_000);
afterAll(() => store?.dispose());

describe("collections", () => {
  test("added at the end, renamed without changing the address, moved, and removed only when empty", async () => {
    expect(await createCollection(store.db, "Winter Coats")).toEqual({ ok: true });
    expect(await createCollection(store.db, "winter coats")).toMatchObject({ ok: false });
    expect(await createCollection(store.db, "All")).toMatchObject({ ok: false });
    let rows = await listCollectionsWithCounts(store.db);
    expect(rows.at(-1)).toMatchObject({ handle: "winter-coats", title: "Winter Coats", products: 0 });

    expect(await renameCollection(store.db, "winter-coats", "Coats")).toEqual({ ok: true });
    await moveCollection(store.db, "winter-coats", -1);
    rows = await listCollectionsWithCounts(store.db);
    expect(rows.at(-2)).toMatchObject({ handle: "winter-coats", title: "Coats" });

    expect(await deleteCollection(store.db, "cropped-leather-jackets")).toMatchObject({ ok: false });
    expect(await deleteCollection(store.db, "winter-coats")).toEqual({ ok: true });
    expect((await listCollectionsWithCounts(store.db)).some((row) => row.handle === "winter-coats")).toBe(false);
  });
});
