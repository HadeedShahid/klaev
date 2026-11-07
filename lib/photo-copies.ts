import { MEDIA_FULL_WIDTH, MEDIA_WIDTHS } from "./media";

// Browser only: a photo cut into the copies the store keeps (lib/media.ts), the full size up to 2560
// wide and one per width next/image asks for, as storePhoto() (lib/admin/media.ts) takes them.

const QUALITY = 0.82;

function draw(bitmap: ImageBitmap, width: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round((bitmap.height * width) / bitmap.width);
  const context = canvas.getContext("2d")!;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Chrome and Firefox write WebP themselves; Safari hands back a PNG, so there the encoder from
// Google's Squoosh (@jsquash/webp, WebAssembly) does it, loaded only when needed.
async function webp(canvas: HTMLCanvasElement) {
  const native = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", QUALITY));
  if (native?.type === "image/webp") return native;
  const { default: encode } = await import("@jsquash/webp/encode");
  const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
  return new Blob([await encode(pixels, { quality: QUALITY * 100 })], { type: "image/webp" });
}

// Throws when the file isn't a photo the browser can read.
export async function photoCopies(file: File) {
  const bitmap = await createImageBitmap(file);
  const full = draw(bitmap, Math.min(bitmap.width, MEDIA_FULL_WIDTH));
  const form = new FormData();
  form.set("width", String(full.width));
  form.set("height", String(full.height));
  form.set("full", await webp(full), "full.webp");
  for (const width of MEDIA_WIDTHS) form.set(`w${width}`, await webp(draw(bitmap, width)), `${width}.webp`);
  bitmap.close();
  return form;
}
