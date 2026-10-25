import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";

import type { CartLine } from "./cart-codec";
import type { CheckoutValues } from "./checkout";
import type { Db } from "./db";
import { customers, orderLines, orders, products, variants } from "./db/schema";
import { bankTransferSummary, codSummary } from "./payment";

export type PlaceOrderResult =
  | { ok: true; token: string; number: number; soldOut: boolean }
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "sold_out"; items: string[] };

// Shopify's last order was #1021.
const FIRST_NUMBER = 1022;

// 18 random bytes, written URL-safe: the secret in the customer's order link.
function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_");
}

const describe = (item: { title: string; size: string | null }) =>
  item.size ? `${item.title}, size ${item.size}` : item.title;

function isStockConflict(error: unknown) {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (current.message.includes("variants_stock_check")) return true;
  }
  return false;
}

// Places an order from the cart: prices and stock come from the database, never the browser.
// Everything is written in one batch, which D1 runs as a transaction. Each line takes its units with
// `stock = stock - quantity`, and the stock check constraint fails the whole batch when another
// order took the last unit first, so nothing is ever oversold or half written.
export async function placeOrder(
  db: Db,
  { customer, lines }: { customer: CheckoutValues; lines: CartLine[] },
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
  const summary = customer.payment === "cod" ? codSummary(subtotal) : { ...bankTransferSummary(subtotal), advance: 0 };
  const token = newToken();
  const contact = { name: customer.name, phone: customer.phone, city: customer.city, address1: customer.address };
  const orderId = sql`(SELECT id FROM orders WHERE token = ${token})`;

  const statements: [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]] = [
    db
      .insert(customers)
      .values({ ...contact, email: customer.email })
      .onConflictDoUpdate({ target: customers.email, set: { ...contact, updatedAt: new Date() } }),
    db.insert(orders).values({
      number: sql`(SELECT COALESCE(MAX(number), ${FIRST_NUMBER - 1}) + 1 FROM orders)`,
      token,
      customerId: sql`(SELECT id FROM customers WHERE email = ${customer.email})`,
      paymentMethod: customer.payment,
      ...contact,
      email: customer.email,
      subtotal,
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
