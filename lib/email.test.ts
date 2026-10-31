// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { sendEmail, siteOrigin } from "./email";

const message = { to: "ayesha@example.com", subject: "Order #1023 is in", html: "<p>Hello</p>", text: "Hello" };

describe("sendEmail", () => {
  it("sends from the store, with replies going to the store's inbox", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "1" });
    expect(await sendEmail({ send }, message)).toBe(true);
    expect(send).toHaveBeenCalledWith({
      from: { name: "Klaev", email: "orders@klaev.com" },
      replyTo: "business.klaev@gmail.com",
      ...message,
    });
  });

  it("lets a reply go somewhere else when asked", async () => {
    const send = vi.fn().mockResolvedValue({ messageId: "1" });
    await sendEmail({ send }, { ...message, replyTo: "sara@example.com" });
    expect(send.mock.calls[0][0].replyTo).toBe("sara@example.com");
  });

  it("never throws: a failed email is logged, not passed on to whatever triggered it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn().mockRejectedValue(new Error("Domain not verified"));
    expect(await sendEmail({ send }, message)).toBe(false);
    expect(log.mock.calls[0].join(" ")).toContain("Order #1023 is in");
    expect(log.mock.calls[0].join(" ")).not.toContain("ayesha@example.com");
    log.mockRestore();
  });
});

describe("siteOrigin", () => {
  it("links to the preview from the preview, and to the real store from anywhere else", () => {
    expect(siteOrigin("klaev.hadeed-shahid08.workers.dev")).toBe("https://klaev.hadeed-shahid08.workers.dev");
    expect(siteOrigin("klaev.com")).toBe("https://klaev.com");
    expect(siteOrigin("www.klaev.com")).toBe("https://klaev.com");
    expect(siteOrigin("evil.example")).toBe("https://klaev.com");
    expect(siteOrigin(null)).toBe("https://klaev.com");
  });
});
