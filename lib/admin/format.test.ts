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
  });

  test("a parcel with nothing to collect is marked prepaid, never COD: 0", () => {
    const prepaid = parcelText({ ...order, paymentMethod: "bank_transfer", paid: 18899 });
    expect(prepaid.split("\n")[4]).toBe("Non-COD (Prepaid)");
    expect(prepaid).not.toContain("COD: 0");
    // Cash on delivery with the whole amount paid up front: the rider has nothing to collect either.
    expect(parcelText({ ...order, paid: 18899 }).split("\n")[4]).toBe("Non-COD (Prepaid)");
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

  test("once delivered, it asks for a review through the order's link", () => {
    const link = "https://klaev.com/orders/abc/review";
    const jacket = { ...order, status: "delivered", lines: [{ title: "Black Cropped Leather Jacket", size: "M", quantity: 1 }] };
    expect(customerMessage(jacket, link)).toBe(
      "Assalam o Alaikum Ayesha, hope the jacket is fitting well. If you have a minute, tell other buyers how it is: https://klaev.com/orders/abc/review",
    );
    expect(customerMessage({ ...jacket, lines: [{ title: "Black Stitched Leather Belt", size: null, quantity: 1 }] }, link)).toContain("hope the belt is fitting well");
    expect(customerMessage(jacket)).toBe("Assalam o Alaikum Ayesha, this is Klaev about your order #1024.");
  });
});
