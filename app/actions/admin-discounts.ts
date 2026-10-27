"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { deleteDiscount, saveDiscount, setDiscountActive } from "@/lib/admin/discounts";
import { DISCOUNT_KINDS } from "@/lib/db/schema";
import { getDb } from "@/lib/db";

import type { ActionState } from "./admin";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
// Whole numbers as typed ("1,000" or "1000"); empty is null where the field is optional.
const whole = (value: string) => (value.replace(/[,\s]/g, "") === "" ? null : Number(value.replace(/[,\s]/g, "")));

// Discount codes: create or change one, turn it on or off, or remove one no order has used.
export async function discountAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const intent = text(form, "intent");
  const id = Number(form.get("id"));
  let result;
  if (intent === "create" || intent === "edit") {
    const kind = DISCOUNT_KINDS.find((candidate) => candidate === text(form, "kind"));
    if (!kind) return { error: "Choose what the code takes off." };
    result = await saveDiscount(db, intent === "create" ? null : id, {
      code: text(form, "code"),
      kind,
      value: whole(text(form, "value")) ?? Number.NaN,
      minSubtotal: whole(text(form, "minSubtotal")),
      startsOn: text(form, "startsOn"),
      endsOn: text(form, "endsOn"),
      usageLimit: whole(text(form, "usageLimit")),
      oncePerCustomer: form.get("oncePerCustomer") === "on",
    });
  } else if (intent === "on" || intent === "off") {
    result = await setDiscountActive(db, id, intent === "on");
  } else if (intent === "delete") {
    result = await deleteDiscount(db, id);
  } else {
    return { error: "That isn't something a code can do." };
  }
  if (!result.ok) return { error: result.message };
  refresh();
  return { done: intent === "create" ? "Code created." : intent === "delete" ? "Code removed." : "Saved." };
}
