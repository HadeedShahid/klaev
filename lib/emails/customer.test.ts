// @vitest-environment node
import { describe, expect, it } from "vitest";

import { orderReceivedEmail, orderShippedEmail, type EmailOrder } from "./customer";

const SITE = "https://klaev.com";
const BANK = { bank: "HBL", accountTitle: "Klaev", accountNumber: "1234567890", iban: "PK00HABB0000001234567890" };

const cod: EmailOrder = {
  number: 1023,
  token: "abcdefghijklmnopqrstuvwx",
  paymentMethod: "cod",
  name: "Ayesha Khan",
  phone: "+923001234567",
  address1: "House 1, Street 2, Model Town",
  city: "Lahore",
  subtotal: 17999,
  discountCode: null,
  discountTotal: 0,
  deliveryFee: 900,
  total: 18899,
  advance: 2000,
  trackingNumber: null,
  lines: [
    {
      title: "Dark Brown Cropped Sheepskin Leather Jacket",
      size: "M",
      quantity: 1,
      unitPrice: 17999,
      image: { src: "https://media.klaev.com/products/dark-brown/abc.webp", width: 1600, height: 2000 },
    },
  ],
};
const bank: EmailOrder = { ...cod, paymentMethod: "bank_transfer", deliveryFee: 0, total: 17999, advance: 0 };
const shipped = { ...cod, trackingNumber: "TRK12345", paid: 2000, codTax: 0 };

describe("orderReceivedEmail", () => {
  it("says what to send for cash on delivery, where to send it, and how to send the screenshot", () => {
    const email = orderReceivedEmail(cod, { bank: BANK, site: SITE });
    expect(email.subject).toBe("Order #1023 is in");
    for (const body of [email.html, email.text]) {
      expect(body).toContain("Order #1023 is in.");
      expect(body).toContain("Send PKR 2,000 to confirm it.");
      expect(body).toContain("The rest, PKR 16,899, is paid in cash when it arrives.");
      expect(body).toContain("1234567890");
      expect(body).toContain("PK00HABB0000001234567890");
      expect(body).toContain(`${SITE}/orders/abcdefghijklmnopqrstuvwx`);
      expect(body).toContain("Dark Brown Cropped Sheepskin Leather Jacket");
      expect(body).toContain("Size M");
      expect(body).toContain("PKR 18,899");
      expect(body).toContain("House 1, Street 2, Model Town");
      expect(body).toContain("+92 300 1234567");
    }
  });

  it("asks for the full amount for a bank transfer, with delivery free", () => {
    const { html, text } = orderReceivedEmail(bank, { bank: BANK, site: SITE });
    for (const body of [html, text]) {
      expect(body).toContain("Send PKR 17,999 to confirm it.");
      expect(body).toContain("Delivery is free.");
      expect(body).not.toContain("paid in cash");
    }
  });

  it("promises the account on WhatsApp when none is set", () => {
    const { text } = orderReceivedEmail(cod, { bank: null, site: SITE });
    expect(text).toContain("We send the account details on WhatsApp.");
  });

  it("asks for nothing when nothing is due", () => {
    const { text } = orderReceivedEmail({ ...cod, advance: 0, total: 0 }, { bank: BANK, site: SITE });
    expect(text).not.toContain("Send PKR");
    expect(text).not.toContain("1234567890");
  });

  it("shows a discount with its code", () => {
    const { text } = orderReceivedEmail({ ...cod, discountCode: "EID10", discountTotal: 1800, total: 17099 }, { bank: BANK, site: SITE });
    expect(text).toContain("Discount (EID10)");
    expect(text).toContain("−PKR 1,800");
  });

  it("uses a stored photo copy, not the full size one", () => {
    const { html } = orderReceivedEmail(cod, { bank: BANK, site: SITE });
    expect(html).toContain("products/dark-brown/abc-96.webp");
  });

  it("escapes what customers typed, so it can't become markup", () => {
    const { html } = orderReceivedEmail({ ...cod, name: `<img src=x onerror="alert(1)">`, address1: "A & B" }, { bank: BANK, site: SITE });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("A &amp; B");
  });
});

describe("orderShippedEmail", () => {
  it("gives the tracking number, a way to follow the parcel, and the cash to have ready", () => {
    const email = orderShippedEmail(shipped, { site: SITE });
    expect(email.subject).toBe("Order #1023 is on its way");
    for (const body of [email.html, email.text]) {
      expect(body).toContain("Order #1023 is on its way.");
      expect(body).toContain("Most orders arrive in 2 to 5 days.");
      expect(body).toContain("Keep PKR 16,899 ready in cash.");
      expect(body).toContain("TRK12345");
      expect(body).toContain(`${SITE}/orders/abcdefghijklmnopqrstuvwx`);
    }
  });

  it("goes by what was really paid, not the advance agreed", () => {
    const { text } = orderShippedEmail({ ...shipped, paid: 0 }, { site: SITE });
    expect(text).toContain("Keep PKR 18,899 ready in cash.");
  });

  it("asks for no cash on a paid order", () => {
    const { text } = orderShippedEmail({ ...shipped, ...bank, trackingNumber: "TRK12345", paid: 17999, codTax: 0 }, { site: SITE });
    expect(text).not.toContain("in cash");
  });

  it("points an order without a private link (Shopify's) at the tracking page", () => {
    const { text } = orderShippedEmail({ ...shipped, token: null }, { site: SITE });
    expect(text).toContain(`${SITE}/track`);
  });
});

describe("the brand rules", () => {
  const emails = [
    orderReceivedEmail(cod, { bank: BANK, site: SITE }),
    orderReceivedEmail(bank, { bank: null, site: SITE }),
    orderShippedEmail(shipped, { site: SITE }),
  ];

  it("never names the courier", () => {
    for (const { subject, html, text } of emails) expect(`${subject}${html}${text}`).not.toMatch(/postex/i);
  });

  it("uses no em or en dashes", () => {
    for (const { subject, html, text } of emails) expect(`${subject}${html}${text}`).not.toMatch(/[–—]|&mdash;|&ndash;/);
  });
});
