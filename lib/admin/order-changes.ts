import "server-only";

import { and, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { Db } from "../db";
import { discounts, orderLines, orders, payments, products, stockChanges, variants, type STOCK_REASONS } from "../db/schema";
import { discountOff } from "../discounts";
import { customerFor, describe, isStockConflict, newToken, nextNumber } from "../orders";
import { normalizePhone } from "../phone";
import { statusIn, type Result } from "./orders";

type Batch = [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]];
type StockReason = (typeof STOCK_REASONS)[number];

const fail = (message: string) => ({ ok: false as const, message });
const whole = (value: number) => Number.isSafeInteger(value) && value >= 0;

// Items can change until the parcel ships; after that a different size goes out as an exchange.
export const ITEMS_EDITABLE = ["pending", "confirmed", "packed"] as const;

// Takes `quantity` of a size (a negative quantity puts it back) and writes it in the size's stock
// history, both only while `guard` holds. Columns as in stock_changes: id, variant_id, change,
// stock_after, reason, order_id, note, created_at.
function takeStock(db: Db, variantId: number, quantity: number, reason: StockReason, orderId: number | SQL, guard: SQL = sql`1`) {
  return [
    db
      .update(variants)
      .set({ stock: sql`${variants.stock} - ${quantity}` })
      .where(and(eq(variants.id, variantId), guard)),
    db
      .insert(stockChanges)
      .select(sql`SELECT NULL, ${variantId}, ${-quantity}, (SELECT stock FROM variants WHERE id = ${variantId}), ${reason}, ${orderId}, NULL, unixepoch() WHERE ${guard}`),
  ];
}

async function variantsById(db: Db, ids: number[]) {
  if (ids.length === 0) return new Map<number, never>();
  const rows = await db
    .select({
      id: variants.id,
      productId: variants.productId,
      sku: variants.sku,
      size: variants.size,
      stock: variants.stock,
      costPrice: variants.costPrice,
      title: products.title,
      price: products.price,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(inArray(variants.id, ids));
  return new Map(rows.map((row) => [row.id, row]));
}

// Changes what's in an order before it ships: another size, more or fewer, a jacket added or taken
// off. Stock moves by the difference, and the totals follow: lines already on the order keep the
// price they were sold at, new ones take today's price, and a percentage code is worked out again.
export async function editItems(db: Db, number: number, input: { variantId: number; quantity: number }[]): Promise<Result> {
  const wanted = new Map<number, number>();
  for (const item of input) {
    if (!Number.isSafeInteger(item.variantId) || !Number.isSafeInteger(item.quantity) || item.quantity < 0 || item.quantity > 20) {
      return fail("Each quantity is a whole number, up to 20.");
    }
    if (item.quantity > 0) wanted.set(item.variantId, (wanted.get(item.variantId) ?? 0) + item.quantity);
  }
  const order = await db.query.orders.findFirst({ where: eq(orders.number, number), with: { lines: { orderBy: (lines, { asc }) => asc(lines.id) } } });
  if (!order) return fail(`There's no order #${number}.`);
  if (!ITEMS_EDITABLE.some((status) => status === order.status)) {
    return fail(`Order #${number} has gone out, so its items stay. A different size goes out as an exchange.`);
  }
  // A line whose size has left the catalog stays as it is.
  const fixed = order.lines.filter((line) => line.variantId === null);
  if (wanted.size === 0 && fixed.length === 0) return fail("An order needs at least one item. Cancel it instead.");

  const had = new Map<number, number>();
  for (const line of order.lines) if (line.variantId !== null) had.set(line.variantId, (had.get(line.variantId) ?? 0) + line.quantity);
  const ids = [...new Set([...wanted.keys(), ...had.keys()])];
  const catalog = await variantsById(db, ids);
  for (const id of wanted.keys()) if (!catalog.has(id)) return fail("That size isn't in the catalog any more.");
  for (const id of ids) {
    const more = (wanted.get(id) ?? 0) - (had.get(id) ?? 0);
    const row = catalog.get(id);
    if (row && more > row.stock) return fail(row.stock === 0 ? `${describe(row)} is sold out.` : `Only ${row.stock} more of ${describe(row)} in stock.`);
  }

  const guard = statusIn(order.id, ITEMS_EDITABLE);
  const statements: BatchItem<"sqlite">[] = [];
  const kept: { unitPrice: number; quantity: number }[] = fixed.map((line) => ({ unitPrice: line.unitPrice, quantity: line.quantity }));
  const seen = new Set<number>();
  for (const line of order.lines) {
    if (line.variantId === null) continue;
    const quantity = seen.has(line.variantId) ? 0 : (wanted.get(line.variantId) ?? 0);
    seen.add(line.variantId);
    if (quantity === 0) statements.push(db.delete(orderLines).where(and(eq(orderLines.id, line.id), guard)));
    else {
      kept.push({ unitPrice: line.unitPrice, quantity });
      if (quantity !== line.quantity) statements.push(db.update(orderLines).set({ quantity }).where(and(eq(orderLines.id, line.id), guard)));
    }
  }
  for (const [id, quantity] of wanted) {
    if (had.has(id)) continue;
    const row = catalog.get(id)!;
    kept.push({ unitPrice: row.price, quantity });
    // Columns as in order_lines: id, order_id, variant_id, title, size, sku, quantity, unit_price, cost_price.
    statements.push(
      db
        .insert(orderLines)
        .select(sql`SELECT NULL, ${order.id}, ${id}, ${row.title}, ${row.size}, ${row.sku}, ${quantity}, ${row.price}, ${row.costPrice} WHERE ${guard}`),
    );
  }
  for (const id of ids) {
    const more = (wanted.get(id) ?? 0) - (had.get(id) ?? 0);
    if (more !== 0) statements.push(...takeStock(db, id, more, "edit", order.id, guard));
  }

  const subtotal = kept.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const [code] = order.discountCode ? await db.select().from(discounts).where(eq(discounts.code, order.discountCode)) : [];
  const discount = code ? discountOff(code, subtotal).amount : Math.min(order.discountTotal, subtotal);
  const total = subtotal - discount + order.deliveryFee;
  const update = db
    .update(orders)
    .set({ subtotal, discountTotal: discount, total, advance: order.paymentMethod === "cod" ? Math.min(order.advance, total) : 0, updatedAt: new Date() })
    .where(and(eq(orders.id, order.id), inArray(orders.status, [...ITEMS_EDITABLE])))
    .returning({ id: orders.id });

  try {
    const [first, ...rest]: BatchItem<"sqlite">[] = [...statements, update];
    const results = await db.batch([first, ...rest]);
    return (results.at(-1) as { id: number }[]).length > 0 ? { ok: true } : fail(`Order #${number} changed meanwhile. Try again.`);
  } catch (error) {
    if (isStockConflict(error)) return fail("Another order took that stock meanwhile. Try again.");
    throw error;
  }
}

// A size exchange on a delivered order: the new size goes out as its own order, linked to this one,
// for the delivery charge the customer pays. The old jacket goes back in stock when it arrives
// (receiveReturn), not before.
export async function createExchange(
  db: Db,
  number: number,
  input: { lineId: number; variantId: number; charge: number },
): Promise<{ ok: true; number: number } | { ok: false; message: string }> {
  const order = await db.query.orders.findFirst({ where: eq(orders.number, number), with: { lines: true } });
  if (!order) return fail(`There's no order #${number}.`);
  if (order.status !== "delivered") return fail("Only a delivered order can be exchanged.");
  const line = order.lines.find((candidate) => candidate.id === input.lineId);
  if (!line) return fail("Choose the jacket to exchange.");
  if (line.variantId === null) return fail("That jacket isn't in the catalog any more.");
  if (!whole(input.charge)) return fail("The delivery charge is a whole number of rupees.");
  const catalog = await variantsById(db, [line.variantId, input.variantId]);
  const old = catalog.get(line.variantId);
  const next = catalog.get(input.variantId);
  if (!old || !next || next.productId !== old.productId) return fail("Choose another size of the same jacket.");
  if (next.id === old.id) return fail("Choose a different size.");
  if (next.stock < 1) return fail(`${describe(next)} is sold out.`);

  const token = newToken();
  const exchangeId = sql`(SELECT id FROM orders WHERE token = ${token})`;
  const now = new Date();
  const statements: Batch = [
    db.insert(orders).values({
      number: nextNumber,
      token,
      customerId: order.customerId,
      status: "confirmed",
      confirmedAt: now,
      // The rider collects the delivery charge at the door.
      paymentMethod: "cod",
      name: order.name,
      email: order.email,
      phone: order.phone,
      address1: order.address1,
      city: order.city,
      subtotal: 0,
      deliveryFee: input.charge,
      total: input.charge,
      source: "exchange",
      exchangeOf: order.id,
      returnVariantId: old.id,
      note: `Size exchange for #${order.number}: ${old.title}, ${old.size ?? "one size"} for ${next.size ?? "one size"}.`,
    }),
    // The jacket goes out at no charge, and costs nothing: the old one comes back in its place.
    db.insert(orderLines).values({ orderId: exchangeId, variantId: next.id, title: next.title, size: next.size, sku: next.sku, quantity: 1, unitPrice: 0, costPrice: 0 }),
    ...takeStock(db, next.id, 1, "exchange", exchangeId),
  ];
  try {
    await db.batch(statements);
  } catch (error) {
    if (isStockConflict(error)) return fail(`${describe(next)} sold out meanwhile.`);
    throw error;
  }
  const [created] = await db.select({ number: orders.number }).from(orders).where(eq(orders.token, token));
  return { ok: true, number: created.number };
}

// The exchanged jacket is back: it goes into stock, once.
export async function receiveReturn(db: Db, number: number): Promise<Result> {
  const [order] = await db
    .select({ id: orders.id, source: orders.source, returnVariantId: orders.returnVariantId, returnedAt: orders.returnedAt })
    .from(orders)
    .where(eq(orders.number, number));
  if (!order || order.source !== "exchange" || order.returnVariantId === null) return fail("Nothing is coming back on this order.");
  if (order.returnedAt) return fail("It's already back in stock.");
  const open = sql`(SELECT returned_at FROM orders WHERE id = ${order.id}) IS NULL`;
  const [first, ...rest]: BatchItem<"sqlite">[] = [
    ...takeStock(db, order.returnVariantId, -1, "exchange", order.id, open),
    db
      .update(orders)
      .set({ returnedAt: new Date() })
      .where(and(eq(orders.id, order.id), isNull(orders.returnedAt)))
      .returning({ id: orders.id }),
  ];
  const results = await db.batch([first, ...rest]);
  return (results.at(-1) as { id: number }[]).length > 0 ? { ok: true } : fail("It's already back in stock.");
}

export const MANUAL_METHODS = ["cod", "bank_transfer", "in_person"] as const;

export type ManualOrderInput = {
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  items: { variantId: number; quantity: number; unitPrice: number }[];
  discount: number;
  deliveryFee: number;
  paymentMethod: string;
  // Cash on delivery: the advance asked for up front.
  advance: number;
  // Whether the money to confirm it is in: the advance, the transfer, or the cash in hand.
  received: boolean;
  note: string;
};

// An order taken on WhatsApp, Instagram or in person, at whatever price was agreed. It takes stock
// like any other. Money already in confirms it; a sale in person with the cash in hand is
// delivered there and then.
export async function createManualOrder(db: Db, input: ManualOrderInput): Promise<{ ok: true; number: number } | { ok: false; message: string }> {
  const name = input.name.trim();
  if (!name) return fail("Add the customer's name.");
  const phone = normalizePhone(input.phone);
  if (!phone) return fail("Add their mobile number, like 0300 1234567.");
  const email = input.email.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("That email doesn't look right.");
  const method = MANUAL_METHODS.find((candidate) => candidate === input.paymentMethod);
  if (!method) return fail("Choose how they pay.");
  if (input.items.length === 0) return fail("Add at least one item.");
  for (const item of input.items) {
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) return fail("Each quantity is a whole number, up to 20.");
    if (!whole(item.unitPrice)) return fail("Each price is a whole number of rupees.");
  }
  const catalog = await variantsById(db, input.items.map((item) => item.variantId));
  const items = input.items.map((item) => ({ ...item, row: catalog.get(item.variantId) }));
  if (items.some((item) => !item.row)) return fail("That size isn't in the catalog any more.");
  const needed = new Map<number, number>();
  for (const item of items) needed.set(item.variantId, (needed.get(item.variantId) ?? 0) + item.quantity);
  for (const [id, quantity] of needed) {
    const row = catalog.get(id)!;
    if (quantity > row.stock) return fail(row.stock === 0 ? `${describe(row)} is sold out.` : `Only ${row.stock} of ${describe(row)} in stock.`);
  }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (!whole(input.discount) || input.discount > subtotal) return fail("The discount is a whole number of rupees, no more than the items.");
  if (!whole(input.deliveryFee)) return fail("The delivery fee is a whole number of rupees.");
  const total = subtotal - input.discount + input.deliveryFee;
  const cod = method === "cod";
  if (cod && (!whole(input.advance) || input.advance > total)) return fail("The advance is a whole number of rupees, no more than the total.");
  const advance = cod ? input.advance : 0;
  const due = cod ? advance : total;

  const token = newToken();
  const orderId = sql`(SELECT id FROM orders WHERE token = ${token})`;
  const now = new Date();
  const confirmed = input.received || due === 0;
  const handedOver = method === "in_person" && input.received;
  const buyer = await customerFor(db, { name, phone, email, city: input.city.trim() || null, address1: input.address.trim() || null });
  const statements: Batch = [
    buyer.statement,
    db.insert(orders).values({
      number: nextNumber,
      token,
      customerId: buyer.id,
      status: handedOver ? "delivered" : confirmed ? "confirmed" : "pending",
      confirmedAt: confirmed ? now : null,
      deliveredAt: handedOver ? now : null,
      paymentMethod: method,
      name,
      email,
      phone,
      city: input.city.trim() || null,
      address1: input.address.trim() || null,
      subtotal,
      discountTotal: input.discount,
      deliveryFee: input.deliveryFee,
      total,
      advance,
      source: "manual",
      note: input.note.trim().slice(0, 2000) || null,
    }),
    ...items.flatMap((item) => [
      db.insert(orderLines).values({
        orderId,
        variantId: item.variantId,
        title: item.row!.title,
        size: item.row!.size,
        sku: item.row!.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.row!.costPrice,
      }),
      ...takeStock(db, item.variantId, item.quantity, "sale", orderId),
    ]),
    ...(input.received && due > 0
      ? [
          db.insert(payments).values({
            orderId,
            method: method === "in_person" ? "cash" : "bank_transfer",
            amount: due,
            note: cod ? "Advance" : method === "in_person" ? "Paid in person" : "Bank transfer",
            receivedAt: now,
          }),
        ]
      : []),
  ];
  try {
    await db.batch(statements);
  } catch (error) {
    if (isStockConflict(error)) return fail("Another order took that stock meanwhile. Try again.");
    throw error;
  }
  const [created] = await db.select({ number: orders.number }).from(orders).where(eq(orders.token, token));
  return { ok: true, number: created.number };
}

// Every size on the store with its stock, by product, for adding to an order or exchanging.
export async function listSellable(db: Db) {
  const rows = await db
    .select({ productId: products.id, title: products.title, price: products.price, variantId: variants.id, size: variants.size, stock: variants.stock })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(eq(products.status, "active"))
    .orderBy(products.position, products.id, variants.position, variants.id);
  const byProduct = new Map<number, { productId: number; title: string; price: number; sizes: { variantId: number; size: string | null; stock: number }[] }>();
  for (const row of rows) {
    const product = byProduct.get(row.productId) ?? { productId: row.productId, title: row.title, price: row.price, sizes: [] };
    product.sizes.push({ variantId: row.variantId, size: row.size, stock: row.stock });
    byProduct.set(row.productId, product);
  }
  return [...byProduct.values()];
}

export type SellableProduct = Awaited<ReturnType<typeof listSellable>>[number];

// How an order connects to exchanges: the order it replaces, the exchanges sent against it, and
// the size coming back.
export async function exchangeLinks(db: Db, order: { id: number; exchangeOf: number | null; returnVariantId: number | null }) {
  const [replaces, sent, returning] = await Promise.all([
    order.exchangeOf === null ? null : db.select({ number: orders.number }).from(orders).where(eq(orders.id, order.exchangeOf)).then(([row]) => row?.number ?? null),
    db.select({ number: orders.number, status: orders.status }).from(orders).where(eq(orders.exchangeOf, order.id)).orderBy(orders.number),
    order.returnVariantId === null ? null : variantsById(db, [order.returnVariantId]).then((rows) => rows.get(order.returnVariantId!) ?? null),
  ]);
  return { replaces, sent, returning: returning ? { title: returning.title, size: returning.size } : null };
}
