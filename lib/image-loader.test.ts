import { describe, expect, test } from "vitest";

import imageLoader from "./image-loader";

const SHOPIFY = "https://cdn.shopify.com/s/files/1/0624/0796/6791/files/klaev-black-suede-jacket-01.png?v=1779028099";

describe("imageLoader", () => {
  test("asks the Shopify CDN for the exact width, keeping its version parameter", () => {
    const url = new URL(imageLoader({ src: SHOPIFY, width: 384 }));
    expect(url.hostname).toBe("cdn.shopify.com");
    expect(url.searchParams.get("v")).toBe("1779028099");
    expect(url.searchParams.get("width")).toBe("384");
  });

  test("replaces a width that is already on the URL", () => {
    const url = new URL(imageLoader({ src: `${SHOPIFY}&width=2048`, width: 828 }));
    expect(url.searchParams.getAll("width")).toEqual(["828"]);
  });

  test("leaves other sources untouched apart from the width hint", () => {
    expect(imageLoader({ src: "/hero.webp", width: 640 })).toBe("/hero.webp?w=640");
  });
});
