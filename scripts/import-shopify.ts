import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { shopifyImport } from "./lib/shopify-import";
import { toFile } from "./lib/sql";

// Reads the Shopify exports in data/private/ (ignored by git: they hold customers' personal details)
// and writes data/private/shopify-import.sql. `pnpm db:import` runs it on the local database; the real
// database gets it once, before launch, with `wrangler d1 execute klaev --remote --file ...`.
const dir = path.join("data", "private");
const read = (name: string) => readFileSync(path.join(dir, `shopify-${name}.csv`), "utf8");

const { statements, report } = shopifyImport({
  products: read("products"),
  customers: read("customers"),
  orders: read("orders"),
});

const out = path.join(dir, "shopify-import.sql");
writeFileSync(out, toFile(statements));
console.log(
  `Wrote ${out}: ${report.costPrices} cost prices, ${report.customers} customers ` +
    `(${report.skippedCustomers} test or spam sign-ups left out), ${report.orders} orders up to #${report.lastOrderNumber}.`,
);
for (const warning of report.warnings) console.warn(`Warning: ${warning}`);
