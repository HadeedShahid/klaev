"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCartView, readCart, writeCart } from "@/lib/cart";
import { parseCheckout, type CheckoutField } from "@/lib/checkout";
import { getDb } from "@/lib/db";
import { recordServerEvent } from "@/lib/analytics";
import { checkoutOrdered, saveCheckout } from "@/lib/checkouts";
import { checkDiscount, type DiscountKind } from "@/lib/discounts";
import { placeOrder } from "@/lib/orders";
import { normalizePhone } from "@/lib/phone";
import { refreshStore } from "@/lib/refresh-store";
import { isLocalRequest } from "@/lib/request";

export type CheckoutState = {
  errors?: Partial<Record<CheckoutField, string>>;
  fields?: Partial<Record<CheckoutField, string>>;
  message?: string;
};

// This browser's checkout, so what's typed can be followed up if no order comes of it.
const CHECKOUT_COOKIE = "klaev_checkout";
const TOKEN = /^[A-Za-z0-9_-]{16,40}$/;

// Saves the checkout as it stands once the phone number is in: what's been typed and what's in the
// cart (read here, not sent from the page). Klaev follows up on WhatsApp if no order comes of it.
export async function saveCheckoutDraft(fields: { name: string; email: string; phone: string; city: string; address: string }) {
  const phone = normalizePhone(String(fields.phone ?? ""));
  if (!phone) return;
  const cart = await getCartView();
  if (cart.lines.length === 0) return;
  const store = await cookies();
  let token = store.get(CHECKOUT_COOKIE)?.value;
  if (!token || !TOKEN.test(token)) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
    store.set(CHECKOUT_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: !(await isLocalRequest()), path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  await saveCheckout(await getDb(), token, {
    name: String(fields.name ?? ""),
    email: String(fields.email ?? ""),
    phone,
    city: String(fields.city ?? ""),
    address: String(fields.address ?? ""),
    lines: cart.lines.map((line) => ({ variantId: Number(line.variantId), title: line.title, size: line.size, quantity: line.quantity, price: line.unitPrice })),
  });
}

export type AppliedDiscount = { code: string; kind: DiscountKind; amount: number; freeDelivery: boolean; label: string };

// The Apply button at checkout: whether the code works on this cart, and what it takes off. The
// cart's subtotal is read here, not sent from the page; placing the order checks the code again.
export async function applyDiscount(typed: string): Promise<{ ok: true; discount: AppliedDiscount } | { ok: false; message: string }> {
  const cart = await getCartView();
  if (cart.lines.length === 0) return { ok: false, message: "Your cart is empty." };
  const check = await checkDiscount(await getDb(), typed.slice(0, 40), { subtotal: cart.subtotal });
  if (!check.ok) return check;
  const { code, kind, amount, freeDelivery, label } = check;
  return { ok: true, discount: { code, kind, amount, freeDelivery, label } };
}

export async function checkout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = parseCheckout(formData);
  if (!parsed.ok) return { errors: parsed.errors, fields: parsed.fields };

  const discountCode = String(formData.get("discountCode") ?? "");
  const result = await placeOrder(await getDb(), { customer: parsed.values, lines: await readCart(), discountCode });
  if (!result.ok) {
    return {
      fields: parsed.values,
      message:
        result.reason === "empty"
          ? "Your cart is empty, so there is nothing to order."
          : result.reason === "discount"
            ? `${result.message} Remove the code or try another, then place the order again.`
            : `Not enough left of ${result.items.join(" and ")}. Change your cart, then place the order again.`,
    };
  }

  const store = await cookies();
  const draft = store.get(CHECKOUT_COOKIE)?.value;
  if (draft && TOKEN.test(draft)) {
    await checkoutOrdered(await getDb(), draft, result.number);
    store.delete(CHECKOUT_COOKIE);
  }
  await writeCart([]);
  await recordServerEvent("order", { orderNumber: result.number, path: "/checkout" });
  // Cached pages show which sizes are in stock, so a size that just sold out refreshes them all.
  if (result.soldOut) await refreshStore();
  redirect(`/orders/${result.token}`);
}
