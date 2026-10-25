import { execFile, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import sharp from "sharp";

import { MEDIA_FULL_WIDTH, MEDIA_URL, MEDIA_WIDTHS } from "../lib/media";

import type { CatalogSnapshot } from "./lib/catalog-seed";
import { literal, toFile } from "./lib/sql";

// One-off, run once on 25 October 2026: moves the product photos off the Shopify CDN into the
// klaev-media R2 bucket as WebP, at full size and at every width next/image asks for (lib/media.ts).
// Names carry a hash of the original, so a file never changes and browsers may cache it for a year.
// Then it points data/catalog.json, the local database and the real database at the new files.
// Photos already in R2 are skipped, so running it again only moves what is left.

const CATALOG = path.join("data", "catalog.json");
const OUT = path.join(".wrangler", "media");
const wrangler = (args: string[]) => execFileSync("pnpm", ["exec", "wrangler", ...args], { stdio: "inherit" });
const run = promisify(execFile);

const catalog: CatalogSnapshot = JSON.parse(readFileSync(CATALOG, "utf8"));
const uploads: { key: string; file: string }[] = [];
const updates: string[] = [];

async function put({ key, file }: { key: string; file: string }) {
  const args = ["exec", "wrangler", "r2", "object", "put", `klaev-media/${key}`, "--file", file, "--remote"];
  args.push("--content-type", "image/webp", "--cache-control", "public, max-age=31536000, immutable");
  for (let attempt = 1; ; attempt++) {
    try {
      await run("pnpm", args);
      return;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}

async function store(original: Buffer, key: string, width: number) {
  const { data, info } = await sharp(original)
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const file = path.join(OUT, key);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, data);
  uploads.push({ key, file });
  return info;
}

async function main() {
  for (const product of catalog.products) {
    await Promise.all(
      product.images.map(async (image) => {
        if (image.src.startsWith(`${MEDIA_URL}/`)) return;
        const response = await fetch(image.src);
        if (!response.ok) throw new Error(`${image.src} answered ${response.status}`);
        const original = Buffer.from(await response.arrayBuffer());

        const base = `products/${product.handle}/${createHash("sha256").update(original).digest("hex").slice(0, 12)}`;
        const full = await store(original, `${base}.webp`, MEDIA_FULL_WIDTH);
        for (const width of MEDIA_WIDTHS) await store(original, `${base}-${width}.webp`, width);

        const src = `${MEDIA_URL}/${base}.webp`;
        updates.push(
          `UPDATE product_images SET src = ${literal(src)}, width = ${full.width}, height = ${full.height} WHERE src = ${literal(image.src)}`,
        );
        Object.assign(image, { src, width: full.width, height: full.height });
      }),
    );
    console.log(`${product.handle}: ${product.images.length} photos`);
  }

  if (uploads.length === 0) {
    console.log("Every photo is already in R2.");
    return;
  }

  // One upload per file, a few at a time: R2's API answers the odd upload with a 500, and
  // `wrangler r2 bulk put` gives up on the first one. Putting the same file again is harmless.
  let done = 0;
  const queue = [...uploads];
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let upload = queue.shift(); upload; upload = queue.shift()) {
        await put(upload);
        done += 1;
        if (done % 50 === 0 || done === uploads.length) console.log(`Uploaded ${done} of ${uploads.length}`);
      }
    }),
  );

  const sql = path.join(OUT, "photos.sql");
  writeFileSync(sql, toFile(updates));
  wrangler(["d1", "execute", "klaev", "--remote", "--file", sql, "-y"]);
  wrangler(["d1", "execute", "klaev", "--local", "--file", sql]);

  writeFileSync(CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Moved ${updates.length} photos (${uploads.length} files) to R2.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
