// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePath, after, context } = vi.hoisted(() => ({ revalidatePath: vi.fn(), after: vi.fn(), context: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/server", () => ({ after }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));

const { refreshStore } = await import("./refresh-store");
const { STORE_TAG } = await import("./edge-cache");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("refreshStore", () => {
  it("renders every store page again on its next visit", async () => {
    context.mockResolvedValue({ ctx: {} });
    await refreshStore();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("purges Workers Cache's copies once the response has gone out and the revalidation is recorded", async () => {
    const purge = vi.fn().mockResolvedValue({ success: true, errors: [] });
    context.mockResolvedValue({ ctx: { cache: { purge } } });
    await refreshStore();
    expect(after).toHaveBeenCalledTimes(1);

    const task = after.mock.calls[0][0]() as Promise<void>;
    await vi.advanceTimersByTimeAsync(1999);
    expect(purge).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await task;
    expect(purge).toHaveBeenCalledWith({ tags: [STORE_TAG] });
  });

  it("logs a purge that fails, since the pages then stay cached until the day is up", async () => {
    const errors = [{ code: 429, message: "Rate limited" }];
    const purge = vi.fn().mockResolvedValue({ success: false, errors });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    context.mockResolvedValue({ ctx: { cache: { purge } } });
    await refreshStore();
    const task = after.mock.calls[0][0]() as Promise<void>;
    await vi.advanceTimersByTimeAsync(2000);
    await task;
    expect(log).toHaveBeenCalledWith("Workers Cache purge failed", errors);
    log.mockRestore();
  });

  it("does nothing more where there is no Workers Cache (next dev, the local preview)", async () => {
    context.mockResolvedValue({ ctx: {} });
    await refreshStore();
    expect(after).not.toHaveBeenCalled();
  });
});
