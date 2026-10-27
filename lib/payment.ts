import { STORE } from "./store";

export type CodSummary = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  advance: number;
  onDelivery: number;
};

export type BankTransferSummary = {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
};

function assertRupees(name: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a whole, non-negative rupee amount, got ${value}`);
  }
}

// What cash on delivery costs: its delivery fee, and the advance sent to confirm. Set in Settings
// (lib/settings.ts); the store's long-standing terms until then.
export type CodTerms = { codDeliveryFee: number; codAdvance: number };

// Cash on delivery: the customer sends an advance to confirm, the courier collects the rest.
// A bargained advance changes only the split, never the total. A discount comes off the items.
export function codSummary(
  subtotal: number,
  {
    advance = STORE.codAdvance,
    deliveryFee = STORE.codDeliveryFee,
    discount = 0,
  }: { advance?: number; deliveryFee?: number; discount?: number } = {},
): CodSummary {
  assertRupees("subtotal", subtotal);
  assertRupees("advance", advance);
  assertRupees("deliveryFee", deliveryFee);
  assertRupees("discount", discount);

  const total = subtotal - Math.min(discount, subtotal) + deliveryFee;
  const paidUpFront = Math.min(advance, total);
  return { subtotal, discount: Math.min(discount, subtotal), deliveryFee, total, advance: paidUpFront, onDelivery: total - paidUpFront };
}

export function bankTransferSummary(subtotal: number, discount = 0): BankTransferSummary {
  assertRupees("subtotal", subtotal);
  assertRupees("discount", discount);
  const off = Math.min(discount, subtotal);
  return { subtotal, discount: off, deliveryFee: 0, total: subtotal - off };
}
