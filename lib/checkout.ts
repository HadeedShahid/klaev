import { CITIES } from "./cities";
import { normalizePhone } from "./phone";

export type PaymentChoice = "cod" | "bank_transfer";

export type CheckoutValues = {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  payment: PaymentChoice;
};

export type CheckoutField = keyof CheckoutValues;

export type CheckoutParse =
  | { ok: true; values: CheckoutValues }
  | { ok: false; errors: Partial<Record<CheckoutField, string>>; fields: Record<CheckoutField, string> };

const FIELDS: CheckoutField[] = ["name", "email", "phone", "city", "address", "payment"];

// Checks the checkout form on the server. Errors say what to type, in the store's voice.
export function parseCheckout(form: FormData): CheckoutParse {
  const fields = Object.fromEntries(
    FIELDS.map((field) => [field, String(form.get(field) ?? "").trim()]),
  ) as Record<CheckoutField, string>;
  const errors: Partial<Record<CheckoutField, string>> = {};

  const name = fields.name.replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Enter your full name.";

  const email = fields.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter an email address, like name@example.com.";

  const phone = normalizePhone(fields.phone);
  if (!phone) errors.phone = "Enter a mobile number, like 0300 1234567.";

  const city = CITIES.find((known) => known.toLowerCase() === fields.city.toLowerCase()) ?? fields.city.replace(/\s+/g, " ");
  if (!city) errors.city = "Enter your city.";

  const address = fields.address.replace(/\s+/g, " ");
  if (address.length < 5) errors.address = "Enter your full address.";

  const payment = fields.payment;
  if (payment !== "cod" && payment !== "bank_transfer") errors.payment = "Choose how you'll pay.";

  if (Object.keys(errors).length > 0) return { ok: false, errors, fields };
  return {
    ok: true,
    values: { name, email, phone: phone as string, city, address, payment: payment as PaymentChoice },
  };
}
