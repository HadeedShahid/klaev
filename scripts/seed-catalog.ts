import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import snapshot from "../data/catalog.json";

import { catalogSeedStatements } from "./lib/catalog-seed";
import { toFile } from "./lib/sql";

// Writes the catalog seed as SQL; `pnpm db:seed` runs it on the local database.
const out = path.join(".wrangler", "seed", "catalog.sql");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, toFile(catalogSeedStatements(snapshot)));
console.log(`Wrote ${out}: ${snapshot.products.length} products.`);
