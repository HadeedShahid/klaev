import "server-only";

import { and, eq, inArray, ne } from "drizzle-orm";

import type { Db } from "./db";
import { RECEIPT_KINDS, receipts, type ReceiptKind } from "./db/schema";

import { MAX_RECEIPT_BYTES, RECEIPT_TOO_BIG } from "./receipt-limit";

export { MAX_RECEIPT_BYTES };

// Screenshots and photos from any phone, and PDFs from banking apps.
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

// Some phones send no file type, so the file's name decides.
function typeOf(file: { name: string; type: string }) {
  if (EXTENSIONS[file.type]) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpeg") return "image/jpeg";
  return Object.keys(EXTENSIONS).find((type) => EXTENSIONS[type] === extension) ?? null;
}

export type { ReceiptKind };

// Which files an order can carry. The courier's payout voucher and the screenshot of its transfer
// belong to cash on delivery; the shipping receipt and the customer's payment receipt to any order.
export function receiptKindFor(order: { paymentMethod: string }, kind: string): ReceiptKind | null {
  const known = RECEIPT_KINDS.find((candidate) => candidate === kind);
  if (!known) return null;
  if ((known === "voucher" || known === "payout") && order.paymentMethod !== "cod") return null;
  return known;
}

export type ReceiptResult = { ok: true } | { ok: false; message: string };
export type ReceiptCheck = { ok: true; contentType: string; key: string } | { ok: false; message: string };

// Whether a file can be a receipt for this order, and where it would be kept: the private
// klaev-receipts bucket, under the order's number. Judged from the name, type and size alone, so it
// works before the file is sent anywhere.
export function checkReceipt(order: { number: number }, file: { name: string; type: string; size: number }, kind: ReceiptKind = "payment"): ReceiptCheck {
  if (file.size === 0) return { ok: false, message: kind === "payment" ? "That file is empty. Choose the screenshot again." : "That file is empty. Choose it again." };
  const contentType = typeOf(file);
  if (!contentType) return { ok: false, message: kind === "payment" ? "Upload a screenshot, a photo or a PDF of the transfer." : "Upload a photo, a screenshot or a PDF." };
  if (file.size > MAX_RECEIPT_BYTES) return { ok: false, message: RECEIPT_TOO_BIG };
  const key = `orders/${order.number}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${EXTENSIONS[contentType]}`;
  return { ok: true, contentType, key };
}

// A key the store handed out for this order, and nothing else.
export function isReceiptKeyFor(order: { number: number }, key: string) {
  return new RegExp(`^orders/${order.number}/\\d+-[0-9a-f]{8}\\.(${Object.values(EXTENSIONS).join("|")})$`).test(key);
}

// The customer's payment receipts add up; the admin's records are one of each, so a new one
// replaces the last, file and all.
async function recordReceipt(db: Db, bucket: R2Bucket, order: { id: number }, receipt: { key: string; contentType: string; size: number }, kind: ReceiptKind) {
  const [added] = await db
    .insert(receipts)
    .values({ orderId: order.id, key: receipt.key, contentType: receipt.contentType, size: receipt.size, kind })
    .returning({ id: receipts.id });
  if (kind === "payment") return;
  const replaced = await db
    .select({ id: receipts.id, key: receipts.key })
    .from(receipts)
    .where(and(eq(receipts.orderId, order.id), eq(receipts.kind, kind), ne(receipts.id, added.id)));
  if (replaced.length === 0) return;
  await db.delete(receipts).where(inArray(receipts.id, replaced.map((row) => row.id)));
  await bucket.delete(replaced.map((row) => row.key));
}

// Keeps a receipt that came through the store itself: local development, where there's no signed
// link to send it straight to storage (lib/receipt-upload-url.ts).
export async function saveReceipt(db: Db, bucket: R2Bucket, order: { id: number; number: number }, file: File, kind: ReceiptKind = "payment"): Promise<ReceiptResult> {
  const check = checkReceipt(order, file, kind);
  if (!check.ok) return check;
  await bucket.put(check.key, await file.arrayBuffer(), { httpMetadata: { contentType: check.contentType } });
  await recordReceipt(db, bucket, order, { key: check.key, contentType: check.contentType, size: file.size }, kind);
  return { ok: true };
}

// A receipt the browser sent straight to storage: it's there, it's within the limit, and now it's
// on the order. One over the limit is deleted, since the link can't stop a big file being sent.
export async function confirmReceipt(db: Db, bucket: R2Bucket, order: { id: number; number: number }, key: string, kind: ReceiptKind = "payment"): Promise<ReceiptResult> {
  if (!isReceiptKeyFor(order, key)) return { ok: false, message: "That upload didn't arrive. Try again, or send it on WhatsApp." };
  const object = await bucket.head(key);
  if (!object) return { ok: false, message: "That upload didn't arrive. Try again, or send it on WhatsApp." };
  if (object.size > MAX_RECEIPT_BYTES) {
    await bucket.delete(key);
    return { ok: false, message: RECEIPT_TOO_BIG };
  }
  await recordReceipt(db, bucket, order, { key, contentType: object.httpMetadata?.contentType ?? "application/octet-stream", size: object.size }, kind);
  return { ok: true };
}
