"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readCart, writeCart } from "@/lib/cart";
import { parseCheckout, type CheckoutField } from "@/lib/checkout";
import { getDb } from "@/lib/db";
import { placeOrder } from "@/lib/orders";

export type CheckoutState = {
  errors?: Partial<Record<CheckoutField, string>>;
  fields?: Partial<Record<CheckoutField, string>>;
  message?: string;
};

export async function checkout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = parseCheckout(formData);
  if (!parsed.ok) return { errors: parsed.errors, fields: parsed.fields };

  const result = await placeOrder(await getDb(), { customer: parsed.values, lines: await readCart() });
  if (!result.ok) {
    return {
      fields: parsed.values,
      message:
        result.reason === "empty"
          ? "Your cart is empty, so there is nothing to order."
          : `Not enough left of ${result.items.join(" and ")}. Change your cart, then place the order again.`,
    };
  }

  await writeCart([]);
  // Cached pages show which sizes are in stock, so a size that just sold out refreshes them all.
  if (result.soldOut) revalidatePath("/", "layout");
  redirect(`/orders/${result.token}`);
}
