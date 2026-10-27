import "server-only";

import { and, asc, desc, eq, inArray, isNull, like, or, sql, type SQL } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { Db } from "../db";
import { COURIER_STATUSES, orders, payments, stockChanges, variants, type ORDER_STATUSES } from "../db/schema";
import { normalizePhone } from "../phone";

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type CourierStatus = (typeof COURIER_STATUSES)[number];
export type PaymentMethod = "bank_transfer" | "cod" | "cash";
export type Result = { ok: true } | { ok: false; message: string };

// The orders page's tabs, in the order the work happens. "Payout due" is not a status: delivered
// cash on delivery orders whose cash the courier hasn't paid out yet.
export const ORDER_FILTERS = {
  to_confirm: ["pending"],
  to_ship: ["confirmed", "packed"],
  shipped: ["shipped"],
  delivered: ["delivered"],
  closed: ["cancelled", "refused"],
  done: ["delivered", "cancelled", "refused"],
} as const satisfies Record<string, readonly OrderStatus[]>;
export type OrderFilter = keyof typeof ORDER_FILTERS | "payout_due";

// Cash still out: what was received plus what the courier kept falls short of the total. Orders
// settled before payouts were recorded (Shopify's) have no payout date but nothing outstanding.
export const outstanding = sql`${orders.total} > (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payments.order_id = orders.id) + ${orders.codTax}`;
const payoutDue = and(eq(orders.paymentMethod, "cod"), eq(orders.status, "delivered"), isNull(orders.paidOutAt), outstanding);
const filterWhere = (filter: OrderFilter) =>
  filter === "payout_due" ? payoutDue : inArray(orders.status, [...ORDER_FILTERS[filter]]);

const STATE_PHRASES: Record<OrderStatus, string> = {
  pending: "still waiting to be confirmed",
  confirmed: "already confirmed",
  packed: "already packed",
  shipped: "already shipped",
  delivered: "already delivered",
  cancelled: "cancelled",
  refused: "refused at delivery",
};

const ok: Result = { ok: true };
const fail = (message: string): Result => ({ ok: false, message });
const notFound = (number: number) => fail(`There's no order #${number}.`);
const stale = (number: number, status: OrderStatus) => fail(`Order #${number} is ${STATE_PHRASES[status]}.`);

// Correlated subqueries are written out with table names: inside them Drizzle renders the outer
// `orders.id` as a bare "id", which would bind to the inner table's own id.
const paidSum = sql<number>`(SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payments.order_id = orders.id)`;

// Where the money stands: settled (paid, or paid out less the courier's tax), the COD cash still with
// the courier after delivery, the advance in, something in, or nothing.
export function paymentState(order: { paymentMethod: string; status: string; total: number; advance: number; paid: number; codTax: number }) {
  if (order.paid + order.codTax >= order.total) return "paid" as const;
  if (order.paymentMethod === "cod" && order.status === "delivered") return "with_courier" as const;
  if (order.paid === 0) return "unpaid" as const;
  if (order.paymentMethod === "cod" && order.paid >= order.advance) return "advance" as const;
  return "part" as const;
}

// Search takes an order number (1022 or #1022), a phone number however it's typed, or part of a name.
function matching(query: string): SQL | undefined {
  const text = query.trim();
  if (!text) return undefined;
  const conditions: SQL[] = [like(orders.name, `%${text}%`)];
  const number = text.replace(/^#/, "");
  if (/^\d{1,6}$/.test(number)) conditions.push(eq(orders.number, Number(number)));
  const phone = normalizePhone(text);
  if (phone) conditions.push(eq(orders.phone, phone));
  return or(...conditions);
}

// The orders a tab and a search pick out, for anything that lists them (the CSV export too).
export const orderWhere = (filter: OrderFilter | undefined, query: string) => and(filter ? filterWhere(filter) : undefined, matching(query));

// Newest first, except a work queue, which takes the longest-waiting order first.
export async function listOrders(
  db: Db,
  {
    filter,
    query = "",
    oldestFirst = false,
    limit = 200,
    offset = 0,
  }: { filter?: OrderFilter; query?: string; oldestFirst?: boolean; limit?: number; offset?: number },
) {
  const where = and(filter ? filterWhere(filter) : undefined, matching(query));
  return db
    .select({
      number: orders.number,
      createdAt: orders.createdAt,
      name: orders.name,
      city: orders.city,
      status: orders.status,
      courierStatus: orders.courierStatus,
      paymentMethod: orders.paymentMethod,
      total: orders.total,
      advance: orders.advance,
      codTax: orders.codTax,
      paid: paidSum,
      receipts: sql<number>`(SELECT COUNT(*) FROM receipts WHERE receipts.order_id = orders.id)`,
      items: sql<number>`(SELECT COALESCE(SUM(quantity), 0) FROM order_lines WHERE order_lines.order_id = orders.id)`,
    })
    .from(orders)
    .where(where)
    .orderBy(oldestFirst ? asc(orders.number) : desc(orders.number))
    .limit(limit)
    .offset(offset);
}

// How many orders a search or tab holds, for paging.
export async function countOrders(db: Db, { filter, query = "" }: { filter?: OrderFilter; query?: string }) {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(filter ? filterWhere(filter) : undefined, matching(query)));
  return row.count;
}

export async function orderCounts(db: Db) {
  const rows = await db.select({ status: orders.status, count: sql<number>`COUNT(*)` }).from(orders).groupBy(orders.status);
  const countOf = (statuses: readonly OrderStatus[]) =>
    rows.filter((row) => statuses.includes(row.status)).reduce((sum, row) => sum + row.count, 0);
  const [due] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(payoutDue);
  return {
    ...(Object.fromEntries(Object.entries(ORDER_FILTERS).map(([filter, statuses]) => [filter, countOf(statuses)])) as Record<
      keyof typeof ORDER_FILTERS,
      number
    >),
    payout_due: due.count,
    all: rows.reduce((sum, row) => sum + row.count, 0),
  };
}

// Everything the order page shows: lines with each jacket's first photo, the payment ledger,
// receipts, and what has been paid so far.
export async function getAdminOrder(db: Db, number: number) {
  if (!Number.isSafeInteger(number)) return null;
  const order = await db.query.orders.findFirst({
    where: eq(orders.number, number),
    with: {
      lines: {
        orderBy: (lines, { asc }) => asc(lines.id),
        with: {
          variant: {
            columns: { stock: true, productId: true },
            with: {
              product: {
                columns: { handle: true },
                with: { images: { columns: { src: true, width: true, height: true }, orderBy: (images, { asc }) => asc(images.position), limit: 1 } },
              },
            },
          },
        },
      },
      payments: { orderBy: (rows, { asc }) => [asc(rows.receivedAt), asc(rows.id)] },
      receipts: { columns: { id: true, contentType: true, createdAt: true }, orderBy: (rows, { asc }) => asc(rows.id) },
    },
  });
  if (!order) return null;
  const { lines, ...rest } = order;
  return {
    ...rest,
    paid: order.payments.reduce((sum, payment) => sum + payment.amount, 0),
    lines: lines.map(({ variant, ...line }) => ({
      ...line,
      handle: variant?.product.handle ?? null,
      productId: variant?.productId ?? null,
      image: variant?.product.images[0] ?? null,
    })),
  };
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;

async function readState(db: Db, number: number) {
  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      total: orders.total,
      advance: orders.advance,
      paidOutAt: orders.paidOutAt,
      codTax: orders.codTax,
      paid: paidSum,
    })
    .from(orders)
    .where(eq(orders.number, number));
  return order ?? null;
}
type OrderState = NonNullable<Awaited<ReturnType<typeof readState>>>;

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

// A statement that only acts while the order is still in one of `from`. Each status change runs
// in one D1 batch (a transaction) with its stock and payment statements guarded by this, so a
// second press, or two tabs, can never put stock back or record a payment twice.
export const statusIn = (id: number, from: readonly OrderStatus[]) =>
  sql`(SELECT status FROM orders WHERE id = ${id}) IN (${sql.join(
    from.map((status) => sql`${status}`),
    sql`, `,
  )})`;

// Both are query builders, not db.run(): Drizzle 0.45 can't batch a raw statement with parameters.
function restock(db: Db, id: number, from: readonly OrderStatus[]) {
  return db
    .update(variants)
    .set({ stock: sql`stock + (SELECT SUM(quantity) FROM order_lines WHERE order_id = ${id} AND variant_id = variants.id)` })
    .where(sql`variants.id IN (SELECT variant_id FROM order_lines WHERE order_id = ${id}) AND ${statusIn(id, from)}`);
}

// The pieces back in stock, one history line per order line, after the restock above and under the
// same guard. Columns as in stock_changes: id, variant_id, change, stock_after, reason, order_id,
// note, created_at.
function logReturn(db: Db, id: number, from: readonly OrderStatus[], reason: "cancelled" | "refused") {
  return db.insert(stockChanges).select(sql`
    SELECT NULL, variant_id, quantity, (SELECT stock FROM variants WHERE variants.id = order_lines.variant_id), ${reason}, order_id, NULL, unixepoch()
    FROM order_lines WHERE order_id = ${id} AND variant_id IS NOT NULL AND ${statusIn(id, from)}`);
}

// A raw SELECT must give every payments column, in the table's order: id, order_id, method,
// amount, reference, note, received_at, created_at.
function receive(db: Db, id: number, from: readonly OrderStatus[], method: PaymentMethod, amount: number, note: string, at: Date) {
  return db
    .insert(payments)
    .select(sql`SELECT NULL, ${id}, ${method}, ${amount}, NULL, ${note}, ${seconds(at)}, unixepoch() WHERE ${statusIn(id, from)}`);
}

async function move(
  db: Db,
  number: number,
  from: readonly OrderStatus[],
  set: Partial<typeof orders.$inferInsert>,
  extra: (order: OrderState) => BatchItem<"sqlite">[] = () => [],
): Promise<Result> {
  const order = await readState(db, number);
  if (!order) return notFound(number);
  if (!from.includes(order.status)) return stale(number, order.status);
  const update = db
    .update(orders)
    .set(set)
    .where(and(eq(orders.id, order.id), inArray(orders.status, [...from])))
    .returning({ id: orders.id });
  // The guarded statements run before the status changes, while their guard still holds.
  const [first, ...rest]: BatchItem<"sqlite">[] = [...extra(order), update];
  const results = await db.batch([first, ...rest]);
  const moved = results.at(-1) as { id: number }[];
  if (moved.length > 0) return ok;
  const now = await readState(db, number);
  return stale(number, now?.status ?? order.status);
}

// Confirming says the money to confirm it is in: the advance for cash on delivery, the whole
// transfer otherwise. Whatever is still short of that is recorded as received by bank transfer.
export function confirmOrder(db: Db, number: number) {
  const now = new Date();
  return move(db, number, ["pending"], { status: "confirmed", confirmedAt: now }, (order) => {
    const target = order.paymentMethod === "cod" ? order.advance : order.paymentMethod === "bank_transfer" ? order.total : 0;
    const owed = target - order.paid;
    const note = order.paymentMethod === "cod" ? "Advance" : "Bank transfer";
    return owed > 0 ? [receive(db, order.id, ["pending"], "bank_transfer", owed, note, now)] : [];
  });
}

export function markPacked(db: Db, number: number) {
  return move(db, number, ["confirmed"], { status: "packed", packedAt: new Date() });
}

export function markShipped(db: Db, number: number, input: { trackingNumber: string; courierFee: number | null }) {
  const trackingNumber = input.trackingNumber.trim();
  if (!trackingNumber || trackingNumber.length > 60) return Promise.resolve(fail("Add the tracking number."));
  if (input.courierFee !== null && !(Number.isSafeInteger(input.courierFee) && input.courierFee >= 0)) {
    return Promise.resolve(fail("The courier fee is a whole number of rupees."));
  }
  const now = new Date();
  return move(db, number, ["confirmed", "packed"], {
    status: "shipped",
    shippedAt: now,
    trackingNumber,
    courierFee: input.courierFee,
    courierStatus: "booked",
    courierStatusAt: now,
  });
}

// Where the parcel is, from the courier's tracking: in transit, out for delivery, a failed attempt,
// or on its way back. The customer's order page and tracking page show it.
export async function setCourierStatus(db: Db, number: number, status: string): Promise<Result> {
  const courierStatus = COURIER_STATUSES.find((candidate) => candidate === status);
  if (!courierStatus) return fail("Choose where the parcel is.");
  const order = await readState(db, number);
  if (!order) return notFound(number);
  if (order.status !== "shipped") return fail(`Order #${number} isn't with the courier.`);
  await db
    .update(orders)
    .set({ courierStatus, courierStatusAt: new Date() })
    .where(and(eq(orders.id, order.id), eq(orders.status, "shipped")));
  return ok;
}

// For cash on delivery, the rider collected the rest at the door: it is with the courier now, and
// counts as received once the courier pays it out (recordPayout).
export function markDelivered(db: Db, number: number) {
  return move(db, number, ["shipped"], { status: "delivered", deliveredAt: new Date() });
}

// The courier pays a delivered COD order's cash out, less 4% of it as tax (and now and then other
// deductions). What it kept is recorded as the order's codTax, so the order reads as settled.
export async function recordPayout(db: Db, number: number, amount: number): Promise<Result> {
  const order = await readState(db, number);
  if (!order) return notFound(number);
  if (order.paymentMethod !== "cod") return fail("Only cash on delivery orders have a courier payout.");
  if (order.paidOutAt) return fail(`Order #${number}'s payout is already recorded.`);
  if (order.status !== "delivered") return fail(`Order #${number} isn't delivered yet.`);
  const due = order.total - order.paid;
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > due) {
    return fail(`The payout is a whole number of rupees, no more than the ${due.toLocaleString("en-PK")} collected.`);
  }
  const now = new Date();
  const open = sql`(SELECT status FROM orders WHERE id = ${order.id}) = 'delivered' AND (SELECT paid_out_at FROM orders WHERE id = ${order.id}) IS NULL`;
  const results = await db.batch([
    db
      .insert(payments)
      .select(sql`SELECT NULL, ${order.id}, 'cod', ${amount}, NULL, 'Courier payout', ${seconds(now)}, unixepoch() WHERE ${open}`),
    db
      .update(orders)
      .set({ codTax: due - amount, paidOutAt: now })
      .where(and(eq(orders.id, order.id), eq(orders.status, "delivered"), isNull(orders.paidOutAt)))
      .returning({ id: orders.id }),
  ]);
  return (results[1] as { id: number }[]).length > 0 ? ok : fail(`Order #${number}'s payout is already recorded.`);
}

type ProfitOrder = {
  status: string;
  paymentMethod: string;
  total: number;
  advance: number;
  courierFee: number | null;
  codTax: number;
  paidOutAt: Date | null;
  // What's been received; when it settles the order without a payout (Shopify's orders), no tax is estimated.
  paid?: number;
  lines: { costPrice: number | null; quantity: number }[];
};

// What an order earned: its total, less what the jackets cost, the courier's upfront charge and
// the tax kept from COD cash. Until a COD payout is in, the tax is estimated from the COD amount;
// an order settled by hand before payouts existed has no tax on record. `costMissing` says a
// jacket's cost isn't set (it counts as nothing); `complete` says whether every figure is known.
// A refused parcel costs its courier charge.
export function orderProfit(order: ProfitOrder, codTaxPercent = 4) {
  const courier = order.courierFee ?? 0;
  if (order.status === "cancelled") return { revenue: 0, cost: 0, courier: 0, tax: 0, profit: 0, costMissing: false, complete: true };
  if (order.status === "refused") {
    return { revenue: 0, cost: 0, courier, tax: 0, profit: -courier, costMissing: false, complete: order.courierFee !== null };
  }
  const cod = order.paymentMethod === "cod";
  const cost = order.lines.reduce((sum, line) => sum + (line.costPrice ?? 0) * line.quantity, 0);
  const settled = order.paidOutAt !== null || (order.paid ?? 0) + order.codTax >= order.total;
  const tax = !cod ? 0 : settled ? order.codTax : Math.round(((order.total - order.advance) * codTaxPercent) / 100);
  const costMissing = order.lines.some((line) => line.costPrice === null);
  const complete = !costMissing && order.courierFee !== null && (!cod || order.paidOutAt !== null);
  return { revenue: order.total, cost, courier, tax, profit: order.total - cost - courier - tax, costMissing, complete };
}

// Turned away at the door: the parcel comes back, so its units go back into stock.
export function markRefused(db: Db, number: number) {
  return move(db, number, ["shipped"], { status: "refused", refusedAt: new Date() }, (order) => [
    restock(db, order.id, ["shipped"]),
    logReturn(db, order.id, ["shipped"], "refused"),
  ]);
}

const CANCELLABLE = ["pending", "confirmed", "packed"] as const;

export function cancelOrder(db: Db, number: number) {
  return move(db, number, CANCELLABLE, { status: "cancelled", cancelledAt: new Date() }, (order) => [
    restock(db, order.id, CANCELLABLE),
    logReturn(db, order.id, CANCELLABLE, "cancelled"),
  ]);
}

// The COD advance can change at any step until the courier pays out: a bargain, a part payment, a
// correction. If the advance was already recorded as received, that payment changes with it (or
// goes, when the advance is set to nothing).
const ADVANCE_EDITABLE = ["pending", "confirmed", "packed", "shipped", "delivered"] as const;

export async function setAdvance(db: Db, number: number, advance: number): Promise<Result> {
  const order = await readState(db, number);
  if (!order) return notFound(number);
  if (order.paymentMethod !== "cod") return fail("Only cash on delivery orders have an advance.");
  if (order.paidOutAt) return fail(`Order #${number}'s payout is recorded, so its advance is settled.`);
  if (!ADVANCE_EDITABLE.some((status) => status === order.status)) return stale(number, order.status);
  if (!Number.isSafeInteger(advance) || advance < 0 || advance > order.total) {
    return fail("The advance is a whole number of rupees, no more than the order total.");
  }
  const [recorded] = await db
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.orderId, order.id), eq(payments.note, "Advance")))
    .limit(1);
  const stillOpen = sql`(SELECT paid_out_at FROM orders WHERE id = ${order.id}) IS NULL`;
  const update = db
    .update(orders)
    .set({ advance })
    .where(and(eq(orders.id, order.id), inArray(orders.status, [...ADVANCE_EDITABLE]), isNull(orders.paidOutAt)))
    .returning({ id: orders.id });
  const payment = !recorded
    ? []
    : advance > 0
      ? [db.update(payments).set({ amount: advance }).where(and(eq(payments.id, recorded.id), stillOpen))]
      : [db.delete(payments).where(and(eq(payments.id, recorded.id), stillOpen))];
  const results = await db.batch([update, ...payment]);
  return (results[0] as { id: number }[]).length > 0 ? ok : fail(`Order #${number} changed meanwhile. Try again.`);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Corrects who the order goes to. The phone is stored the usual way (+92...), whatever was typed.
export async function editContact(
  db: Db,
  number: number,
  input: { name: string; phone: string; email: string; address1: string; city: string },
): Promise<Result> {
  const name = input.name.trim();
  if (!name) return fail("Add the customer's name.");
  const phone = normalizePhone(input.phone);
  if (!phone) return fail("That phone number doesn't look right. Use a Pakistani mobile, like 0300 1234567.");
  const email = input.email.trim().toLowerCase();
  if (email && !EMAIL.test(email)) return fail("That email doesn't look right.");
  const updated = await db
    .update(orders)
    .set({ name, phone, email: email || null, address1: input.address1.trim() || null, city: input.city.trim() || null })
    .where(eq(orders.number, number))
    .returning({ id: orders.id });
  return updated.length > 0 ? ok : notFound(number);
}

// Corrects the tracking number or the courier's charge once the parcel has gone.
export async function editShipping(db: Db, number: number, input: { trackingNumber: string; courierFee: number | null }): Promise<Result> {
  const trackingNumber = input.trackingNumber.trim();
  if (!trackingNumber || trackingNumber.length > 60) return fail("Add the tracking number.");
  if (input.courierFee !== null && !(Number.isSafeInteger(input.courierFee) && input.courierFee >= 0)) {
    return fail("The courier charge is a whole number of rupees.");
  }
  const order = await readState(db, number);
  if (!order) return notFound(number);
  if (!["shipped", "delivered", "refused"].includes(order.status)) return fail(`Order #${number} hasn't shipped yet.`);
  await db.update(orders).set({ trackingNumber, courierFee: input.courierFee }).where(eq(orders.id, order.id));
  return ok;
}

const METHODS: readonly PaymentMethod[] = ["bank_transfer", "cod", "cash"];

export async function recordPayment(
  db: Db,
  number: number,
  input: { method: string; amount: number; reference: string; receivedAt: Date },
): Promise<Result> {
  const method = METHODS.find((candidate) => candidate === input.method);
  if (!method) return fail("Choose how it was paid.");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 10_000_000) {
    return fail("The amount is a whole number of rupees.");
  }
  if (Number.isNaN(input.receivedAt.getTime())) return fail("Add the date it was received.");
  const order = await readState(db, number);
  if (!order) return notFound(number);
  await db.insert(payments).values({
    orderId: order.id,
    method,
    amount: input.amount,
    reference: input.reference.trim().slice(0, 80) || null,
    receivedAt: input.receivedAt,
  });
  return ok;
}

async function readPayment(db: Db, id: number) {
  if (!Number.isSafeInteger(id)) return null;
  const [payment] = await db
    .select({ id: payments.id, orderId: payments.orderId, amount: payments.amount, note: payments.note, codTax: orders.codTax })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(eq(payments.id, id));
  return payment ?? null;
}

// Corrects a recorded payment. Changing the courier's payout moves the difference into or out of
// what the courier kept as tax.
export async function updatePayment(
  db: Db,
  id: number,
  input: { method: string; amount: number; reference: string; receivedAt: Date },
): Promise<Result> {
  const method = METHODS.find((candidate) => candidate === input.method);
  if (!method) return fail("Choose how it was paid.");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 10_000_000) {
    return fail("The amount is a whole number of rupees.");
  }
  if (Number.isNaN(input.receivedAt.getTime())) return fail("Add the date it was received.");
  const payment = await readPayment(db, id);
  if (!payment) return fail("That payment isn't there any more.");
  const values = { method, amount: input.amount, reference: input.reference.trim().slice(0, 80) || null, receivedAt: input.receivedAt };
  if (payment.note !== "Courier payout") {
    await db.update(payments).set(values).where(eq(payments.id, id));
    return ok;
  }
  const codTax = payment.codTax + payment.amount - input.amount;
  if (codTax < 0) return fail("That's more than the rider collected.");
  await db.batch([
    db.update(payments).set(values).where(eq(payments.id, id)),
    db.update(orders).set({ codTax }).where(eq(orders.id, payment.orderId)),
  ]);
  return ok;
}

// Removes a payment recorded by mistake. Removing the courier's payout puts the cash back with the
// courier: its tax and payout date go too.
export async function deletePayment(db: Db, id: number): Promise<Result> {
  const payment = await readPayment(db, id);
  if (!payment) return fail("That payment isn't there any more.");
  const remove = db.delete(payments).where(eq(payments.id, id));
  if (payment.note === "Courier payout") {
    await db.batch([remove, db.update(orders).set({ codTax: 0, paidOutAt: null }).where(eq(orders.id, payment.orderId))]);
  } else {
    await remove;
  }
  return ok;
}

export async function saveNote(db: Db, number: number, note: string): Promise<Result> {
  const text = note.trim();
  if (text.length > 2000) return fail("Keep the note under 2,000 characters.");
  const updated = await db
    .update(orders)
    .set({ note: text || null })
    .where(eq(orders.number, number))
    .returning({ id: orders.id });
  return updated.length > 0 ? ok : notFound(number);
}
