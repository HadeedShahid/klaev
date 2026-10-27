"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";

import { getDb } from "@/lib/db";
import { trackOrder, type TrackedOrder } from "@/lib/orders";

export type TrackState = { order: TrackedOrder } | { error: string } | null;

// Finds an order by its number and the phone it was placed with. Lookups are limited per visitor,
// so numbers and phones can't be tried at speed.
export async function lookUpOrder(_: TrackState, form: FormData): Promise<TrackState> {
  const address = (await headers()).get("cf-connecting-ip");
  if (address) {
    const { env } = await getCloudflareContext({ async: true });
    const { success } = await env.TRACK_LIMITER.limit({ key: `track:${address}` });
    if (!success) return { error: "Too many tries. Wait a minute, then try again." };
  }
  const number = Number(String(form.get("number") ?? "").replace(/[#\s]/g, ""));
  const phone = String(form.get("phone") ?? "");
  if (!Number.isSafeInteger(number) || number <= 0) return { error: "Enter the order number, like 1042." };
  if (!phone.trim()) return { error: "Enter the mobile number you ordered with." };
  const order = await trackOrder(await getDb(), number, phone);
  return order ? { order } : { error: "We couldn't find that order with that number. Check both, or message us on WhatsApp." };
}
