import type { EmailContent } from "@/lib/email";
import { formatPKR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import type { BankAccount } from "@/lib/settings";
import { STORE, whatsappLink } from "@/lib/store";

import { address, amounts, heading, lead, lineDetail, note, orderLines, page, panel, pill, textLink, title, type EmailLine } from "./layout";

// What customers get by email, in the words of the order page. The courier is never named.
export type EmailOrder = {
  number: number;
  // The order's private link. Orders imported from Shopify have none.
  token: string | null;
  paymentMethod: string;
  name: string;
  phone: string | null;
  address1: string | null;
  city: string | null;
  subtotal: number;
  discountCode: string | null;
  discountTotal: number;
  deliveryFee: number;
  total: number;
  advance: number;
  trackingNumber: string | null;
  lines: EmailLine[];
};

const SIGN_OFF = (site: string) => [`Questions? Reply to this email, or message us on WhatsApp: ${STORE.whatsappDisplay}`, site];

const orderLink = (order: EmailOrder, site: string) => (order.token ? `${site}/orders/${order.token}` : `${site}/track`);

function delivery(order: EmailOrder) {
  const lines = [order.name, order.address1, order.city, order.phone ? formatPhone(order.phone) : null];
  return lines.filter((line): line is string => Boolean(line));
}

function money(order: EmailOrder) {
  const cod = order.paymentMethod === "cod";
  return [
    { term: "Subtotal", value: formatPKR(order.subtotal) },
    ...(order.discountTotal > 0
      ? [{ term: `Discount${order.discountCode ? ` (${order.discountCode})` : ""}`, value: `−${formatPKR(order.discountTotal)}` }]
      : []),
    { term: `Delivery${cod ? ", cash on delivery" : ", bank transfer"}`, value: order.deliveryFee > 0 ? formatPKR(order.deliveryFee) : "Free" },
    { term: "Total", value: formatPKR(order.total), strong: true },
    ...(cod
      ? [
          { term: "Advance, sent to confirm", value: formatPKR(order.advance) },
          { term: "Paid on delivery, in cash", value: formatPKR(order.total - order.advance) },
        ]
      : []),
  ];
}

const linesAsText = (order: EmailOrder) => order.lines.map((line) => `- ${line.title}. ${lineDetail(line)}. ${formatPKR(line.unitPrice * line.quantity)}`);

const SCREENSHOT = "Then send us the screenshot of the transfer. We confirm your order on WhatsApp once it's in.";

export function orderReceivedEmail(order: EmailOrder, { bank, site }: { bank: BankAccount | null; site: string }): EmailContent {
  const cod = order.paymentMethod === "cod";
  const sendNow = cod ? order.advance : order.total;
  const heading1 = `Order #${order.number} is in.`;
  const first = sendNow > 0 ? `Send ${formatPKR(sendNow)} to confirm it.` : "We confirm your order on WhatsApp.";
  const second = cod ? `The rest, ${formatPKR(order.total - order.advance)}, is paid in cash when it arrives.` : "Delivery is free.";
  const link = orderLink(order, site);
  const subject = `Order #${order.number} is in`;

  const account = bank
    ? [
        { term: "Amount", value: formatPKR(sendNow), strong: true },
        { term: "Bank", value: bank.bank },
        { term: "Account title", value: bank.accountTitle },
        { term: "Account number", value: bank.accountNumber },
        ...(bank.iban ? [{ term: "IBAN", value: bank.iban }] : []),
      ]
    : null;
  const whatsapp = whatsappLink(`Hi Klaev, here is the payment screenshot for order #${order.number}.`);

  const paying =
    sendNow > 0
      ? heading("Where to send it") +
        (account ? panel(account) : note("We send the account details on WhatsApp.")) +
        note(SCREENSHOT) +
        pill("Upload screenshot", link) +
        textLink("Or send it on WhatsApp", whatsapp)
      : pill("View your order", link);

  return {
    subject,
    html: page({
      subject,
      preview: `${first} ${second}`,
      body:
        title(heading1) +
        lead(first, second) +
        paying +
        heading("Your order") +
        orderLines(order.lines) +
        amounts(money(order)) +
        heading("Delivering to") +
        address(delivery(order)),
    }),
    text: [
      heading1,
      "",
      first,
      second,
      "",
      ...(sendNow > 0
        ? [
            "Where to send it",
            ...(account ? account.map(({ term, value }) => `${term}: ${value}`) : ["We send the account details on WhatsApp."]),
            "",
            SCREENSHOT,
            `Upload it here: ${link}`,
            `Or send it on WhatsApp: ${STORE.whatsappDisplay}`,
          ]
        : [`View your order: ${link}`]),
      "",
      "Your order",
      ...linesAsText(order),
      ...money(order).map(({ term, value }) => `${term}: ${value}`),
      "",
      "Delivering to",
      ...delivery(order),
      "",
      ...SIGN_OFF(site),
    ].join("\n"),
  };
}

export function orderShippedEmail(order: EmailOrder & { paid: number; codTax: number }, { site }: { site: string }): EmailContent {
  // What the rider collects: the same sum as the packing slip's.
  const collect = order.paymentMethod === "cod" ? Math.max(0, order.total - order.paid - order.codTax) : 0;
  const heading1 = `Order #${order.number} is on its way.`;
  const first = `Most orders arrive in ${STORE.deliveryDays} days.`;
  const second = `${collect > 0 ? `Keep ${formatPKR(collect)} ready in cash. ` : ""}The rider may call before delivering.`;
  const link = orderLink(order, site);
  const subject = `Order #${order.number} is on its way`;

  return {
    subject,
    html: page({
      subject,
      preview: `${first} ${second}`,
      body:
        title(heading1) +
        lead(first, second) +
        `<div style="margin-top:24px;">${panel([{ term: "Tracking number", value: order.trackingNumber ?? "" }])}</div>` +
        pill("Track your order", link) +
        heading("Your order") +
        orderLines(order.lines) +
        heading("Delivering to") +
        address(delivery(order)),
    }),
    text: [
      heading1,
      "",
      first,
      second,
      "",
      `Tracking number: ${order.trackingNumber ?? ""}`,
      `Track your order: ${link}`,
      "",
      "Your order",
      ...linesAsText(order),
      "",
      "Delivering to",
      ...delivery(order),
      "",
      ...SIGN_OFF(site),
    ].join("\n"),
  };
}
