import { describe, expect, test } from "vitest";

import { deltaTone, paymentTone, statusTone } from "./tones";

describe("status colours", () => {
  test("each order status reads at a glance: waiting amber, ready green, moving blue, done violet, lost red", () => {
    expect(statusTone("pending")).toBe("amber");
    expect(statusTone("confirmed")).toBe("green");
    expect(statusTone("packed")).toBe("green");
    expect(statusTone("shipped")).toBe("blue");
    expect(statusTone("delivered")).toBe("violet");
    expect(statusTone("cancelled")).toBe("red");
    expect(statusTone("refused")).toBe("red");
  });

  test("a parcel in trouble changes colour: a failed attempt needs you, one coming back is going wrong", () => {
    expect(statusTone("shipped", "booked")).toBe("blue");
    expect(statusTone("shipped", "out_for_delivery")).toBe("blue");
    expect(statusTone("shipped", "attempted")).toBe("amber");
    expect(statusTone("shipped", "returning")).toBe("red");
    // A courier status left on an order that has moved on doesn't colour it.
    expect(statusTone("delivered", "returning")).toBe("violet");
  });

  test("money: settled green, on its way blue, short amber, nothing yet grey", () => {
    expect(paymentTone("paid")).toBe("green");
    expect(paymentTone("with_courier")).toBe("blue");
    expect(paymentTone("advance")).toBe("blue");
    expect(paymentTone("part")).toBe("amber");
    expect(paymentTone("unpaid")).toBe("grey");
  });

  test("a change on the dashboard: up green, down red, level grey", () => {
    expect(deltaTone(12)).toBe("green");
    expect(deltaTone(-3)).toBe("red");
    expect(deltaTone(0)).toBe("grey");
  });
});
