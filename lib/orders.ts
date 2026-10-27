import "server-only";

import { and, asc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { CartLine } from "./cart-codec";
import type { CheckoutValues } from "./checkout";
import type { Db } from "./db";
import { customers, orderLines, orders, products, stockChanges, variants } from "./db/schema";
import { checkDiscount } from "./discounts";
import { bankTransferSummary, codSummary } from "./payment";
import { normalizePhone } from "./phone";
import { getCodTerms } from "./settings";

export type PlaceOrderResult =
  | { ok: true; token: string; number: number; soldOut: boolean }
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "discount"; message: string }
  | { ok: false; reason: "sold_out"; items: string[] };

// Shopify's last order was #1021.
const FIRST_NUMBER = 1022;
// The next order number, worked out inside the insert so two orders can't take the same one.
export const nextNumber = sql`(SELECT COALESCE(MAX(number), ${FIRST_NUMBER - 1}) + 1 FROM orders)`;

// 18 random bytes, written URL-safe: the secret in the customer's order link.
export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_");
}

export const describe = (item: { title: string; size: string | null }) =>
  item.size ? `${item.title}, size ${item.size}` : item.title;

export function isStockConflict(error: unknown) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (current.message.includes("variants_stock_check")) return true;
  }
  return false;
}

// The customer an order belongs to. A returning customer is found by email, or else by phone,
// since many change email but keep their number; their record takes the latest contact details.
// Anyone new gets a record. Returns the statement to run with the order, and the customer's id
// (or the SQL that finds it once that statement has run).
export async function customerFor(db: Db, contact: { name: string; phone: string; email: string | null; city: string | null; address1: string | null }) {
  const { email, ...rest } = contact;
  const [known] = await db
    .select({ id: customers.id, email: customers.email })
    .from(customers)
    .where(email ? or(eq(customers.email, email), eq(customers.phone, contact.phone)) : eq(customers.phone, contact.phone))
    .orderBy(email ? sql`${customers.email} = ${email} DESC` : sql`1`, asc(customers.id))
    .limit(1);
  if (known) {
    return {
      statement: db
        .update(customers)
        .set({ ...rest, email: known.email ?? email, updatedAt: new Date() })
        .where(eq(customers.id, known.id)),
      id: known.id as number | SQL,
    };
  }
  // Someone new. The record is made inside the order's batch, and only if no one with this phone
  // or email exists by then: two orders from one number at once would otherwise make two. The order
  // joins whichever record there is. Columns as in customers: id, name, email, phone,
  // accepts_marketing, address1, address2, city, province, postal_code, country, tags, note,
  // shopify_id, created_at, updated_at.
  const same = email ? sql`email = ${email} OR phone = ${contact.phone}` : sql`phone = ${contact.phone}`;
  return {
    statement: db
      .insert(customers)
      .select(
        sql`SELECT NULL, ${contact.name}, ${email}, ${contact.phone}, 0, ${contact.address1}, NULL, ${contact.city}, NULL, NULL, 'PK', '[]', NULL, NULL, unixepoch(), unixepoch()
            WHERE NOT EXISTS (SELECT 1 FROM customers WHERE ${same})`,
      ),
    id: sql`(SELECT id FROM customers WHERE ${same} ORDER BY ${email ? sql`email = ${email} DESC, ` : sql``}id LIMIT 1)` as number | SQL,
  };
}

// Places an order from the cart: prices and stock come from the database, never the browser.
// Everything is written in one batch, which D1 runs as a transaction. Each line takes its units with
// `stock = stock - quantity`, and the stock check constraint fails the whole batch when another
// order took the last unit first, so nothing is ever oversold or half written.
export async function placeOrder(
  db: Db,
  { customer, lines, discountCode }: { customer: CheckoutValues; lines: CartLine[]; discountCode?: string | null },
): Promise<PlaceOrderResult> {
  const ids = lines.map((line) => Number(line.variantId)).filter(Number.isSafeInteger);
  if (ids.length === 0) return { ok: false, reason: "empty" };

  const rows = await db
    .select({
      id: variants.id,
      sku: variants.sku,
      size: variants.size,
      stock: variants.stock,
      costPrice: variants.costPrice,
      title: products.title,
      price: products.price,
    })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(and(inArray(variants.id, ids), eq(products.status, "active")));

  const items = lines.flatMap((line) => {
    const row = rows.find((candidate) => String(candidate.id) === line.variantId);
    return row ? [{ ...row, quantity: line.quantity }] : [];
  });
  if (items.length === 0) return { ok: false, reason: "empty" };

  const short = items.filter((item) => item.quantity > item.stock);
  if (short.length > 0) return { ok: false, reason: "sold_out", items: short.map(describe) };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  // A discount code is checked again here, against the real subtotal and the customer's phone.
  let discount = { code: null as string | null, amount: 0, freeDelivery: false };
  if (discountCode?.trim()) {
    const check = await checkDiscount(db, discountCode, { subtotal, phone: customer.phone });
    if (!check.ok) return { ok: false, reason: "discount", message: check.message };
    discount = { code: check.code, amount: check.amount, freeDelivery: check.freeDelivery };
  }
  const terms = await getCodTerms(db);
  const summary =
    customer.payment === "cod"
      ? codSummary(subtotal, { discount: discount.amount, advance: terms.codAdvance, deliveryFee: discount.freeDelivery ? 0 : terms.codDeliveryFee })
      : { ...bankTransferSummary(subtotal, discount.amount), advance: 0 };
  const token = newToken();
  const contact = { name: customer.name, phone: customer.phone, city: customer.city, address1: customer.address };
  const orderId = sql`(SELECT id FROM orders WHERE token = ${token})`;

  const buyer = await customerFor(db, { ...contact, email: customer.email });

  const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
    buyer.statement,
    db.insert(orders).values({
      number: nextNumber,
      token,
      customerId: buyer.id,
      paymentMethod: customer.payment,
      ...contact,
      email: customer.email,
      subtotal,
      discountCode: discount.code,
      discountTotal: summary.discount,
      deliveryFee: summary.deliveryFee,
      total: summary.total,
      advance: summary.advance,
    }),
    ...items.flatMap((item) => [
      db
        .update(variants)
        .set({ stock: sql`${variants.stock} - ${item.quantity}` })
        .where(eq(variants.id, item.id)),
      db.insert(orderLines).values({
        orderId,
        variantId: item.id,
        title: item.title,
        size: item.size,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        costPrice: item.costPrice,
      }),
      // The sale in the size's stock history (lib/admin/stock.ts reads it).
      db
        .insert(stockChanges)
        .select(
          sql`SELECT NULL, ${item.id}, ${-item.quantity}, (SELECT stock FROM variants WHERE id = ${item.id}), 'sale', ${orderId}, NULL, unixepoch()`,
        ),
    ]),
  ];

  try {
    await db.batch(statements);
  } catch (error) {
    if (!isStockConflict(error)) throw error;
    const now = await db.select({ id: variants.id, stock: variants.stock }).from(variants).where(inArray(variants.id, ids));
    const gone = items.filter((item) => item.quantity > (now.find((row) => row.id === item.id)?.stock ?? 0));
    return { ok: false, reason: "sold_out", items: gone.map(describe) };
  }

  const [placed, remaining] = await Promise.all([
    db.select({ number: orders.number }).from(orders).where(eq(orders.token, token)),
    db.select({ stock: variants.stock }).from(variants).where(inArray(variants.id, ids)),
  ]);
  return { ok: true, token, number: placed[0].number, soldOut: remaining.some((row) => row.stock === 0) };
}

const TOKEN = /^[A-Za-z0-9_-]{20,40}$/;

// The order behind a customer's order link, with what the order page shows: its lines (and each
// jacket's first photo), and the receipts already uploaded. Null for any link that isn't an order's.
export async function getOrderByToken(db: Db, token: string) {
  if (!TOKEN.test(token)) return null;
  const order = await db.query.orders.findFirst({
    where: eq(orders.token, token),
    with: {
      lines: {
        orderBy: (lines, { asc }) => asc(lines.id),
        with: {
          variant: {
            columns: {},
            with: {
              product: {
                columns: { handle: true },
                with: { images: { columns: { src: true, width: true, height: true }, orderBy: (images, { asc }) => asc(images.position), limit: 1 } },
              },
            },
          },
        },
      },
      receipts: { columns: { id: true, createdAt: true } },
    },
  });
  if (!order) return null;

  const { lines, ...rest } = order;
  return {
    ...rest,
    lines: lines.map(({ variant, ...line }) => ({
      ...line,
      handle: variant?.product.handle ?? null,
      image: variant?.product.images[0] ?? null,
    })),
  };
}

export type OrderView = NonNullable<Awaited<ReturnType<typeof getOrderByToken>>>;

// What the tracking page shows for an order number and the phone it was placed with: where it is,
// and what's in it. No address, payment details or order link: the pair is easier to guess than
// the link's token.
export async function trackOrder(db: Db, number: number, phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized || !Number.isSafeInteger(number)) return null;
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.number, number), eq(orders.phone, normalized)),
    columns: {
      number: true,
      status: true,
      courierStatus: true,
      trackingNumber: true,
      city: true,
      createdAt: true,
      confirmedAt: true,
      packedAt: true,
      shippedAt: true,
      deliveredAt: true,
    },
    with: { lines: { columns: { title: true, size: true, quantity: true }, orderBy: (lines, { asc }) => asc(lines.id) } },
  });
  return order ?? null;
}

export type TrackedOrder = NonNullable<Awaited<ReturnType<typeof trackOrder>>>;
