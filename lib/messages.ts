import "server-only";

import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import type { Db } from "./db";
import { MESSAGE_SUBJECTS, messages } from "./db/schema";
import { normalizePhone } from "./phone";

export type MessageSubject = (typeof MESSAGE_SUBJECTS)[number];
export const SUBJECT_LABELS: Record<MessageSubject, string> = {
  general: "A question",
  order: "An order",
  custom: "A custom jacket",
  exchange: "An exchange",
};

// A message from the contact form: a name, a way to reply (a mobile number, an email, or both)
// and what it's about.
export async function sendMessage(
  db: Db,
  input: { name: string; email: string; phone: string; subject: string; body: string },
): Promise<{ ok: true } | { ok: false; field?: "name" | "contact" | "body"; message: string }> {
  const name = input.name.trim();
  if (!name || name.length > 120) return { ok: false, field: "name", message: "Enter your name." };
  const email = input.email.trim().toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, field: "contact", message: "That email doesn't look right." };
  const phone = input.phone.trim() ? normalizePhone(input.phone) : null;
  if (input.phone.trim() && !phone) return { ok: false, field: "contact", message: "Enter a mobile number, like 0300 1234567." };
  if (!email && !phone) return { ok: false, field: "contact", message: "Add a mobile number or an email, so we can reply." };
  const body = input.body.trim();
  if (!body) return { ok: false, field: "body", message: "Write your message." };
  if (body.length > 4000) return { ok: false, field: "body", message: "Keep it under 4,000 characters." };
  const subject = MESSAGE_SUBJECTS.find((candidate) => candidate === input.subject) ?? "general";
  await db.insert(messages).values({ name, email: email || null, phone, subject, body });
  return { ok: true };
}

// Waiting messages first, newest first; handled ones after.
export async function listMessages(db: Db, { handled = false }: { handled?: boolean } = {}) {
  return db
    .select()
    .from(messages)
    .where(handled ? isNotNull(messages.handledAt) : isNull(messages.handledAt))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(200);
}

export type Message = Awaited<ReturnType<typeof listMessages>>[number];

export async function setHandled(db: Db, id: number, handled: boolean) {
  await db
    .update(messages)
    .set({ handledAt: handled ? new Date() : null })
    .where(and(eq(messages.id, id), handled ? isNull(messages.handledAt) : isNotNull(messages.handledAt)));
}

export async function waitingMessages(db: Db) {
  const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(messages).where(isNull(messages.handledAt));
  return row.count;
}
