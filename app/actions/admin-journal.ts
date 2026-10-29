"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { deletePhoto, storePhoto } from "@/lib/admin/media";
import { getDb } from "@/lib/db";
import { createPost, deletePost, getPost, savePost, setCover } from "@/lib/journal";
import { refreshStore } from "@/lib/refresh-store";

import type { ActionState } from "./admin";

const text = (form: FormData, name: string) => String(form.get(name) ?? "");

// The journal pages are cached like the rest of the store: a change shows on the next visit.
async function changed() {
  await refreshStore();
  refresh();
}

export async function createPostAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await createPost(await getDb(), text(form, "title"));
  if (!result.ok) return { error: result.message };
  redirect(`/admin/content/journal/${result.id}`);
}

export async function savePostAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await savePost(await getDb(), Number(form.get("postId")), {
    title: text(form, "title"),
    handle: text(form, "handle"),
    excerpt: text(form, "excerpt"),
    body: text(form, "body"),
    coverAlt: text(form, "coverAlt"),
    status: text(form, "status"),
    publishedOn: text(form, "publishedOn"),
    seoTitle: text(form, "seoTitle"),
    seoDescription: text(form, "seoDescription"),
  });
  if (!result.ok) return { error: result.message };
  await changed();
  return { done: "Saved." };
}

// A new cover photo, resized in the browser like product photos. The one it replaces is deleted.
export async function uploadPostCover(postId: number, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const post = await getPost(db, postId);
  if (!post) return { error: "That article isn't there any more." };
  const stored = await storePhoto(form, `journal/${post.handle}`);
  if (!stored.ok) return { error: stored.message };
  const previous = await setCover(db, postId, stored);
  if (previous) await deletePhoto(previous);
  await changed();
  return { done: "Cover added." };
}

export async function removeCoverAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const previous = await setCover(await getDb(), Number(form.get("postId")), null);
  if (previous) await deletePhoto(previous);
  await changed();
  return { done: "Cover removed." };
}

export async function deletePostAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const deleted = await deletePost(await getDb(), Number(form.get("postId")));
  if (deleted?.coverSrc) await deletePhoto(deleted.coverSrc);
  await refreshStore();
  redirect("/admin/content/journal");
}
