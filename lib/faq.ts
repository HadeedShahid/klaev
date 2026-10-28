import "server-only";

import { eq } from "drizzle-orm";

import { HOME_FAQ } from "@/data/home-faq";

import { getDb, type Db } from "./db";
import { settings } from "./db/schema";
import type { CodTerms } from "./payment";
import { fillTerms } from "./store-terms";

export type FaqItem = { question: string; answer: string };

// The FAQ with the store's current terms written in (lib/store-terms.ts).
export function fillFaq(items: FaqItem[], terms: CodTerms): FaqItem[] {
  return items.map((item) => ({ question: fillTerms(item.question, terms), answer: fillTerms(item.answer, terms) }));
}

function isFaq(value: unknown): value is FaqItem[] {
  return Array.isArray(value) && value.every((item) => typeof item?.question === "string" && typeof item?.answer === "string");
}

// The questions on the home page, as saved in the admin, or the starting set.
export async function getFaq(db?: Db): Promise<FaqItem[]> {
  const row = await (db ?? (await getDb())).query.settings.findFirst({ where: eq(settings.key, "faq") });
  return isFaq(row?.value) ? row.value : HOME_FAQ;
}

export async function saveFaq(db: Db, input: FaqItem[]): Promise<{ ok: true } | { ok: false; message: string }> {
  const items = input.map((item) => ({ question: item.question.trim(), answer: item.answer.trim() })).filter((item) => item.question || item.answer);
  if (items.some((item) => !item.question || !item.answer)) return { ok: false, message: "Each question needs an answer, and each answer a question." };
  if (items.length > 30) return { ok: false, message: "Keep it to 30 questions." };
  if (items.some((item) => /[\u2013\u2014]/.test(item.question + item.answer))) return { ok: false, message: "Use a comma or a full stop instead of a dash." };
  if (items.some((item) => item.question.length > 200 || item.answer.length > 2000)) return { ok: false, message: "Keep questions under 200 characters and answers under 2,000." };
  await db
    .insert(settings)
    .values({ key: "faq", value: items })
    .onConflictDoUpdate({ target: settings.key, set: { value: items, updatedAt: new Date() } });
  return { ok: true };
}
