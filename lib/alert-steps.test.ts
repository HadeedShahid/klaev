import { afterEach, describe, expect, test, vi } from "vitest";

import { askPermission, PERMISSION_STUCK, Stuck, within } from "./alert-steps";

const never = <T,>() => new Promise<T>(() => {});
const instant = () => Promise.resolve();

afterEach(() => vi.useRealTimers());

describe("turning alerts on never spins for good", () => {
  test("the answer to the browser's question is used as it comes", async () => {
    expect(await askPermission(async () => "granted", () => "default", { sleep: instant })).toBe("granted");
    expect(await askPermission(async () => "default", () => "default", { sleep: instant })).toBe("default");
  });

  test("notifications allowed from the browser's settings, while its question waits, still count", async () => {
    const answers = ["default", "default", "granted"] as const;
    let checks = 0;
    const current = () => answers[Math.min(checks++, answers.length - 1)];
    expect(await askPermission(never, current, { sleep: instant })).toBe("granted");
  });

  test("with no answer at all, it stops and says what to do", async () => {
    const asking = askPermission(never, () => "default", { seconds: 2, sleep: instant });
    await expect(asking).rejects.toBeInstanceOf(Stuck);
    await expect(asking).rejects.toThrow(PERMISSION_STUCK);
  });

  test("a step that never answers is given up on with its message; one that answers goes through", async () => {
    vi.useFakeTimers();
    const stuck = within(never(), 15, "The alerts helper didn't start.");
    vi.advanceTimersByTime(15_000);
    await expect(stuck).rejects.toThrow("The alerts helper didn't start.");
    await expect(within(Promise.resolve("on"), 15, "never shown")).resolves.toBe("on");
  });
});
