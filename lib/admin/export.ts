import "server-only";

import { desc } from "drizzle-orm";

import type { Db } from "../db";
import { orders } from "../db/schema";
import { localPhone } from "./format";
import { COURIER_LABELS, PAYMENT_LABELS, STATUS_LABELS } from "./labels";
import { orderWhere, type OrderFilter } from "./orders";

// A spreadsheet cell: quoted, and never read as a formula (a cell starting with = + - or @ gets a ').
function cell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

const karachi = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

const HEADERS = [
  "Order", "Placed", "Status", "Courier status", "Payment", "Source", "Customer", "Phone", "Email", "City", "Address", "Items",
  "Subtotal", "Discount code", "Discount", "Delivery", "Total", "Advance", "Paid", "Courier charge", "COD tax", "Tracking number", "Note",
];

// The orders a tab and search pick out, newest first, as CSV for a spreadsheet. Money in whole rupees.
export async function ordersCsv(db: Db, { filter, query = "" }: { filter?: OrderFilter; query?: string }) {
  const rows = await db.query.orders.findMany({
    where: orderWhere(filter, query),
    orderBy: desc(orders.number),
    with: { lines: { columns: { title: true, size: true, quantity: true } }, payments: { columns: { amount: true } } },
  });
  const lines = rows.map((order) =>
    [
      order.number,
      karachi.format(order.createdAt).replace(",", ""),
      STATUS_LABELS[order.status],
      order.courierStatus ? COURIER_LABELS[order.courierStatus] : "",
      PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod,
      order.source,
      order.name,
      order.phone ? localPhone(order.phone) : "",
      order.email,
      order.city,
      order.address1,
      order.lines.map((line) => `${line.title}${line.size ? ` (${line.size})` : ""}${line.quantity > 1 ? ` x${line.quantity}` : ""}`).join("; "),
      order.subtotal,
      order.discountCode,
      order.discountTotal,
      order.deliveryFee,
      order.total,
      order.advance,
      order.payments.reduce((sum, payment) => sum + payment.amount, 0),
      order.courierFee,
      order.codTax,
      order.trackingNumber,
      order.note,
    ]
      .map(cell)
      .join(","),
  );
  // The byte order mark makes Excel read the file as UTF-8.
  return `﻿${[HEADERS.map(cell).join(","), ...lines].join("\r\n")}\r\n`;
}
