import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "@playwright/test";
import sharp from "sharp";

import catalog from "../data/catalog.json";

// Makes the store's icons and the picture a shared link shows on WhatsApp, Instagram and Facebook:
//
//   app/favicon.ico      48, 32 and 16 px, for browser tabs and Google's results
//   app/icon.png         512 px, for Android and the store's logo in search (lib/seo.ts)
//   app/apple-icon.png   180 px, for an iPhone's home screen, square (iOS rounds the corners itself)
//   public/og/klaev.jpg  1200 x 630, the three cropped jackets worn, under the wordmark
//
// Drawn by Chromium in Geist, the storefront's font, so the letters are the site's own. Run it
// again after a new shoot (the photos come from the media bucket): pnpm exec tsx scripts/brand-images.ts

const INK = "oklch(0.218 0.004 286)";
const PAPER = "oklch(1 0 0)";
const FONT = "https://fonts.googleapis.com/css2?family=Geist:wght@600&display=block";

// The worn front shot of each cropped jacket (the hero's photo, images[1]), at its stored 1200 copy.
// Black leads the store, so it takes the middle, where a square crop of the preview lands.
const LINEUP = ["dark-brown-cropped-sheepskin-leather-jacket", "black-cropped-leather-jacket", "burgundy-cropped-leather-jacket"].map((handle) => {
  const product = catalog.products.find((candidate) => candidate.handle === handle);
  if (!product) throw new Error(`${handle} isn't in data/catalog.json`);
  return product.images[1].src.replace(/\.webp$/, "-1200.webp");
});

// The preview: white ground, the wordmark centred above three photos on the storefront's rounded
// cards. The wordmark's tracking also trails its last letter, so the same space leads it to keep it
// centred.
const PREVIEW = `<!doctype html>
<html><head><link rel="stylesheet" href="${FONT}"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: ${PAPER}; font-family: Geist; display: flex; flex-direction: column; align-items: center; padding: 41px 40px 40px; gap: 41px; }
  .wordmark { font-weight: 600; font-size: 44px; line-height: 1; letter-spacing: 0.28em; padding-left: 0.28em; color: ${INK}; }
  .lineup { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width: 100%; flex: 1; min-height: 0; }
  img { width: 100%; height: 100%; object-fit: cover; border-radius: 24px; display: block; }
</style></head><body>
  <div class="wordmark">KLAEV</div>
  <div class="lineup">${LINEUP.map((src) => `<img src="${src}" alt="">`).join("")}</div>
</body></html>`;

// A K in Paper on an Ink tile, centred on the letter's own ink rather than its line box. Small icons
// get a larger letter so it still reads at 16 px. `rounded` cuts the corners; the home screen icon
// stays square because iOS masks it.
async function drawIcon(page: import("@playwright/test").Page, size: number, { rounded, letter }: { rounded: boolean; letter: number }) {
  const dataUrl = await page.evaluate(
    async ({ size, rounded, letter, ink, paper }) => {
      await document.fonts.load(`600 100px Geist`);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d")!;
      context.fillStyle = ink;
      context.beginPath();
      context.roundRect(0, 0, size, size, rounded ? size * 0.225 : 0);
      context.fill();
      context.font = `600 ${size * letter}px Geist`;
      const ink_ = context.measureText("K");
      const width = ink_.actualBoundingBoxLeft + ink_.actualBoundingBoxRight;
      const height = ink_.actualBoundingBoxAscent + ink_.actualBoundingBoxDescent;
      context.fillStyle = paper;
      context.fillText("K", (size - width) / 2 + ink_.actualBoundingBoxLeft, (size - height) / 2 + ink_.actualBoundingBoxAscent);
      return canvas.toDataURL("image/png");
    },
    { size, rounded, letter, ink: INK, paper: PAPER },
  );
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

// An .ico holding PNGs, largest first (Next reads the first for the link's sizes).
function ico(images: { size: number; png: Buffer }[]) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size % 256, entry);
    header.writeUInt8(size % 256, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(({ png }) => png)]);
}

async function main() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(PREVIEW, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    const preview = await sharp(await page.screenshot({ type: "png" }))
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
    mkdirSync(path.join("public", "og"), { recursive: true });
    writeFileSync(path.join("public", "og", "klaev.jpg"), preview);
    console.log(`public/og/klaev.jpg: ${Math.round(preview.length / 1024)} KB`);

    writeFileSync(path.join("app", "icon.png"), await drawIcon(page, 512, { rounded: true, letter: 0.57 }));
    writeFileSync(path.join("app", "apple-icon.png"), await drawIcon(page, 180, { rounded: false, letter: 0.57 }));
    const small = await Promise.all([48, 32, 16].map(async (size) => ({ size, png: await drawIcon(page, size, { rounded: true, letter: 0.7 }) })));
    writeFileSync(path.join("app", "favicon.ico"), ico(small));
    console.log("app/icon.png, app/apple-icon.png, app/favicon.ico");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
