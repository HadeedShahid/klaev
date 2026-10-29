"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/admin/auth";
import { getDb } from "@/lib/db";
import { setHandled } from "@/lib/messages";
import { restorePage, savePage } from "@/lib/pages";
import { refreshStore } from "@/lib/refresh-store";

import type { ActionState } from "./admin";

const text = (form: FormData, name: string) => String(form.get(name) ?? "");

// A store page's words. Its cached page refreshes on the next visit.
export async function savePageAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await savePage(await getDb(), text(form, "handle"), {
    title: text(form, "title"),
    description: text(form, "description"),
    body: text(form, "body"),
  });
  if (!result.ok) return { error: result.message };
  await refreshStore();
  refresh();
  return { done: "Saved." };
}

export async function restorePageAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  await restorePage(await getDb(), text(form, "handle"));
  await refreshStore();
  refresh();
  return { done: "Back to the original." };
}

// A contact message marked handled, or back to waiting.
export async function messageAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  await setHandled(await getDb(), Number(form.get("id")), text(form, "intent") === "handled");
  refresh();
  return { done: "Saved." };
}
