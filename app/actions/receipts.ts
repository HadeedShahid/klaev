"use server";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import { getDb } from "@/lib/db";
import { notifyReceipt } from "@/lib/notify";
import { getOrderByToken } from "@/lib/orders";
import { canSignReceiptUploads, receiptUploadUrl } from "@/lib/receipt-upload-url";
import { checkReceipt, confirmReceipt, saveReceipt } from "@/lib/receipts";

export type ReceiptState = { status: "idle" } | { status: "received" } | { status: "error"; message: string };
export type ReceiptStart =
  | { status: "direct"; url: string; key: string; contentType: string }
  | { status: "through-store" }
  | { status: "error"; message: string };

const WRONG_LINK = "This order link isn't right. Send the screenshot on WhatsApp instead.";

// The order link is the customer's only key, so the token decides which order the receipt joins.
// First the store checks the file and hands back a signed link to send it to.
export async function startReceiptUpload(token: string, file: { name: string; type: string; size: number }): Promise<ReceiptStart> {
  const order = await getOrderByToken(await getDb(), token);
  if (!order) return { status: "error", message: WRONG_LINK };
  const check = checkReceipt(order, file);
  if (!check.ok) return { status: "error", message: check.message };
  const { env } = await getCloudflareContext({ async: true });
  if (!canSignReceiptUploads(env)) return { status: "through-store" };
  return { status: "direct", key: check.key, contentType: check.contentType, url: await receiptUploadUrl(env, check.key, check.contentType) };
}

// Then, once the browser has sent it, the receipt goes on the order.
export async function finishReceiptUpload(token: string, key: string): Promise<ReceiptState> {
  const db = await getDb();
  const order = await getOrderByToken(db, token);
  if (!order) return { status: "error", message: WRONG_LINK };
  const { env } = await getCloudflareContext({ async: true });
  const result = await confirmReceipt(db, env.RECEIPTS, order, key);
  if (!result.ok) return { status: "error", message: result.message };
  await notifyReceipt(order.number);
  return { status: "received" };
}

// The file through the store itself, where there's no signed link (local development).
export async function uploadReceipt(token: string, _prev: ReceiptState, formData: FormData): Promise<ReceiptState> {
  const file = formData.get("receipt");
  if (!(file instanceof File)) return { status: "error", message: "Choose the screenshot first." };

  const db = await getDb();
  const order = await getOrderByToken(db, token);
  if (!order) return { status: "error", message: WRONG_LINK };

  const { env } = await getCloudflareContext({ async: true });
  const result = await saveReceipt(db, env.RECEIPTS, order, file);
  if (!result.ok) return { status: "error", message: result.message };
  await notifyReceipt(order.number);
  return { status: "received" };
}
