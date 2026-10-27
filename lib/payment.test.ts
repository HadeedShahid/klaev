import { describe, expect, test } from "vitest";

import { bankTransferSummary, codSummary } from "./payment";

describe("codSummary", () => {
  test("adds the delivery fee and splits the default advance from the cash on delivery", () => {
    expect(codSummary(17999)).toEqual({
      subtotal: 17999,
      discount: 0,
      deliveryFee: 900,
      total: 18899,
      advance: 2000,
      onDelivery: 16899,
    });
  });

  test("a bargained advance moves the difference onto the cash on delivery", () => {
    const summary = codSummary(17999, { advance: 1000 });
    expect(summary.total).toBe(18899);
    expect(summary.advance).toBe(1000);
    expect(summary.onDelivery).toBe(17899);
  });

  test("works for a belt", () => {
    expect(codSummary(2500)).toMatchObject({ total: 3400, advance: 2000, onDelivery: 1400 });
  });

  test("never asks for more advance than the order total", () => {
    expect(codSummary(1000, { advance: 5000 })).toMatchObject({ total: 1900, advance: 1900, onDelivery: 0 });
  });

  test("rejects a negative advance", () => {
    expect(() => codSummary(17999, { advance: -1 })).toThrow();
  });

  test("a discount comes off the items, never below nothing", () => {
    expect(codSummary(17999, { discount: 1800 })).toMatchObject({ discount: 1800, total: 17099, advance: 2000, onDelivery: 15099 });
    expect(codSummary(2500, { discount: 9000, deliveryFee: 0 })).toMatchObject({ discount: 2500, total: 0, advance: 0, onDelivery: 0 });
  });
});

describe("bankTransferSummary", () => {
  test("delivers free and is paid in full up front", () => {
    expect(bankTransferSummary(17999)).toEqual({ subtotal: 17999, discount: 0, deliveryFee: 0, total: 17999 });
    expect(bankTransferSummary(17999, 1000)).toEqual({ subtotal: 17999, discount: 1000, deliveryFee: 0, total: 16999 });
  });
});
