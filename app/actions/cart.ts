"use server";

import { getStockLeft, getVariant } from "@/lib/catalog";
import { getCartView, readCart, writeCart, type CartView } from "@/lib/cart";
import { addLimit, addLine, removeLine, type CartLimit } from "@/lib/cart-codec";
import { recordServerEvent } from "@/lib/analytics";

export type AddToCartState =
  | { status: "idle" }
  | { status: "added"; count: number; variantId: string; title: string; price: number }
  // The cart already holds all that's left of the size, or the most one order takes.
  | { status: "limit"; limit: CartLimit; size: string | null }
  | { status: "error"; message: string };

export async function addToCart(_prev: AddToCartState, formData: FormData): Promise<AddToCartState> {
  const variantId = formData.get("variantId");
  if (typeof variantId !== "string" || variantId.length === 0) {
    return { status: "error", message: "Choose a size first." };
  }

  const match = await getVariant(variantId);
  if (!match) return { status: "error", message: "That item is no longer available." };
  const left = await getStockLeft(variantId);
  if (left <= 0) return { status: "error", message: "That size just sold out." };

  const cart = await readCart();
  const limit = addLimit(cart.find((line) => line.variantId === variantId)?.quantity ?? 0, left);
  if (limit) return { status: "limit", limit, size: match.variant.size };

  const lines = addLine(cart, variantId);
  await writeCart(lines);
  await recordServerEvent("cart", { productHandle: match.product.handle, path: `/products/${match.product.handle}` });
  return {
    status: "added",
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    variantId,
    title: match.product.title,
    price: match.product.price,
  };
}

export async function removeFromCart(formData: FormData) {
  const variantId = formData.get("variantId");
  if (typeof variantId !== "string") return;
  await writeCart(removeLine(await readCart(), variantId));
}

// What the cart drawer shows, fetched when it opens and after each change.
export async function loadCart(): Promise<CartView> {
  return getCartView();
}
