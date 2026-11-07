import { PAYMENT_LABELS } from "@/lib/admin/labels";
import type { EmailContent } from "@/lib/email";
import { formatPKR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

import { lead, lineDetail, orderLines, page, panel, pill, quoted, title, type EmailLine } from "./layout";

// What the owner gets by email: what happened, who it's from, and the link to deal with it.
type AlertOrder = {
  number: number;
  paymentMethod: string;
  name: string;
  phone: string | null;
  city: string | null;
  total: number;
  advance: number;
  lines: EmailLine[];
};

const orderUrl = (order: AlertOrder, site: string) => `${site}/admin/orders/${order.number}`;
const methodLabel = (order: AlertOrder) => (PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod).toLowerCase();
const expected = (order: AlertOrder) => formatPKR(order.paymentMethod === "cod" ? order.advance : order.total);
const phoneOf = (phone: string | null) => (phone ? formatPhone(phone) : "Not given");
// Strangers type these, so they can't be trusted to stay on one line.
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

export function newOrderAlert(order: AlertOrder, site: string): EmailContent {
  const summary = `${formatPKR(order.total)}, ${methodLabel(order)}`;
  const subject = `New order #${order.number}, ${summary}`;
  const facts = [
    { term: "Customer", value: order.name },
    { term: "Phone", value: phoneOf(order.phone) },
    { term: "City", value: order.city ?? "Not given" },
    { term: "To confirm", value: expected(order) },
  ];
  const link = orderUrl(order, site);
  return {
    subject,
    html: page({
      subject,
      preview: `${order.name}, ${summary}`,
      signOff: false,
      body:
        title(`New order #${order.number}`) +
        lead(`${summary}.`) +
        `<div style="margin:24px 0;">${panel(facts)}</div>` +
        orderLines(order.lines) +
        pill("Open the order", link),
    }),
    text: [
      `New order #${order.number}`,
      `${summary}.`,
      "",
      ...facts.map(({ term, value }) => `${term}: ${value}`),
      "",
      ...order.lines.map((line) => `- ${line.title}. ${lineDetail(line)}.`),
      "",
      `Open the order: ${link}`,
    ].join("\n"),
  };
}

export function receiptAlert(order: AlertOrder, site: string): EmailContent {
  const subject = `Receipt uploaded for order #${order.number}`;
  const first = `${order.name} uploaded a transfer screenshot.`;
  const second = `Check it against ${expected(order)} in the account.`;
  const link = orderUrl(order, site);
  return {
    subject,
    html: page({ subject, preview: `${first} ${second}`, signOff: false, body: title(`Receipt for order #${order.number}`) + lead(first, second) + pill("Open the order", link) }),
    text: [`Receipt for order #${order.number}`, first, second, "", `Open the order: ${link}`].join("\n"),
  };
}

export function messageAlert(message: { name: string; email: string | null; phone: string | null; subject: string; body: string }, site: string): EmailContent {
  const name = oneLine(message.name);
  const subject = `Message from ${name}: ${message.subject}`;
  const facts = [
    ...(message.email ? [{ term: "Email", value: message.email }] : []),
    ...(message.phone ? [{ term: "Phone", value: formatPhone(message.phone) }] : []),
  ];
  const link = `${site}/admin/messages`;
  return {
    subject,
    html: page({
      subject,
      preview: oneLine(message.body).slice(0, 120),
      signOff: false,
      body:
        title(`Message from ${name}`) +
        lead(message.subject) +
        quoted(message.body) +
        `<div style="margin-top:24px;">${panel(facts)}</div>` +
        pill("Open Messages", link),
    }),
    text: [`Message from ${name}`, message.subject, "", message.body, "", ...facts.map(({ term, value }) => `${term}: ${value}`), "", `Open Messages: ${link}`].join("\n"),
  };
}

// A review written through an order's link, waiting in the admin to be published.
export function reviewAlert(review: { name: string; rating: number; body: string | null; title: string; orderNumber: number }, site: string): EmailContent {
  const name = oneLine(review.name);
  const stars = `${review.rating} of 5 stars`;
  const subject = `Review from ${name}: ${stars}`;
  const about = `${stars} for the ${review.title}, order #${review.orderNumber}.`;
  const link = `${site}/admin/reviews`;
  return {
    subject,
    html: page({
      subject,
      preview: review.body ? oneLine(review.body).slice(0, 120) : about,
      signOff: false,
      body: title(`Review from ${name}`) + lead(about, "It shows on the store once you publish it.") + (review.body ? quoted(review.body) : "") + pill("Open Reviews", link),
    }),
    text: [`Review from ${name}`, about, "It shows on the store once you publish it.", "", ...(review.body ? [review.body, ""] : []), `Open Reviews: ${link}`].join("\n"),
  };
}
