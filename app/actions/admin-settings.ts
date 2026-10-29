"use server";

import { refresh } from "next/cache";

import { changePassword, requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";
import { saveFaq, type FaqItem } from "@/lib/faq";
import { refreshStore } from "@/lib/refresh-store";
import { saveBankAccount, saveCodTerms } from "@/lib/settings";

import type { ActionState } from "./admin";

const text = (form: FormData, name: string) => String(form.get(name) ?? "");
const rupees = (value: string) => (value.replace(/[,\s]/g, "") === "" ? Number.NaN : Number(value.replace(/[,\s]/g, "")));

// The COD delivery fee and advance show on every product page, the cart and the FAQ, so they all refresh.
export async function codTermsAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await saveCodTerms(await getDb(), { codDeliveryFee: rupees(text(form, "codDeliveryFee")), codAdvance: rupees(text(form, "codAdvance")) });
  if (!result.ok) return { error: result.message };
  await refreshStore();
  refresh();
  return { done: "Saved. The store shows the new amounts now." };
}

export async function bankAccountAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await saveBankAccount(await getDb(), {
    bank: text(form, "bank"),
    accountTitle: text(form, "accountTitle"),
    accountNumber: text(form, "accountNumber"),
    iban: text(form, "iban"),
  });
  if (!result.ok) return { error: result.message };
  refresh();
  return { done: "Saved. New orders show this account." };
}

export async function passwordAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await changePassword(text(form, "current"), text(form, "next"), text(form, "again"));
  if (!result.ok) return { error: result.message };
  return { done: "Password changed. Other devices are signed out." };
}

// The home page questions, in order, from the FAQ editor.
export async function faqAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  let items: FaqItem[] = [];
  try {
    items = JSON.parse(text(form, "items")) as FaqItem[];
  } catch {
    return { error: "That didn't come through. Try again." };
  }
  const result = await saveFaq(await getDb(), Array.isArray(items) ? items : []);
  if (!result.ok) return { error: result.message };
  await refreshStore();
  refresh();
  return { done: "Saved. The home page shows it now." };
}
