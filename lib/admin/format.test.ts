import { describe, expect, test } from "vitest";

import { age, customerMessage, localPhone, parcelText, whatsappTo } from "./format";

const order = {
  number: 1024,
  name: "Ayesha Khan",
  phone: "+923001234567",
  address1: "House 1, Street 2, Model Town",
  city: "Lahore",
  total: 18899,
  paid: 2000,
  paymentMethod: "cod",
  trackingNumber: "PX123456",
  lines: [
    { title: "Dark Brown Cropped Sheepskin Leather Jacket", size: "M", quantity: 1 },
    { title: "Black Leather Belt", size: null, quantity: 2 },
  ],
};

describe("admin formatting", () => {
  test("ages read like a queue: minutes, hours, then days", () => {
    const now = new Date("2026-10-26T12:00:00Z");
    expect(age(new Date("2026-10-26T11:59:30Z"), now)).toBe("just now");
    expect(age(new Date("2026-10-26T11:48:00Z"), now)).toBe("12m");
    expect(age(new Date("2026-10-26T09:00:00Z"), now)).toBe("3h");
    expect(age(new Date("2026-10-24T12:00:00Z"), now)).toBe("2d");
  });

  test("phones go to the courier in local form, and to WhatsApp without the plus", () => {
    expect(localPhone("+923001234567")).toBe("03001234567");
    expect(localPhone("+447700900123")).toBe("+447700900123");
    expect(whatsappTo("+923001234567", "Hi")).toBe("https://wa.me/923001234567?text=Hi");
  });

  test("the parcel text has what the courier's booking form asks for, and the cash still to collect", () => {
    expect(parcelText(order)).toBe(
      [
        "Ayesha Khan",
        "03001234567",
        "House 1, Street 2, Model Town",
        "Lahore",
        "COD: 16899",
        "Order #1024: Dark Brown Cropped Sheepskin Leather Jacket (M), Black Leather Belt x2",
      ].join("\n"),
    );
    expect(parcelText({ ...order, paymentMethod: "bank_transfer", paid: 18899 })).toContain("COD: 0");
  });

  test("messages to the customer use their first name and never name the courier", () => {
    expect(customerMessage({ ...order, status: "confirmed" })).toBe(
      "Assalam o Alaikum Ayesha, your Klaev order #1024 is confirmed. We'll send you the tracking number as soon as it ships.",
    );
    const shipped = customerMessage({ ...order, status: "shipped" });
    expect(shipped).toBe(
      "Assalam o Alaikum Ayesha, your Klaev order #1024 is on its way. Tracking number: PX123456. Please keep PKR 16,899 ready for the rider.",
    );
    expect(shipped).not.toMatch(/postex/i);
    expect(customerMessage({ ...order, status: "pending" })).toBe("Assalam o Alaikum Ayesha, this is Klaev about your order #1024.");
  });
});
