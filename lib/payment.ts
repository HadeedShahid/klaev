import { STORE } from "./store";

export type CodSummary = {
  subtotal: number;
  deliveryFee: number;
  total: number;
  advance: number;
  onDelivery: number;
};

export type BankTransferSummary = {
  subtotal: number;
  deliveryFee: number;
  total: number;
};

function assertRupees(name: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a whole, non-negative rupee amount, got ${value}`);
  }
}

// Cash on delivery: the customer sends an advance to confirm, the courier collects the rest.
// A bargained advance changes only the split, never the total.
export function codSummary(
  subtotal: number,
  { advance = STORE.codAdvance, deliveryFee = STORE.codDeliveryFee }: { advance?: number; deliveryFee?: number } = {},
): CodSummary {
  assertRupees("subtotal", subtotal);
  assertRupees("advance", advance);
  assertRupees("deliveryFee", deliveryFee);

  const total = subtotal + deliveryFee;
  const paidUpFront = Math.min(advance, total);
  return { subtotal, deliveryFee, total, advance: paidUpFront, onDelivery: total - paidUpFront };
}

export function bankTransferSummary(subtotal: number): BankTransferSummary {
  assertRupees("subtotal", subtotal);
  return { subtotal, deliveryFee: 0, total: subtotal };
}
