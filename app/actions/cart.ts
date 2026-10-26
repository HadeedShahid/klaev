"use server";

import { getVariant } from "@/lib/catalog";
import { getCartView, readCart, writeCart, type CartView } from "@/lib/cart";
import { addLine, removeLine } from "@/lib/cart-codec";

export type AddToCartState =
  | { status: "idle" }
  | { status: "added"; count: number }
  | { status: "error"; message: string };

export async function addToCart(_prev: AddToCartState, formData: FormData): Promise<AddToCartState> {
  const variantId = formData.get("variantId");
  if (typeof variantId !== "string" || variantId.length === 0) {
    return { status: "error", message: "Choose a size first." };
  }

  const match = await getVariant(variantId);
  if (!match) return { status: "error", message: "That item is no longer available." };
  if (!match.variant.available) return { status: "error", message: "That size just sold out." };

  const lines = addLine(await readCart(), variantId);
  await writeCart(lines);
  return { status: "added", count: lines.reduce((sum, line) => sum + line.quantity, 0) };
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
