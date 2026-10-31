// @vitest-environment node
import { describe, expect, it } from "vitest";

import { messageAlert, newOrderAlert, receiptAlert } from "./alerts";

const SITE = "https://klaev.com";
const order = {
  number: 1023,
  paymentMethod: "cod" as const,
  name: "Ayesha Khan",
  phone: "+923001234567",
  city: "Lahore",
  total: 18899,
  advance: 2000,
  lines: [{ title: "Black Suede Jacket", size: "L", quantity: 2, unitPrice: 18999, image: null }],
};

describe("newOrderAlert", () => {
  it("says what came in, from whom, and opens the order", () => {
    const { subject, html, text } = newOrderAlert(order, SITE);
    expect(subject).toBe("New order #1023, PKR 18,899, cash on delivery");
    for (const body of [html, text]) {
      expect(body).toContain("Ayesha Khan");
      expect(body).toContain("+92 300 1234567");
      expect(body).toContain("Lahore");
      expect(body).toContain("Black Suede Jacket");
      expect(body).toContain("Size L, quantity 2");
      expect(body).toContain(`${SITE}/admin/orders/1023`);
    }
  });

  it("names a bank transfer", () => {
    expect(newOrderAlert({ ...order, paymentMethod: "bank_transfer" }, SITE).subject).toBe("New order #1023, PKR 18,899, bank transfer");
  });
});

describe("receiptAlert", () => {
  it("says which order to check, and how much to expect", () => {
    const { subject, text } = receiptAlert(order, SITE);
    expect(subject).toBe("Receipt uploaded for order #1023");
    expect(text).toContain("PKR 2,000");
    expect(text).toContain(`${SITE}/admin/orders/1023`);
  });

  it("expects the full amount on a bank transfer", () => {
    expect(receiptAlert({ ...order, paymentMethod: "bank_transfer" }, SITE).text).toContain("PKR 18,899");
  });
});

describe("messageAlert", () => {
  const message = { name: "Sara", email: "sara@example.com", phone: "+923001112222", subject: "An exchange", body: "Can I swap for a large?" };

  it("carries the message and how to answer it", () => {
    const { subject, html, text } = messageAlert(message, SITE);
    expect(subject).toBe("Message from Sara: An exchange");
    for (const body of [html, text]) {
      expect(body).toContain("Can I swap for a large?");
      expect(body).toContain("sara@example.com");
      expect(body).toContain("+92 300 1112222");
      expect(body).toContain(`${SITE}/admin/messages`);
    }
  });

  it("keeps what a stranger typed out of the markup and off the subject's line endings", () => {
    const { subject, html } = messageAlert({ ...message, name: "Sara\r\nBcc: all@example.com", body: "<script>alert(1)</script>" }, SITE);
    expect(subject).not.toMatch(/[\r\n]/);
    expect(html).not.toContain("<script>");
  });
});
