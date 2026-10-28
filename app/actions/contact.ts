"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";

import { getDb } from "@/lib/db";
import { sendMessage } from "@/lib/messages";

export type ContactState = { sent: string } | { error: string; field?: "name" | "contact" | "body" } | null;

// The contact form. Limited per visitor like the tracking lookup, and a field people never see
// catches the bots that fill in everything.
export async function contactAction(_: ContactState, form: FormData): Promise<ContactState> {
  if (String(form.get("website") ?? "")) return { sent: "" };
  const address = (await headers()).get("cf-connecting-ip");
  if (address) {
    const { env } = await getCloudflareContext({ async: true });
    const { success } = await env.TRACK_LIMITER.limit({ key: `contact:${address}` });
    if (!success) return { error: "Too many messages at once. Wait a minute, then send it again." };
  }
  const name = String(form.get("name") ?? "");
  const result = await sendMessage(await getDb(), {
    name,
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    subject: String(form.get("subject") ?? ""),
    body: String(form.get("message") ?? ""),
  });
  if (!result.ok) return { error: result.message, field: result.field };
  return { sent: name.trim().split(/\s+/)[0] };
}
