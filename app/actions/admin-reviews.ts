"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { deletePhoto, storePhoto } from "@/lib/admin/media";
import { getDb } from "@/lib/db";
import { refreshStore } from "@/lib/refresh-store";
import { addReview, saveReply, setFeatured, setReviewImage, setReviewStatus } from "@/lib/reviews";

import type { ActionState } from "./admin";

const text = (form: FormData, name: string) => String(form.get(name) ?? "");

// Every change here changes what product pages or the home page show.
async function changed() {
  await refreshStore();
  refresh();
}

// Publish, hide, send back to waiting, pick for the home page or not, or reply.
export async function reviewAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const id = Number(form.get("id"));
  const intent = text(form, "intent");
  if (intent === "publish" || intent === "hide" || intent === "waiting") {
    await setReviewStatus(db, id, intent === "publish" ? "published" : intent === "hide" ? "hidden" : "pending");
  } else if (intent === "feature" || intent === "unfeature") {
    if (!(await setFeatured(db, id, intent === "feature"))) return { error: "Only a live review can go on the home page." };
  } else if (intent === "reply") {
    const result = await saveReply(db, id, text(form, "reply"));
    if (!result.ok) return { error: result.message };
  } else {
    return { error: "Nothing changed." };
  }
  await changed();
  return { done: "Saved." };
}

// A screenshot of the message a review was typed in from, or a photo of the buyer wearing it,
// resized in the browser like product photos. The one it replaces is deleted.
export async function uploadReviewImage(id: number, which: "photo" | "screenshot", form: FormData): Promise<ActionState> {
  await requireAdmin();
  const stored = await storePhoto(form, `reviews/${id}`);
  if (!stored.ok) return { error: stored.message };
  const result = await setReviewImage(await getDb(), id, which, stored);
  if (!result.found) {
    await deletePhoto(stored.src);
    return { error: "That review isn't there any more." };
  }
  if (result.previous) await deletePhoto(result.previous);
  await changed();
  return { done: which === "photo" ? "Photo added." : "Screenshot added." };
}

export async function removeReviewImage(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const which = text(form, "which") === "photo" ? "photo" : "screenshot";
  const result = await setReviewImage(await getDb(), Number(form.get("id")), which, null);
  if (result.found && result.previous) await deletePhoto(result.previous);
  await changed();
  return { done: "Removed." };
}

// A review sent on WhatsApp or Instagram, typed in. It's live at once.
export async function addReviewAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  if (form.get("agreed") !== "on") return { error: "Add it only once they've agreed to it being on the store." };
  const result = await addReview(await getDb(), Number(form.get("number")), Number(form.get("lineId")), {
    rating: text(form, "rating"),
    body: text(form, "body"),
    name: text(form, "name"),
    source: text(form, "source"),
  });
  if (!result.ok) return { error: result.message };
  await refreshStore();
  redirect(`/admin/reviews?tab=live#review-${result.id}`);
}
