"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { createExchange, createManualOrder, editItems, receiveReturn } from "@/lib/admin/order-changes";
import { markContacted } from "@/lib/checkouts";
import { getDb } from "@/lib/db";

import type { ActionState } from "./admin";

const text = (form: FormData, name: string) => String(form.get(name) ?? "");
// Rupees as typed ("2,000" or "2000"). Empty is NaN, which the checks refuse, or `empty` where given.
const rupees = (value: string, empty = Number.NaN) => (value.replace(/[,\s]/g, "") === "" ? empty : Number(value.replace(/[,\s]/g, "")));

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// Stock moved, and the storefront's cached pages show stock.
function stockChanged() {
  revalidatePath("/", "layout");
  refresh();
}

// The order's items as edited in the dialog: each size and how many.
export async function editItemsAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const items = parseJson<{ variantId: number; quantity: number }[]>(text(form, "items"), []);
  const result = await editItems(await getDb(), Number(form.get("number")), Array.isArray(items) ? items : []);
  if (!result.ok) return { error: result.message };
  stockChanged();
  return { done: "Items saved." };
}

// Sends another size against a delivered order, then opens the new exchange order.
export async function exchangeAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await createExchange(await getDb(), Number(form.get("number")), {
    lineId: Number(form.get("lineId")),
    variantId: Number(form.get("variantId")),
    charge: rupees(text(form, "charge"), 0),
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/", "layout");
  redirect(`/admin/orders/${result.number}`);
}

export async function returnAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await receiveReturn(await getDb(), Number(form.get("number")));
  if (!result.ok) return { error: result.message };
  stockChanged();
  return { done: "Back in stock." };
}

// An order taken on WhatsApp, Instagram or in person. The form sends its items as JSON.
export async function manualOrderAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const items = parseJson<{ variantId: number; quantity: number; unitPrice: number }[]>(text(form, "items"), []);
  const result = await createManualOrder(await getDb(), {
    name: text(form, "name"),
    phone: text(form, "phone"),
    email: text(form, "email"),
    city: text(form, "city"),
    address: text(form, "address"),
    items: Array.isArray(items) ? items : [],
    discount: rupees(text(form, "discount"), 0),
    deliveryFee: rupees(text(form, "deliveryFee"), 0),
    paymentMethod: text(form, "paymentMethod"),
    advance: rupees(text(form, "advance"), 0),
    received: form.get("received") === "on",
    note: text(form, "note"),
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/", "layout");
  redirect(`/admin/orders/${result.number}`);
}

// The WhatsApp follow-up on an abandoned checkout, noted so it isn't sent twice.
export async function contactedAction(id: number) {
  await requireAdmin();
  await markContacted(await getDb(), id);
  refresh();
}
