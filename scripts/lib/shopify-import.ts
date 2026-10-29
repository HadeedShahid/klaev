import { parse } from "csv-parse/sync";

import { normalizePhone } from "../../lib/phone";

import { insert, literal, raw } from "./sql";

// Turns Shopify's product, customer and order CSV exports into SQL for D1: cost prices and stock
// counts onto the seeded variants, then customers, orders, order lines and the payments already received.
// Running it again replaces everything it brought in (rows with a shopify_id) and nothing else.

type Row = Record<string, string | undefined>;

export type ShopifyExports = { products: string; customers: string; orders: string };

export type ImportReport = {
  costPrices: number;
  stockCounts: number;
  customers: number;
  skippedCustomers: number;
  orders: number;
  lastOrderNumber: number | null;
  warnings: string[];
};

// Test sign-ups, spam bots, and misspelled mail domains that could never receive an email.
const JUNK_DOMAINS = ["admin.com", "inscrlab.com", "nespf.com", "ilovemyemail.net", "gmai.com", "gmil.com", "gamil.com"];

const readCsv = (text: string): Row[] => parse(text, { columns: true, skip_empty_lines: true, bom: true });

// Shopify prefixes ids, phones and postcodes with a quote so spreadsheets keep them as text.
const clean = (value: string | undefined) => value?.trim().replace(/^'/, "") || null;
const lower = (value: string | undefined) => clean(value)?.toLowerCase() ?? null;
const rupees = (value: string | undefined) => Math.round(Number(clean(value) ?? 0));
const firstPhone = (...values: (string | undefined)[]) =>
  values.map((value) => normalizePhone(value ?? "")).find((phone) => phone !== null) ?? null;

// "2026-10-22 21:47:49 +0500"
function shopifyDate(value: string | undefined): Date | null {
  const match = clean(value)?.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/);
  return match ? new Date(`${match[1]}T${match[2]}${match[3]}:${match[4]}`) : null;
}

// "Black Cropped Sheepskin Leather Jacket - L / Black" → the product title and the size.
function lineName(name: string): { title: string; size: string | null } {
  const split = name.lastIndexOf(" - ");
  if (split === -1) return { title: name, size: null };
  return { title: name.slice(0, split), size: name.slice(split + 3).split(" / ")[0] || null };
}

// Lines are matched to variants by SKU, or by product title and size where Shopify lost the SKU.
function variantLookup(sku: string | null, title: string, size: string | null): string {
  if (sku) return `(SELECT id FROM variants WHERE sku = ${literal(sku)})`;
  return (
    `(SELECT v.id FROM variants v JOIN products p ON p.id = v.product_id ` +
    `WHERE p.title = ${literal(title)} AND v.size ${size === null ? "IS NULL" : `= ${literal(size)}`})`
  );
}

// A product export row's variant, as a WHERE clause on variants: by SKU, or where Shopify lost the
// SKU, by the product's handle and its size. Shopify writes sizes in either case, and "Default
// Title" for a product without sizes.
function productRowVariant(row: Row): string | null {
  const sku = clean(row["Variant SKU"]);
  if (sku) return `sku = ${literal(sku)}`;
  const handle = clean(row.Handle);
  const option = clean(row["Option1 Value"]);
  if (!handle || !option) return null;
  const size = option === "Default Title" ? "v.size IS NULL" : `UPPER(v.size) = ${literal(option.toUpperCase())}`;
  return `id = (SELECT v.id FROM variants v JOIN products p ON p.id = v.product_id WHERE p.handle = ${literal(handle)} AND ${size})`;
}

type Customer = { row: Row; shopifyId: string; email: string | null; phones: (string | null)[] };

export function shopifyImport(exports: ShopifyExports): { statements: string[]; report: ImportReport } {
  const warnings: string[] = [];
  const statements = ["DELETE FROM orders WHERE shopify_id IS NOT NULL", "DELETE FROM customers WHERE shopify_id IS NOT NULL"];

  let costPrices = 0;
  let stockCounts = 0;
  for (const row of readCsv(exports.products)) {
    const cost = clean(row["Cost per item"]);
    const count = clean(row["Variant Inventory Qty"]);
    if (!cost && !count) continue;
    const variant = productRowVariant(row);
    if (!variant) {
      warnings.push(`A cost price or stock count on ${row.Handle} has no SKU or size, so it was skipped.`);
      continue;
    }
    if (cost) {
      statements.push(`UPDATE variants SET cost_price = ${rupees(cost)} WHERE ${variant}`);
      costPrices += 1;
    }
    // Stock as Shopify counts it at export. Shopify goes below zero when it oversells; here that's none
    // to sell (variants_stock_check keeps stock at zero or more).
    if (count && /^-?\d+$/.test(count)) {
      statements.push(`UPDATE variants SET stock = ${Math.max(0, Number(count))} WHERE ${variant}`);
      stockCounts += 1;
    }
  }

  const customers: Customer[] = [];
  let skippedCustomers = 0;
  for (const row of readCsv(exports.customers)) {
    const email = lower(row.Email);
    if (email && JUNK_DOMAINS.includes(email.split("@")[1])) {
      skippedCustomers += 1;
      continue;
    }
    customers.push({
      row,
      shopifyId: clean(row["Customer ID"]) ?? "",
      email,
      phones: [normalizePhone(row.Phone ?? ""), normalizePhone(row["Default Address Phone"] ?? "")],
    });
  }

  // Shopify writes one row per line item; only an order's first row carries the order's own fields.
  const orderRows = new Map<string, Row[]>();
  for (const row of readCsv(exports.orders)) {
    const name = clean(row.Name);
    if (name) orderRows.set(name, [...(orderRows.get(name) ?? []), row]);
  }

  const firstOrderAt = new Map<Customer, Date>();
  const orderStatements: string[] = [];
  let lastOrderNumber: number | null = null;

  for (const [name, [order, ...more]] of orderRows) {
    const number = Number(name.replace("#", ""));
    lastOrderNumber = Math.max(lastOrderNumber ?? number, number);

    const email = lower(order.Email);
    const phone = firstPhone(order.Phone, order["Shipping Phone"], order["Billing Phone"]);
    const customer =
      (email && customers.find((candidate) => candidate.email === email)) ||
      (phone && customers.find((candidate) => candidate.phones.includes(phone))) ||
      null;

    const createdAt = shopifyDate(order["Created at"]);
    const paidAt = shopifyDate(order["Paid at"]);
    const cancelledAt = shopifyDate(order["Cancelled at"]);
    const fulfilledAt = shopifyDate(order["Fulfilled at"]);
    if (customer && createdAt && createdAt.getTime() < (firstOrderAt.get(customer)?.getTime() ?? Infinity)) {
      firstOrderAt.set(customer, createdAt);
    }

    const method = order["Payment Method"] ?? "";
    const source = order.Source === "shopify_draft_order" ? "manual" : "web";
    const paymentMethod =
      method === "manual" || (source === "manual" && !clean(order["Shipping Method"]))
        ? "in_person"
        : /cash on delivery|\bcod\b/i.test(method)
          ? "cod"
          : "bank_transfer";
    // The courier collects cash on delivery, so a COD order Shopify marks paid before it has shipped
    // received nothing (it was marked by mistake). It comes across unpaid, with a warning, so an
    // advance that did come can be recorded in the admin.
    const markedPaid = order["Financial Status"] === "paid";
    const paidBeforeShipping = markedPaid && paymentMethod === "cod" && order["Fulfillment Status"] !== "fulfilled" && !cancelledAt;
    if (paidBeforeShipping) {
      warnings.push(`${name}: Shopify marks this cash on delivery order paid before it shipped. It came across with nothing received; record any advance in the admin.`);
    }
    const paid = markedPaid && !paidBeforeShipping;
    const status =
      cancelledAt || order["Financial Status"] === "voided"
        ? "cancelled"
        : order["Fulfillment Status"] === "fulfilled"
          ? paid
            ? "delivered"
            : "shipped"
          : paid || paymentMethod === "cod"
            ? "confirmed"
            : "pending";

    const lines = [order, ...more].map((row) => {
      const { title, size } = lineName(clean(row["Lineitem name"]) ?? "");
      const sku = clean(row["Lineitem sku"]);
      return { title, size, sku, quantity: Number(row["Lineitem quantity"]), unitPrice: rupees(row["Lineitem price"]) };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const discountTotal = rupees(order["Discount Amount"]);
    const deliveryFee = rupees(order.Shipping);
    const total = rupees(order.Total);
    if (subtotal - discountTotal + deliveryFee !== total) {
      warnings.push(`${name}: lines ${subtotal} - discount ${discountTotal} + delivery ${deliveryFee} is not the total ${total}.`);
    }

    // Shipping details where there are any; in-person sales only have billing details.
    const address = clean(order["Shipping Address1"]) || clean(order["Shipping City"]) ? "Shipping" : "Billing";
    const orderName =
      clean(order["Billing Name"]) ??
      clean(order["Shipping Name"]) ??
      ([clean(customer?.row["First Name"]), clean(customer?.row["Last Name"])].filter(Boolean).join(" ") || "Unknown");

    orderStatements.push(
      insert("orders", {
        number,
        customer_id: customer ? raw(`(SELECT id FROM customers WHERE shopify_id = ${literal(customer.shopifyId)})`) : null,
        status,
        payment_method: paymentMethod,
        name: orderName,
        email,
        phone,
        address1: clean(order[`${address} Address1`]),
        address2: clean(order[`${address} Address2`]),
        city: clean(order[`${address} City`]),
        province: clean(order[`${address} Province Name`]),
        postal_code: clean(order[`${address} Zip`]),
        country: clean(order[`${address} Country`]) ?? "PK",
        subtotal,
        discount_code: clean(order["Discount Code"]),
        discount_total: discountTotal,
        delivery_fee: deliveryFee,
        total,
        note: clean(order.Notes),
        source,
        shopify_id: clean(order.Id),
        created_at: createdAt,
        shipped_at: order["Fulfillment Status"] === "fulfilled" ? fulfilledAt : null,
        // Cash collected on delivery, or handed over in person, dates the delivery. A bank transfer doesn't.
        delivered_at: status === "delivered" && paymentMethod !== "bank_transfer" ? (paidAt ?? createdAt) : null,
        cancelled_at: status === "cancelled" ? (cancelledAt ?? createdAt) : null,
      }),
    );

    const orderId = raw(`(SELECT id FROM orders WHERE number = ${number})`);
    for (const line of lines) {
      const variantId = variantLookup(line.sku, line.title, line.size);
      orderStatements.push(
        insert("order_lines", {
          order_id: orderId,
          variant_id: raw(variantId),
          title: line.title,
          size: line.size,
          sku: line.sku ?? raw(`(SELECT sku FROM variants WHERE id = ${variantId})`),
          quantity: line.quantity,
          unit_price: line.unitPrice,
          cost_price: raw(`(SELECT cost_price FROM variants WHERE id = ${variantId})`),
        }),
      );
    }

    if (paid) {
      orderStatements.push(
        insert("payments", {
          order_id: orderId,
          method: paymentMethod === "in_person" ? "cash" : paymentMethod,
          amount: total,
          reference: clean(order["Payment Reference"]),
          received_at: paidAt ?? createdAt,
        }),
      );
    }
  }

  for (const customer of customers) {
    const { row } = customer;
    statements.push(
      insert("customers", {
        name: [clean(row["First Name"]), clean(row["Last Name"])].filter(Boolean).join(" ") || null,
        email: customer.email,
        phone: customer.phones.find((phone) => phone !== null) ?? null,
        accepts_marketing: row["Accepts Email Marketing"] === "yes",
        address1: clean(row["Default Address Address1"]),
        address2: clean(row["Default Address Address2"]),
        city: clean(row["Default Address City"]),
        province: clean(row["Default Address Province Code"]),
        postal_code: clean(row["Default Address Zip"]),
        country: clean(row["Default Address Country Code"]) ?? "PK",
        tags: (row.Tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
        note: clean(row.Note),
        shopify_id: customer.shopifyId,
        // A customer counts from their first order. Newsletter sign-ups get the import date.
        ...(firstOrderAt.has(customer) ? { created_at: firstOrderAt.get(customer) } : {}),
      }),
    );
  }

  return {
    statements: [...statements, ...orderStatements],
    report: {
      costPrices,
      stockCounts,
      customers: customers.length,
      skippedCustomers,
      orders: orderRows.size,
      lastOrderNumber,
      warnings,
    },
  };
}
