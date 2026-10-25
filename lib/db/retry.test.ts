import { describe, expect, test, vi } from "vitest";

import { retryLocalRead } from "./retry";

describe("retryLocalRead", () => {
  test("in development, tries a failed read again until it works", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("internal error")).mockResolvedValue("catalog");
    await expect(retryLocalRead(read, { development: true, delayMs: 0 })).resolves.toBe("catalog");
    expect(read).toHaveBeenCalledTimes(2);
  });

  test("gives up after a few tries and throws the last error", async () => {
    const read = vi.fn().mockRejectedValue(new Error("still locked"));
    await expect(retryLocalRead(read, { development: true, delayMs: 0 })).rejects.toThrow("still locked");
    expect(read).toHaveBeenCalledTimes(5);
  });

  test("anywhere else, a failed read fails at once", async () => {
    const read = vi.fn().mockRejectedValue(new Error("D1 error"));
    await expect(retryLocalRead(read, { development: false, delayMs: 0 })).rejects.toThrow("D1 error");
    expect(read).toHaveBeenCalledTimes(1);
  });
});
