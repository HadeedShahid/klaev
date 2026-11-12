import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { after } from "next/server";

import { getAdminOrder } from "./admin/orders";
import { messagePush, orderPush, receiptPush, reviewPush } from "./alerts";
import { getDb } from "./db";
import { sendEmail, siteOrigin } from "./email";
import { messageAlert, newOrderAlert, receiptAlert, reviewAlert } from "./emails/alerts";
import { orderReceivedEmail, orderShippedEmail } from "./emails/customer";
import { SUBJECT_LABELS, type SavedMessage } from "./messages";
import { getOrderByToken } from "./orders";
import { sendAlert } from "./push";
import { getBankAccount } from "./settings";
import { STORE } from "./store";

// The emails that follow what happens in the store, and the alerts on the owner's phones (lib/push.ts)
// beside the owner's emails. Each runs after the response has gone out, so the shopper never waits
// on them and nothing here can fail what triggered it. Call them from a server action, once the thing
// they report has really happened.
async function sending() {
  const [{ env }, request, db] = await Promise.all([getCloudflareContext({ async: true }), headers(), getDb()]);
  return { mailer: env.EMAIL, db, site: siteOrigin(request.get("host")) };
}

export async function notifyOrderPlaced(token: string) {
  const { mailer, db, site } = await sending();
  after(async () => {
    const [order, bank] = await Promise.all([getOrderByToken(db, token), getBankAccount(db)]);
    if (!order) return;
    await Promise.all([
      sendEmail(mailer, { to: STORE.email, replyTo: order.email ?? undefined, ...newOrderAlert(order, site) }),
      sendAlert(db, orderPush(order)),
      order.email ? sendEmail(mailer, { to: order.email, ...orderReceivedEmail(order, { bank, site }) }) : null,
    ]);
  });
}

export async function notifyShipped(number: number) {
  const { mailer, db, site } = await sending();
  after(async () => {
    const order = await getAdminOrder(db, number);
    if (order?.email) await sendEmail(mailer, { to: order.email, ...orderShippedEmail(order, { site }) });
  });
}

export async function notifyReceipt(number: number) {
  const { mailer, db, site } = await sending();
  after(async () => {
    const order = await getAdminOrder(db, number);
    if (order) await Promise.all([sendEmail(mailer, { to: STORE.email, replyTo: order.email ?? undefined, ...receiptAlert(order, site) }), sendAlert(db, receiptPush(order))]);
  });
}

export async function notifyMessage(message: SavedMessage) {
  const { mailer, db, site } = await sending();
  after(async () => {
    const labelled = { ...message, subject: SUBJECT_LABELS[message.subject] };
    await Promise.all([sendEmail(mailer, { to: STORE.email, replyTo: message.email ?? undefined, ...messageAlert(labelled, site) }), sendAlert(db, messagePush(labelled))]);
  });
}

export async function notifyReview(review: Parameters<typeof reviewAlert>[0]) {
  const { mailer, db, site } = await sending();
  after(async () => {
    await Promise.all([sendEmail(mailer, { to: STORE.email, ...reviewAlert(review, site) }), sendAlert(db, reviewPush(review))]);
  });
}
