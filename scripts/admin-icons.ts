import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

// The admin app's icons, cut from the store's own (app/icon.png, made by scripts/brand-images.ts):
//
//   public/admin/icon-512.png, icon-192.png  the K on a square Paper tile, for the home screen; Android
//                                            masks it to its own shape, so it fills the square
//   public/admin/badge.png                   the K alone, white on clear, for the status bar, where
//                                            Android draws only the shape
//
// Run it again after brand-images: pnpm exec tsx scripts/admin-icons.ts

async function main() {
  const source = path.join("app", "icon.png");
  const out = path.join("public", "admin");
  mkdirSync(out, { recursive: true });

  // The store's icon has rounded corners; flattening it on white squares them off.
  const square = await sharp(source).flatten({ background: "#ffffff" }).png().toBuffer();
  for (const size of [512, 192]) await sharp(square).resize(size, size).png().toFile(path.join(out, `icon-${size}.png`));

  // The letter's ink becomes the badge's shape: dark pixels opaque, paper clear. Cropped to the
  // letter with a little room, since the status bar draws it at 24 px.
  const size = 96;
  const letter = await sharp(square).trim({ background: "#ffffff" }).resize(80, 80, { fit: "contain", background: "#ffffff" }).toBuffer();
  const shape = await sharp(letter)
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: "#ffffff" })
    .greyscale()
    .negate()
    .toColourspace("b-w")
    .raw()
    .toBuffer();
  const white = await sharp({ create: { width: size, height: size, channels: 3, background: "#ffffff" } }).raw().toBuffer();
  const badge = Buffer.alloc(size * size * 4);
  for (let pixel = 0; pixel < size * size; pixel++) {
    badge.set(white.subarray(pixel * 3, pixel * 3 + 3), pixel * 4);
    badge[pixel * 4 + 3] = shape[pixel];
  }
  writeFileSync(path.join(out, "badge.png"), await sharp(badge, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer());
  console.log("public/admin/icon-512.png, icon-192.png, badge.png");
}

main();
