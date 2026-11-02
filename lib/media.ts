// Product photos live in the klaev-media R2 bucket. Each photo is stored once at full size
// (products/<handle>/<hash>.webp, which is what the database keeps) and once per width below
// (products/<handle>/<hash>-<width>.webp), so no resizing happens when a page loads.
export const MEDIA_URL = "https://media.klaev.com";

// The only widths next/image asks for (next.config.ts), and the copies stored for each photo.
export const IMAGE_SIZES = [96, 256, 384];
export const DEVICE_SIZES = [640, 828, 1080, 1200, 1920];
export const MEDIA_WIDTHS = [...IMAGE_SIZES, ...DEVICE_SIZES];

// The full-size copy is capped here; originals from the phone camera are 3024 wide.
export const MEDIA_FULL_WIDTH = 2560;
