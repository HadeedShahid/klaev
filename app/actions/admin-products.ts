"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { createCollection, deleteCollection, moveCollection, renameCollection } from "@/lib/admin/collections";
import { deletePhoto, storePhoto } from "@/lib/admin/media";
import {
  addProductImage,
  addVariant,
  createProduct,
  deleteImage,
  getProductForEdit,
  moveImage,
  PRODUCT_STATUSES,
  saveImageAlt,
  saveProduct,
  saveVariant,
} from "@/lib/admin/products";
import type { ProductSection } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { refreshStore } from "@/lib/refresh-store";

import type { ActionState } from "./admin";

const text = (form: FormData, name: string) => String(form.get(name) ?? "");
// Rupees as typed ("18,999" or "18999"). Empty is NaN, or null where the field is optional.
const rupees = (value: string) => (value.replace(/[,\s]/g, "") === "" ? Number.NaN : Number(value.replace(/[,\s]/g, "")));
const optionalRupees = (value: string) => (value.trim() === "" ? null : rupees(value));

// Every product change shows on the store at once: cached pages refresh on their next visit.
async function changed() {
  await refreshStore();
  refresh();
}

export async function createProductAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await createProduct(await getDb(), {
    title: text(form, "title"),
    collectionHandle: text(form, "collectionHandle"),
    price: rupees(text(form, "price")),
    sizes: form.getAll("size").map(String),
  });
  if (!result.ok) return { error: result.message };
  redirect(`/admin/products/${result.id}`);
}

function sectionsFrom(value: string): ProductSection[] {
  try {
    const parsed = JSON.parse(value) as ProductSection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveProductAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const status = PRODUCT_STATUSES.find((candidate) => candidate === text(form, "status")) ?? "draft";
  const result = await saveProduct(await getDb(), Number(form.get("productId")), {
    title: text(form, "title"),
    tagline: text(form, "tagline"),
    colour: text(form, "colour"),
    collectionHandle: text(form, "collectionHandle"),
    status,
    tags: text(form, "tags"),
    intro: text(form, "intro"),
    sections: sectionsFrom(text(form, "sections")),
    seoTitle: text(form, "seoTitle"),
    seoDescription: text(form, "seoDescription"),
    price: rupees(text(form, "price")),
    compareAtPrice: optionalRupees(text(form, "compareAtPrice")),
  });
  if (!result.ok) return { error: result.message };
  await changed();
  return { done: "Saved." };
}

export async function addSizeAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await addVariant(await getDb(), Number(form.get("productId")), {
    size: text(form, "size"),
    sku: text(form, "sku"),
    costPrice: optionalRupees(text(form, "costPrice")),
  });
  if (!result.ok) return { error: result.message };
  await changed();
  return { done: "Size added." };
}

export async function saveSizeAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await saveVariant(await getDb(), Number(form.get("variantId")), {
    size: text(form, "size"),
    sku: text(form, "sku"),
    costPrice: optionalRupees(text(form, "costPrice")),
  });
  if (!result.ok) return { error: result.message };
  await changed();
  return { done: "Size saved." };
}

// One photo, already resized in the browser (components/admin/photo-uploader.tsx), stored the way
// every product photo is (lib/admin/media.ts).
export async function uploadProductPhoto(productId: number, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const product = await getProductForEdit(db, productId);
  if (!product) return { error: "That product isn't there any more." };
  const stored = await storePhoto(form, `products/${product.handle}`);
  if (!stored.ok) return { error: stored.message };
  await addProductImage(db, productId, { src: stored.src, width: stored.width, height: stored.height, alt: product.title });
  await changed();
  return { done: "Photo added." };
}

// A photo's description, its place in the order, or its removal (with every stored copy).
export async function photoAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const imageId = Number(form.get("imageId"));
  const intent = text(form, "intent");
  if (intent === "alt") {
    const result = await saveImageAlt(db, imageId, text(form, "alt"));
    if (!result.ok) return { error: result.message };
  } else if (intent === "earlier" || intent === "later") {
    await moveImage(db, imageId, intent === "earlier" ? -1 : 1);
  } else if (intent === "delete") {
    const image = await deleteImage(db, imageId);
    if (image) await deletePhoto(image.src);
  } else {
    return { error: "That isn't something a photo can do." };
  }
  await changed();
  return { done: intent === "delete" ? "Photo removed." : "Saved." };
}

// Collections: add, rename, move up or down, or remove an empty one.
export async function collectionAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const handle = text(form, "handle");
  const intent = text(form, "intent");
  const result =
    intent === "create"
      ? await createCollection(db, text(form, "title"))
      : intent === "rename"
        ? await renameCollection(db, handle, text(form, "title"))
        : intent === "up" || intent === "down"
          ? await moveCollection(db, handle, intent === "up" ? -1 : 1)
          : intent === "delete"
            ? await deleteCollection(db, handle)
            : ({ ok: false, message: "That isn't something a collection can do." } as const);
  if (!result.ok) return { error: result.message };
  await changed();
  return { done: "Saved." };
}
