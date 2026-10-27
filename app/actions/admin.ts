"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { allowSignInAttempt, checkPassword, endSession, requireAdmin, startSession } from "@/lib/admin/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  cancelOrder,
  confirmOrder,
  deletePayment,
  editContact,
  editShipping,
  getAdminOrder,
  markDelivered,
  markPacked,
  markRefused,
  markShipped,
  recordPayment,
  recordPayout,
  saveNote,
  setAdvance,
  setCourierStatus,
  updatePayment,
  type Result,
} from "@/lib/admin/orders";
import { saveCourierSettings } from "@/lib/admin/courier";
import { restock, saveStock } from "@/lib/admin/stock";
import { getDb } from "@/lib/db";
import { saveReceipt } from "@/lib/receipts";

export type SignInState = { error: string } | null;

// Back to the admin page that sent them to sign in, and never anywhere outside the admin. The
// dashboard otherwise.
function afterSignIn(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : "";
  return /^\/admin\/[\w/?=&#%-]*$/.test(path) && !path.startsWith("/admin/login") ? path : "/admin";
}

export async function signIn(_: SignInState, form: FormData): Promise<SignInState> {
  if (!(await allowSignInAttempt())) return { error: "Too many tries. Wait a minute, then try again." };
  if (!(await checkPassword(String(form.get("password") ?? "")))) return { error: "That password isn't right." };
  await startSession();
  redirect(afterSignIn(form.get("next")));
}

export async function signOut() {
  await endSession();
  redirect("/admin/login");
}

export type ActionState = { error: string } | { done: string } | null;

// Rupees as typed: "2,000" and "2000" alike. Empty or not a number is NaN, which the checks refuse.
function rupees(value: FormDataEntryValue | null) {
  const text = String(value ?? "").replace(/[,\s]/g, "");
  return text === "" ? Number.NaN : Number(text);
}

const DONE: Record<string, string> = {
  confirm: "Confirmed.",
  pack: "Marked packed.",
  ship: "Marked shipped.",
  deliver: "Marked delivered.",
  refuse: "Marked refused. The units are back in stock.",
  cancel: "Cancelled. The units are back in stock.",
  advance: "Advance saved.",
  payment: "Payment recorded.",
  payout: "Payout recorded.",
  note: "Note saved.",
  contact: "Contact details saved.",
  shipping: "Shipping details saved.",
  payment_edit: "Payment saved.",
  payment_delete: "Payment removed.",
  courier: "Parcel status saved.",
};

// Every order action posts here with the order number and what to do.
export async function updateOrder(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const db = await getDb();
  const number = Number(form.get("number"));
  const intent = String(form.get("intent"));
  const courierFee = String(form.get("courierFee") ?? "").trim();

  const actions: Record<string, () => Promise<Result>> = {
    confirm: () => confirmOrder(db, number),
    pack: () => markPacked(db, number),
    ship: () =>
      markShipped(db, number, {
        trackingNumber: String(form.get("trackingNumber") ?? ""),
        courierFee: courierFee ? rupees(courierFee) : null,
      }),
    deliver: () => markDelivered(db, number),
    refuse: () => markRefused(db, number),
    cancel: () => cancelOrder(db, number),
    advance: () => setAdvance(db, number, rupees(form.get("advance"))),
    payment: () =>
      recordPayment(db, number, {
        method: String(form.get("method") ?? ""),
        amount: rupees(form.get("amount")),
        reference: String(form.get("reference") ?? ""),
        // A date picked in Pakistan, kept at midday there.
        receivedAt: new Date(`${form.get("receivedAt")}T12:00:00+05:00`),
      }),
    payout: () => recordPayout(db, number, rupees(form.get("amount"))),
    contact: () =>
      editContact(db, number, {
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
        address1: String(form.get("address1") ?? ""),
        city: String(form.get("city") ?? ""),
      }),
    shipping: () =>
      editShipping(db, number, {
        trackingNumber: String(form.get("trackingNumber") ?? ""),
        courierFee: courierFee ? rupees(courierFee) : null,
      }),
    payment_edit: () =>
      updatePayment(db, Number(form.get("paymentId")), {
        method: String(form.get("method") ?? ""),
        amount: rupees(form.get("amount")),
        reference: String(form.get("reference") ?? ""),
        receivedAt: new Date(`${form.get("receivedAt")}T12:00:00+05:00`),
      }),
    payment_delete: () => deletePayment(db, Number(form.get("paymentId"))),
    note: () => saveNote(db, number, String(form.get("note") ?? "")),
    courier: () => setCourierStatus(db, number, String(form.get("courierStatus") ?? "")),
  };
  const action = actions[intent];
  if (!action) return { error: "That action isn't available." };

  const result = await action();
  if (!result.ok) return { error: result.message };
  // Cancelling and refusing put stock back, which the storefront's cached pages show.
  if (intent === "cancel" || intent === "refuse") revalidatePath("/", "layout");
  refresh();
  return { done: DONE[intent] };
}

// The courier's upfront charges and the tax it keeps, as defaults for each order.
export async function updateCourierSettings(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await saveCourierSettings(await getDb(), {
    prepaidCharge: rupees(form.get("prepaidCharge")),
    codCharge: rupees(form.get("codCharge")),
    codTaxPercent: Number(String(form.get("codTaxPercent") ?? "").trim() || Number.NaN),
  });
  if (!result.ok) return { error: result.message };
  refresh();
  return { done: "Saved." };
}

// A receipt the customer sent some other way (WhatsApp, in person), kept with the order like
// one they uploaded themselves.
export async function uploadReceiptAsAdmin(number: number, _: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = form.get("receipt");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the screenshot first." };
  const db = await getDb();
  const order = await getAdminOrder(db, number);
  if (!order) return { error: `There's no order #${number}.` };
  const { env } = await getCloudflareContext({ async: true });
  const result = await saveReceipt(db, env.RECEIPTS, order, file);
  if (!result.ok) return { error: result.message };
  refresh();
  return { done: "Receipt added." };
}

// "This many came in" for one size: added to its stock, with a line in its history.
export async function restockSize(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const result = await restock(await getDb(), Number(form.get("variantId")), rupees(form.get("quantity")), String(form.get("note") ?? ""));
  if (!result.ok) return { error: result.message };
  revalidatePath("/", "layout");
  refresh();
  return { done: "Restocked." };
}

// The count on the shelf for one size. Applied as the change from what the page showed, so a sale
// made meanwhile still counts, and kept in the history as a correction.
export async function correctStock(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const variantId = Number(form.get("variantId"));
  const result = await saveStock(await getDb(), [{ variantId, from: rupees(form.get("shown")), to: rupees(form.get("count")) }]);
  if (!result.ok) return { error: result.message };
  revalidatePath("/", "layout");
  refresh();
  return { done: "Count saved." };
}

// One product's sizes: each input carries the stock the page showed and the stock typed.
export async function updateStock(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const changes = form.getAll("variant").map((id) => ({
    variantId: Number(id),
    from: rupees(form.get(`from-${id}`)),
    to: rupees(form.get(`to-${id}`)),
  }));
  const result = await saveStock(await getDb(), changes);
  if (!result.ok) return { error: result.message };
  revalidatePath("/", "layout");
  refresh();
  return { done: "Saved." };
}
