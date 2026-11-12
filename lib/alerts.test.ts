import { describe, expect, test } from "vitest";

import { messagePush, orderPush, receiptPush, reviewPush, TEST_PUSH } from "./alerts";

const order = {
  number: 1040,
  paymentMethod: "cod",
  name: "Ali Khan",
  phone: "+923001234567",
  city: "Lahore",
  total: 17_999,
  advance: 2_000,
  lines: [
    { title: "Black Cropped Sheepskin Leather Jacket", size: "M", quantity: 1, unitPrice: 17_999, image: null },
    { title: "Leather Belt", size: null, quantity: 2, unitPrice: 0, image: null },
  ],
};

describe("phone alerts", () => {
  test("a new order: the money in the title, who and what below, and it opens the order", () => {
    expect(orderPush(order)).toEqual({
      title: "New order #1040, PKR 17,999",
      body: "Cash on delivery. Ali Khan, Lahore. Black Cropped Sheepskin Leather Jacket, M; Leather Belt, 2 of them.",
      url: "/admin/orders/1040",
      tag: "order-1040",
    });
  });

  test("a receipt says what to check it against", () => {
    expect(receiptPush(order)).toEqual({
      title: "Receipt for #1040",
      body: "Ali Khan uploaded a transfer screenshot. Check it against PKR 2,000 in the account.",
      url: "/admin/orders/1040",
      tag: "receipt-1040",
    });
  });

  test("a message and a review show their first words on one line", () => {
    const long = `Do you have\nthis in XL?  ${"Please tell me. ".repeat(20)}`;
    const message = messagePush({ name: " Sara\n", subject: "An order", body: long });
    expect(message).toMatchObject({ title: "Message from Sara", url: "/admin/messages" });
    expect(message.body.startsWith("An order: Do you have this in XL? Please")).toBe(true);
    expect(message.body.length).toBeLessThanOrEqual(160);

    expect(reviewPush({ name: "Zara", rating: 5, body: "Soft,\nfits well.", title: "Burgundy Cropped Sheepskin Leather Jacket", orderNumber: 1041 })).toEqual({
      title: "Review from Zara, 5 of 5 stars",
      body: "Soft, fits well. Burgundy Cropped Sheepskin Leather Jacket, order #1041.",
      url: "/admin/reviews",
    });
    expect(reviewPush({ name: "Zara", rating: 4, body: null, title: "Belt", orderNumber: 1042 }).body).toBe("Belt, order #1042. It shows on the store once you publish it.");
  });

  test("the test alert says what the phone will get", () => {
    expect(TEST_PUSH).toEqual({ title: "Alerts are on", body: "This phone gets new orders, receipts, messages and reviews.", url: "/admin/settings", tag: "test" });
  });
});
