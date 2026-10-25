import { describe, expect, test } from "vitest";

import imageLoader from "./image-loader";
import { MEDIA_URL } from "./media";

const photo = `${MEDIA_URL}/products/black-cropped-leather-jacket/4f1c2a9b7e.webp`;

describe("imageLoader", () => {
  test("a product photo loads the stored copy made for that width", () => {
    expect(imageLoader({ src: photo, width: 1080 })).toBe(
      `${MEDIA_URL}/products/black-cropped-leather-jacket/4f1c2a9b7e-1080.webp`,
    );
  });

  test("a width with no stored copy rounds up to the next one", () => {
    expect(imageLoader({ src: photo, width: 700 })).toBe(
      `${MEDIA_URL}/products/black-cropped-leather-jacket/4f1c2a9b7e-828.webp`,
    );
  });

  test("anything wider than the largest copy gets the largest", () => {
    expect(imageLoader({ src: photo, width: 3840 })).toBe(
      `${MEDIA_URL}/products/black-cropped-leather-jacket/4f1c2a9b7e-1920.webp`,
    );
  });

  test("files shipped with the site are left as they are", () => {
    expect(imageLoader({ src: "/_next/static/media/hero.webp", width: 640 })).toBe("/_next/static/media/hero.webp?w=640");
  });
});
