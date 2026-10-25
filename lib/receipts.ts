import "server-only";

import type { Db } from "./db";
import { receipts } from "./db/schema";

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

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
function typeOf(file: File) {
  if (EXTENSIONS[file.type]) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpeg") return "image/jpeg";
  return Object.keys(EXTENSIONS).find((type) => EXTENSIONS[type] === extension) ?? null;
}

export type ReceiptResult = { ok: true } | { ok: false; message: string };

// Keeps a bank transfer receipt in the private klaev-receipts bucket, under the order's number.
export async function saveReceipt(
  db: Db,
  bucket: R2Bucket,
  order: { id: number; number: number },
  file: File,
): Promise<ReceiptResult> {
  if (file.size === 0) return { ok: false, message: "That file is empty. Choose the screenshot again." };
  const contentType = typeOf(file);
  if (!contentType) return { ok: false, message: "Upload a screenshot, a photo or a PDF of the transfer." };
  if (file.size > MAX_RECEIPT_BYTES) {
    return { ok: false, message: "That file is over 10 MB. Upload a screenshot instead, or send it on WhatsApp." };
  }

  const key = `orders/${order.number}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${EXTENSIONS[contentType]}`;
  await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType } });
  await db.insert(receipts).values({ orderId: order.id, key, contentType, size: file.size });
  return { ok: true };
}
