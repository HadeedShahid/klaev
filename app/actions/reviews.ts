"use server";

import { deletePhoto, storePhoto } from "@/lib/admin/media";
import { getDb } from "@/lib/db";
import { notifyReview } from "@/lib/notify";
import { addCustomerPhoto, reviewableOrder, submitReview } from "@/lib/reviews";

export type ReviewResult = { ok: true; id: number } | { ok: false; field?: "rating" | "body" | "name"; message: string };

const text = (form: FormData, name: string) => String(form.get(name) ?? "");

// A review written through a delivered order's link. The link is the customer's key, as on the order page.
export async function sendReview(token: string, lineId: number, form: FormData): Promise<ReviewResult> {
  const db = await getDb();
  const result = await submitReview(db, token, lineId, {
    rating: text(form, "rating"),
    body: text(form, "body"),
    name: text(form, "name"),
  });
  if (!result.ok) return result;
  const order = await reviewableOrder(db, token);
  const item = order?.items.find((candidate) => candidate.lineId === lineId);
  if (order && item) {
    await notifyReview({ name: text(form, "name").trim(), rating: Number(text(form, "rating")), body: text(form, "body").trim() || null, title: item.title, orderNumber: order.number });
  }
  return result;
}

// The photo for the review just written, resized in the browser like product photos. Checked against
// the order's link before anything is stored.
export async function sendReviewPhoto(token: string, reviewId: number, form: FormData): Promise<{ ok: boolean }> {
  const db = await getDb();
  const order = await reviewableOrder(db, token);
  if (!order?.items.some((item) => item.reviewId === reviewId)) return { ok: false };
  const stored = await storePhoto(form, `reviews/${reviewId}`);
  if (!stored.ok) return { ok: false };
  if (await addCustomerPhoto(db, token, reviewId, stored)) return { ok: true };
  await deletePhoto(stored.src);
  return { ok: false };
}
