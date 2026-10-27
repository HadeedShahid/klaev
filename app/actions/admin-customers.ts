"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { saveCustomer } from "@/lib/admin/customers";
import { getDb } from "@/lib/db";

import type { ActionState } from "./admin";

const text = (form: FormData, name: string) => String(form.get(name) ?? "");

// A customer's record: contact details, or the note and tags. Each form sends what it shows and
// carries the rest along in hidden fields.
export async function customerAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await saveCustomer(await getDb(), Number(form.get("id")), {
    name: text(form, "name"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    city: text(form, "city"),
    address1: text(form, "address1"),
    tags: text(form, "tags"),
    note: text(form, "note"),
  });
  if (!result.ok) return { error: result.message };
  refresh();
  return { done: "Saved." };
}
