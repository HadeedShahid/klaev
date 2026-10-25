import { describe, expect, test } from "vitest";

import { parseCheckout } from "./checkout";

const valid = {
  name: "  Ayesha Khan ",
  email: " Ayesha@Example.com ",
  phone: "0300 1234567",
  city: "lahore",
  address: "House 1, Street 2, Model Town",
  payment: "cod",
};

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("parseCheckout", () => {
  test("cleans up what the customer typed", () => {
    expect(parseCheckout(form(valid))).toEqual({
      ok: true,
      values: {
        name: "Ayesha Khan",
        email: "ayesha@example.com",
        phone: "+923001234567",
        city: "Lahore",
        address: "House 1, Street 2, Model Town",
        payment: "cod",
      },
    });
  });

  test("keeps a city that isn't on the list, as typed", () => {
    const result = parseCheckout(form({ ...valid, city: " Chak 89 " }));
    expect(result.ok && result.values.city).toBe("Chak 89");
  });

  test("says what is wrong with each field, and keeps what was typed", () => {
    const result = parseCheckout(form({ name: " ", email: "ayesha@", phone: "12345", city: "", address: "", payment: "card" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["address", "city", "email", "name", "payment", "phone"]);
    expect(result.fields).toMatchObject({ email: "ayesha@", phone: "12345" });
  });

  test("bank transfer is the other way to pay", () => {
    const result = parseCheckout(form({ ...valid, payment: "bank_transfer" }));
    expect(result.ok && result.values.payment).toBe("bank_transfer");
  });
});
