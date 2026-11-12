import { formatPKR } from "./money";
import type { Alert } from "./push";
import { expected, methodLabel, oneLine, type AlertOrder } from "./emails/alerts";

// What the owner's phones show (lib/push.ts): the email alerts' news in a line or two, opening the
// page to deal with it. The order's own alert replaces itself if it's ever sent again (`tag`).

const MAX_BODY = 160;
const clip = (value: string) => (value.length > MAX_BODY ? `${value.slice(0, MAX_BODY - 3).trimEnd()}...` : value);
const capital = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function orderPush(order: AlertOrder): Alert {
  const who = [order.name, order.city].filter(Boolean).join(", ");
  const items = order.lines.map((line) => `${line.title}, ${line.quantity > 1 ? `${line.quantity} of them` : (line.size ?? "one size")}`).join("; ");
  return {
    title: `New order #${order.number}, ${formatPKR(order.total)}`,
    body: clip(`${capital(methodLabel(order))}. ${who}. ${items}.`),
    url: `/admin/orders/${order.number}`,
    tag: `order-${order.number}`,
  };
}

export function receiptPush(order: AlertOrder): Alert {
  return {
    title: `Receipt for #${order.number}`,
    body: clip(`${order.name} uploaded a transfer screenshot. Check it against ${expected(order)} in the account.`),
    url: `/admin/orders/${order.number}`,
    tag: `receipt-${order.number}`,
  };
}

export function messagePush(message: { name: string; subject: string; body: string }): Alert {
  return { title: `Message from ${oneLine(message.name)}`, body: clip(`${message.subject}: ${oneLine(message.body)}`), url: "/admin/messages" };
}

export function reviewPush(review: { name: string; rating: number; body: string | null; title: string; orderNumber: number }): Alert {
  const about = `${review.title}, order #${review.orderNumber}.`;
  return {
    title: `Review from ${oneLine(review.name)}, ${review.rating} of 5 stars`,
    body: clip(review.body ? `${oneLine(review.body)} ${about}` : `${about} It shows on the store once you publish it.`),
    url: "/admin/reviews",
  };
}

export const TEST_PUSH: Alert = { title: "Alerts are on", body: "This phone gets new orders, receipts, messages and reviews.", url: "/admin/settings", tag: "test" };
