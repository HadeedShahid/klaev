import "server-only";

import { cookies } from "next/headers";

import { getVariant } from "./catalog";
import { CART_COOKIE, CART_COUNT_COOKIE, cartCount, decodeCart, encodeCart, type CartLine } from "./cart-codec";
import { isLocalRequest } from "./request";

export type CartView = {
  lines: {
    variantId: string;
    quantity: number;
    handle: string;
    title: string;
    size: string | null;
    image: { src: string; width: number; height: number; alt: string } | null;
    unitPrice: number;
    lineTotal: number;
  }[];
  count: number;
  subtotal: number;
};

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function readCart(): Promise<CartLine[]> {
  return decodeCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCart(lines: CartLine[]) {
  const store = await cookies();
  const options = { sameSite: "lax", secure: !(await isLocalRequest()), path: "/", maxAge: THIRTY_DAYS } as const;
  store.set(CART_COOKIE, encodeCart(lines), { ...options, httpOnly: true });
  // Not httpOnly: the header's cart count reads it in the browser, so cached pages stay static.
  store.set(CART_COUNT_COOKIE, String(cartCount(lines)), options);
}

// Lines whose variant no longer exists in the catalog are dropped from the view.
export async function getCartView(): Promise<CartView> {
  const lines = await readCart();
  const resolved = await Promise.all(
    lines.map(async (line) => {
      const match = await getVariant(line.variantId);
      if (!match) return null;
      const { product, variant } = match;
      return {
        variantId: line.variantId,
        quantity: line.quantity,
        handle: product.handle,
        title: product.title,
        size: variant.size,
        image: product.images[0] ?? null,
        unitPrice: product.price,
        lineTotal: product.price * line.quantity,
      };
    }),
  );
  const view = resolved.filter((line) => line !== null);
  return {
    lines: view,
    count: cartCount(view),
    subtotal: view.reduce((sum, line) => sum + line.lineTotal, 0),
  };
}
