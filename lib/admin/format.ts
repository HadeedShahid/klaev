import { formatPKR } from "../money";

// How long an order has waited, the way a queue reads it.
export function age(since: Date, now = new Date()) {
  const minutes = Math.floor((now.getTime() - since.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}

const karachi = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// "just now", or "5m ago": how long since, as a line under a row reads it.
export const ago = (since: Date, now = new Date()) => {
  const span = age(since, now);
  return span === "just now" ? span : `${span} ago`;
};

// "26 Oct, 14:05", in Pakistan time wherever the page renders.
export const dateTime = (date: Date) => karachi.format(date);

// Today's date in Pakistan, as a date input wants it (2026-10-26).
export const todayInKarachi = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(now);

// Pakistani mobiles as couriers and people write them (03001234567); anything else as stored.
export function localPhone(phone: string) {
  return /^\+923\d{9}$/.test(phone) ? `0${phone.slice(3)}` : phone;
}

export function whatsappTo(phone: string, message: string) {
  const url = new URL(`https://wa.me/${phone.replace(/^\+/, "")}`);
  url.searchParams.set("text", message);
  return url.toString();
}

type ParcelOrder = {
  number: number;
  name: string;
  phone: string | null;
  address1: string | null;
  city: string | null;
  total: number;
  paid: number;
  paymentMethod: string;
  lines: { title: string; size: string | null; quantity: number }[];
};

const cashToCollect = (order: Pick<ParcelOrder, "total" | "paid" | "paymentMethod">) =>
  order.paymentMethod === "cod" ? Math.max(0, order.total - order.paid) : 0;

// What the courier's booking form asks for, one field per line, ready to paste.
export function parcelText(order: ParcelOrder) {
  const items = order.lines
    .map((line) => `${line.title}${line.size ? ` (${line.size})` : ""}${line.quantity > 1 ? ` x${line.quantity}` : ""}`)
    .join(", ");
  return [
    order.name,
    order.phone ? localPhone(order.phone) : "",
    order.address1 ?? "",
    order.city ?? "",
    `COD: ${cashToCollect(order)}`,
    `Order #${order.number}: ${items}`,
  ].join("\n");
}

// The WhatsApp message for the order's stage. Customers never see the courier's name.
export function customerMessage(order: ParcelOrder & { status: string; trackingNumber: string | null }) {
  const greeting = `Assalam o Alaikum ${order.name.split(/\s+/)[0]}`;
  if (order.status === "confirmed" || order.status === "packed") {
    return `${greeting}, your Klaev order #${order.number} is confirmed. We'll send you the tracking number as soon as it ships.`;
  }
  if (order.status === "shipped") {
    const cash = cashToCollect(order);
    const tracking = order.trackingNumber ? ` Tracking number: ${order.trackingNumber}.` : "";
    const ready = cash > 0 ? ` Please keep ${formatPKR(cash)} ready for the rider.` : "";
    return `${greeting}, your Klaev order #${order.number} is on its way.${tracking}${ready}`;
  }
  return `${greeting}, this is Klaev about your order #${order.number}.`;
}
