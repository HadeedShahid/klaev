"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getDb } from "@/lib/db";
import { getOrderByToken } from "@/lib/orders";
import { saveReceipt } from "@/lib/receipts";

export type ReceiptState = { status: "idle" } | { status: "received" } | { status: "error"; message: string };

// The order link is the customer's only key, so the token decides which order the receipt joins.
export async function uploadReceipt(token: string, _prev: ReceiptState, formData: FormData): Promise<ReceiptState> {
  const file = formData.get("receipt");
  if (!(file instanceof File)) return { status: "error", message: "Choose the screenshot first." };

  const db = await getDb();
  const order = await getOrderByToken(db, token);
  if (!order) return { status: "error", message: "This order link isn't right. Send the screenshot on WhatsApp instead." };

  const { env } = await getCloudflareContext({ async: true });
  const result = await saveReceipt(db, env.RECEIPTS, order, file);
  return result.ok ? { status: "received" } : { status: "error", message: result.message };
}
