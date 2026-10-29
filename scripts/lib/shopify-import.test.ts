// @vitest-environment node
import { asc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import snapshot from "@/data/catalog.json";
import { createTestDb } from "@/lib/db/test-db";
import { customers, orderLines, orders, payments, variants } from "@/lib/db/schema";

import { catalogSeedStatements } from "./catalog-seed";
import { shopifyImport } from "./shopify-import";

// Made-up rows in the shape of Shopify's CSV exports. The real exports hold customers' personal
// details and stay out of the repository (data/private/, ignored by git).
const csv = (rows: string[][]) => rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

const PRODUCTS = csv([
  ["Handle", "Option1 Value", "Variant SKU", "Cost per item", "Variant Inventory Qty"],
  ["black-lambskin-leather-jacket", "m", "LTHR-BLK-M", "9000.00", "3"],
  ["black-lambskin-leather-jacket", "l", "LTHR-BLK-L", "9000.00", ""],
  ["black-lambskin-leather-jacket", "xl", "LTHR-BLK-XL", "", "2"],
  // A photo's own row: no size, no SKU, nothing to import.
  ["black-lambskin-leather-jacket", "", "", "", ""],
  ["dark-brown-cropped-sheepskin-leather-jacket", "S", "KLAEV-CROP-DBRN-S", "", "-1"],
  // Shopify lost these SKUs; the size, in Shopify's lower case, still finds the variant.
  ["dark-brown-cropped-sheepskin-leather-jacket", "m", "", "", "0"],
  ["dark-brown-cropped-sheepskin-leather-jacket", "xl", "", "", "3"],
  // A product without sizes is Shopify's "Default Title".
  ["black-stitched-leather-belt", "Default Title", "", "", "4"],
]);

const CUSTOMER_COLUMNS = [
  "Customer ID",
  "First Name",
  "Last Name",
  "Email",
  "Accepts Email Marketing",
  "Default Address Address1",
  "Default Address Address2",
  "Default Address City",
  "Default Address Province Code",
  "Default Address Country Code",
  "Default Address Zip",
  "Default Address Phone",
  "Phone",
  "Note",
  "Tags",
];

const CUSTOMERS = csv([
  CUSTOMER_COLUMNS,
  ["'1001", "Ayesha", "Khan", "Buyer.One@Example.com", "no", "House 1, Street 2", "", "Lahore", "", "PK", "54000", "'03001234567", "", "", ""],
  ["'1002", "", "", "news@example.com", "yes", "", "", "", "", "PK", "", "", "", "", "newsletter"],
  ["'1003", "Bilal", "Ahmed", "", "no", "Flat 3", "", "Karachi", "", "PK", "", "", "'+923009876543", "", ""],
  ["'1004", "Walk", "In", "walkin@example.com", "no", "", "", "Lahore", "", "PK", "", "", "", "", ""],
  ["'1005", "", "", "admin@admin.com", "yes", "", "", "", "", "", "", "", "", "", ""],
  ["'1006", "Spam", "Bot", "x123@inscrlab.com", "no", "1 Main St", "", "New York", "", "PK", "", "'4763431484", "", "", ""],
  ["'1007", "", "", "someone@gmai.com", "yes", "", "", "", "", "PK", "", "", "", "", ""],
]);

const ORDER_COLUMNS = [
  "Name",
  "Email",
  "Financial Status",
  "Paid at",
  "Fulfillment Status",
  "Fulfilled at",
  "Subtotal",
  "Shipping",
  "Total",
  "Discount Code",
  "Discount Amount",
  "Shipping Method",
  "Created at",
  "Lineitem quantity",
  "Lineitem name",
  "Lineitem price",
  "Lineitem sku",
  "Billing Name",
  "Shipping Name",
  "Shipping Address1",
  "Shipping Address2",
  "Shipping City",
  "Shipping Zip",
  "Shipping Province Name",
  "Shipping Country",
  "Shipping Phone",
  "Notes",
  "Cancelled at",
  "Payment Method",
  "Payment Reference",
  "Id",
  "Source",
  "Phone",
];

type OrderRow = Partial<Record<(typeof ORDER_COLUMNS)[number], string>>;
const orderRow = (row: OrderRow) => ORDER_COLUMNS.map((column) => row[column] ?? "");

const ORDERS = csv([
  ORDER_COLUMNS,
  orderRow({
    Name: "#1101",
    Email: "buyer.one@example.com",
    "Financial Status": "paid",
    "Paid at": "2026-10-22 21:57:10 +0500",
    "Fulfillment Status": "unfulfilled",
    Subtotal: "17999.00",
    Shipping: "0.00",
    Total: "17999.00",
    "Discount Amount": "0.00",
    "Shipping Method": "Standard delivery — Bank transfer",
    "Created at": "2026-10-22 21:47:49 +0500",
    "Lineitem quantity": "1",
    "Lineitem name": "Black Cropped Sheepskin Leather Jacket - L / Black",
    "Lineitem price": "17999.00",
    "Lineitem sku": "KLAEV-CROP-BLK-L",
    "Billing Name": "Ayesha Khan",
    "Shipping Name": "Ayesha Khan",
    "Shipping Address1": "House 1, Street 2",
    "Shipping City": "Lahore",
    "Shipping Zip": "54000",
    "Shipping Province Name": "Punjab",
    "Shipping Country": "PK",
    "Shipping Phone": "'03001234567",
    "Payment Method": "Bank Deposit",
    "Payment Reference": "#1101.1",
    Id: "9001",
    Source: "web",
  }),
  orderRow({
    Name: "#1102",
    "Financial Status": "pending",
    "Fulfillment Status": "fulfilled",
    "Fulfilled at": "2026-10-21 17:41:43 +0500",
    Subtotal: "17999.00",
    Shipping: "899.00",
    Total: "18898.00",
    "Discount Amount": "0.00",
    "Shipping Method": "Standard delivery — Cash on delivery",
    "Created at": "2026-10-21 10:03:24 +0500",
    "Lineitem quantity": "1",
    "Lineitem name": "Dark Brown Cropped Sheepskin Leather Jacket - S / Dark brown",
    "Lineitem price": "17999.00",
    "Lineitem sku": "KLAEV-CROP-DBRN-S",
    "Shipping Name": "Bilal Ahmed",
    "Shipping Address1": "Flat 3",
    "Shipping City": "Karachi",
    "Shipping Country": "PK",
    "Payment Method": "Cash on Delivery (COD)",
    Id: "9002",
    Source: "web",
    Phone: "'+923009876543",
  }),
  orderRow({
    Name: "#1103",
    Email: "gone@example.com",
    "Financial Status": "voided",
    "Fulfillment Status": "unfulfilled",
    Subtotal: "13999.00",
    Shipping: "0.00",
    Total: "13999.00",
    "Discount Amount": "0.00",
    "Created at": "2026-01-22 13:11:05 +0500",
    "Cancelled at": "2026-01-23 11:15:46 +0500",
    "Lineitem quantity": "1",
    "Lineitem name": "Black Lambskin Leather Jacket - M / Black",
    "Lineitem price": "13999.00",
    "Lineitem sku": "LTHR-BLK-M",
    "Billing Name": "Gone Away",
    "Payment Method": "Bank Deposit",
    Id: "9003",
    Source: "web",
  }),
  orderRow({
    Name: "#1104",
    Email: "buyer.one@example.com",
    "Financial Status": "paid",
    "Paid at": "2026-10-07 22:52:43 +0500",
    "Fulfillment Status": "fulfilled",
    "Fulfilled at": "2026-10-08 21:44:18 +0500",
    Subtotal: "33498.00",
    Shipping: "0.00",
    Total: "33498.00",
    "Discount Code": "SAVE2500",
    "Discount Amount": "2500.00",
    "Shipping Method": "Free Shipping",
    "Created at": "2026-10-07 11:51:12 +0500",
    "Lineitem quantity": "1",
    // Shopify lost the SKUs on some dark brown sizes, so this line is matched by name and size.
    "Lineitem name": "Dark Brown Cropped Sheepskin Leather Jacket - M / Dark brown",
    "Lineitem price": "17999.00",
    "Billing Name": "Ayesha Khan",
    "Shipping City": "Lahore",
    "Payment Method": "Bank Deposit",
    "Payment Reference": "#1104.1",
    Id: "9004",
    Source: "web",
  }),
  orderRow({
    Name: "#1104",
    "Created at": "2026-10-07 11:51:12 +0500",
    "Lineitem quantity": "1",
    "Lineitem name": "Black Cropped Sheepskin Leather Jacket - M / Black",
    "Lineitem price": "17999.00",
    "Lineitem sku": "KLAEV-CROP-BLK-M",
  }),
  orderRow({
    Name: "#1105",
    Email: "walkin@example.com",
    "Financial Status": "paid",
    "Paid at": "2026-09-26 14:27:38 +0500",
    "Fulfillment Status": "fulfilled",
    "Fulfilled at": "2026-09-26 14:27:47 +0500",
    Subtotal: "13999.00",
    Shipping: "0.00",
    Total: "13999.00",
    "Discount Amount": "0.00",
    "Created at": "2026-09-26 14:27:38 +0500",
    "Lineitem quantity": "1",
    "Lineitem name": "Black Lambskin Leather Jacket - M / Black",
    "Lineitem price": "13999.00",
    "Lineitem sku": "LTHR-BLK-M",
    "Billing Name": "Walk In",
    Notes: "Bought in person.",
    "Payment Method": "manual",
    "Payment Reference": "rABC",
    Id: "9005",
    Source: "shopify_draft_order",
  }),
  orderRow({
    Name: "#1106",
    Email: "buyer.one@example.com",
    "Financial Status": "paid",
    "Paid at": "2025-12-18 18:28:00 +0500",
    "Fulfillment Status": "fulfilled",
    "Fulfilled at": "2025-12-18 18:27:11 +0500",
    Subtotal: "17099.10",
    Shipping: "300.00",
    Total: "17399.10",
    "Discount Code": "FIRST10",
    "Discount Amount": "1899.90",
    "Shipping Method": "Shipping",
    "Created at": "2025-12-18 16:58:47 +0500",
    "Lineitem quantity": "1",
    "Lineitem name": "Black Goatskin Suede Jacket - M / Black",
    "Lineitem price": "18999.00",
    "Lineitem sku": "SUD-BLK-M",
    "Billing Name": "Ayesha Khan",
    "Payment Method": "Cash on Delivery (COD)",
    "Payment Reference": "#1106.1",
    Id: "9006",
    Source: "web",
  }),
  // Marked paid by mistake: cash on delivery, not sent yet, nothing received.
  orderRow({
    Name: "#1107",
    Email: "buyer.one@example.com",
    "Financial Status": "paid",
    "Paid at": "2026-10-27 11:07:08 +0500",
    "Fulfillment Status": "unfulfilled",
    Subtotal: "17999.00",
    Shipping: "800.00",
    Total: "18799.00",
    "Shipping Method": "Standard delivery — Cash on delivery",
    "Created at": "2026-10-26 22:11:34 +0500",
    "Lineitem quantity": "1",
    "Lineitem name": "Black Cropped Sheepskin Leather Jacket - S / Black",
    "Lineitem price": "17999.00",
    "Lineitem sku": "KLAEV-CROP-BLK-S",
    "Billing Name": "Ayesha Khan",
    "Payment Method": "Cash on Delivery (COD)",
    "Payment Reference": "#1107.1",
    Id: "9007",
    Source: "web",
  }),
]);

const at = (text: string) => new Date(text);

let store: Awaited<ReturnType<typeof createTestDb>>;
let result: ReturnType<typeof shopifyImport>;

beforeAll(async () => {
  store = await createTestDb();
  await store.run(catalogSeedStatements(snapshot));
  result = shopifyImport({ products: PRODUCTS, customers: CUSTOMERS, orders: ORDERS });
  await store.run(result.statements);
}, 60_000);

afterAll(() => store?.dispose());

async function order(number: number) {
  const row = await store.db.query.orders.findFirst({
    where: eq(orders.number, number),
    with: { lines: { orderBy: asc(orderLines.id) }, payments: true, customer: true },
  });
  if (!row) throw new Error(`order ${number} was not imported`);
  return row;
}

describe("importing the Shopify exports", () => {
  test("cost prices land on their variants", async () => {
    const rows = await store.db.select({ sku: variants.sku, cost: variants.costPrice }).from(variants);
    const cost = Object.fromEntries(rows.map((row) => [row.sku, row.cost]));
    expect(cost["LTHR-BLK-M"]).toBe(9000);
    expect(cost["LTHR-BLK-L"]).toBe(9000);
    expect(cost["LTHR-BLK-XL"]).toBeNull();
  });

  test("each size takes Shopify's stock count; a blank count leaves it alone, and an oversold one is none", async () => {
    const rows = await store.db.select({ sku: variants.sku, stock: variants.stock }).from(variants);
    const stock = Object.fromEntries(rows.map((row) => [row.sku, row.stock]));
    expect(stock["LTHR-BLK-M"]).toBe(3);
    expect(stock["LTHR-BLK-L"]).toBe(1);
    expect(stock["LTHR-BLK-XL"]).toBe(2);
    expect(stock["KLAEV-CROP-DBRN-S"]).toBe(0);
    expect(stock["KLAEV-CROP-DBRN-M"]).toBe(0);
    expect(stock["KLAEV-CROP-DBRN-XL"]).toBe(3);
    expect(stock["BELT-STC-BK"]).toBe(4);
    // Untouched: no count in the export.
    expect(stock["KLAEV-CROP-DBRN-L"]).toBe(1);
    expect(result.report.stockCounts).toBe(6);
  });

  test("customers come across cleaned up, without test and spam sign-ups", async () => {
    expect(result.report.skippedCustomers).toBe(3);
    const rows = await store.db.select().from(customers).orderBy(asc(customers.shopifyId));
    expect(rows.map((row) => row.email)).toEqual([
      "buyer.one@example.com",
      "news@example.com",
      null,
      "walkin@example.com",
    ]);
    expect(rows[0]).toMatchObject({
      name: "Ayesha Khan",
      phone: "+923001234567",
      acceptsMarketing: false,
      address1: "House 1, Street 2",
      city: "Lahore",
      postalCode: "54000",
      country: "PK",
      // A customer counts from their first order.
      createdAt: at("2025-12-18T16:58:47+05:00"),
    });
    expect(rows[1]).toMatchObject({ name: null, acceptsMarketing: true, tags: ["newsletter"] });
    expect(rows[2]).toMatchObject({ name: "Bilal Ahmed", phone: "+923009876543" });
  });

  test("a bank transfer order that is paid but not sent is confirmed, with its payment on the ledger", async () => {
    const row = await order(1101);
    expect(row).toMatchObject({
      status: "confirmed",
      paymentMethod: "bank_transfer",
      source: "web",
      name: "Ayesha Khan",
      email: "buyer.one@example.com",
      phone: "+923001234567",
      address1: "House 1, Street 2",
      city: "Lahore",
      province: "Punjab",
      postalCode: "54000",
      subtotal: 17999,
      discountTotal: 0,
      deliveryFee: 0,
      total: 17999,
      advance: 0,
      shopifyId: "9001",
      createdAt: at("2026-10-22T21:47:49+05:00"),
    });
    expect(row.customer?.email).toBe("buyer.one@example.com");
    expect(row.lines).toMatchObject([
      { variantId: 45831741571143, title: "Black Cropped Sheepskin Leather Jacket", size: "L", sku: "KLAEV-CROP-BLK-L", quantity: 1, unitPrice: 17999 },
    ]);
    expect(row.payments).toMatchObject([
      { method: "bank_transfer", amount: 17999, reference: "#1101.1", receivedAt: at("2026-10-22T21:57:10+05:00") },
    ]);
  });

  test("a sent cash on delivery order not yet paid is shipped, found by phone, with nothing received", async () => {
    const row = await order(1102);
    expect(row).toMatchObject({
      status: "shipped",
      paymentMethod: "cod",
      deliveryFee: 899,
      total: 18898,
      phone: "+923009876543",
      shippedAt: at("2026-10-21T17:41:43+05:00"),
    });
    expect(row.customer?.name).toBe("Bilal Ahmed");
    expect(row.payments).toEqual([]);
  });

  test("a voided order is cancelled, and an unknown buyer leaves the customer empty", async () => {
    const row = await order(1103);
    expect(row).toMatchObject({ status: "cancelled", cancelledAt: at("2026-01-23T11:15:46+05:00"), customerId: null });
    expect(row.payments).toEqual([]);
  });

  test("a two-jacket order keeps both lines and its discount, even where Shopify lost the SKU", async () => {
    const row = await order(1104);
    expect(row).toMatchObject({
      status: "delivered",
      subtotal: 35998,
      discountCode: "SAVE2500",
      discountTotal: 2500,
      total: 33498,
    });
    expect(row.lines.map((line) => [line.variantId, line.size, line.sku])).toEqual([
      [49253873680455, "M", "KLAEV-CROP-DBRN-M"],
      [45831741538375, "M", "KLAEV-CROP-BLK-M"],
    ]);
  });

  test("an in-person sale is a manual order paid in cash, with the cost of the jacket on its line", async () => {
    const row = await order(1105);
    expect(row).toMatchObject({ status: "delivered", paymentMethod: "in_person", source: "manual", note: "Bought in person." });
    expect(row.lines[0]).toMatchObject({ sku: "LTHR-BLK-M", costPrice: 9000 });
    expect(row.payments).toMatchObject([{ method: "cash", amount: 13999 }]);
  });

  test("paisa from percentage discounts round to whole rupees, and collected cash means delivered", async () => {
    const row = await order(1106);
    expect(row).toMatchObject({
      status: "delivered",
      paymentMethod: "cod",
      subtotal: 18999,
      discountTotal: 1900,
      deliveryFee: 300,
      total: 17399,
      deliveredAt: at("2025-12-18T18:28:00+05:00"),
    });
    expect(row.payments).toMatchObject([{ method: "cod", amount: 17399 }]);
  });

  test("a cash on delivery order Shopify marks paid before it ships is confirmed with nothing received, and flagged", async () => {
    const row = await order(1107);
    expect(row).toMatchObject({ status: "confirmed", paymentMethod: "cod", total: 18799, advance: 0 });
    expect(row.payments).toEqual([]);
    expect(result.report.warnings).toContainEqual(expect.stringContaining("#1107"));
  });

  test("new orders carry on numbering after the last Shopify order", async () => {
    expect(result.report).toMatchObject({ orders: 7, lastOrderNumber: 1107 });
  });

  test("running the import again replaces what it brought in, without duplicates", async () => {
    await store.run(result.statements);
    expect(await store.db.$count(orders)).toBe(7);
    expect(await store.db.$count(orderLines)).toBe(8);
    expect(await store.db.$count(payments)).toBe(4);
    expect(await store.db.$count(customers)).toBe(4);
  });
});
