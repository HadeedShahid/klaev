// The browser's half of a receipt upload (lib/receipt-upload-url.ts): ask the store for a signed
// link, send the file straight to storage, then tell the store it's there. Where the store can't
// sign links (local development) the file goes through the store instead. Any failure, a dropped
// connection included, comes back as a message rather than a thrown error that would break the page.
type Start = { status: "direct"; url: string; key: string; contentType: string } | { status: "through-store" } | { status: "error"; message: string };

export async function sendReceipt<Result>(
  file: File,
  steps: {
    start: () => Promise<Start>;
    finish: (key: string) => Promise<Result>;
    throughStore: () => Promise<Result>;
    failed: (message: string) => Result;
  },
): Promise<Result> {
  const FAILED = "That didn't upload. Try again, or send the screenshot on WhatsApp.";
  try {
    const start = await steps.start();
    if (start.status === "error") return steps.failed(start.message);
    if (start.status === "through-store") return await steps.throughStore();
    const sent = await fetch(start.url, { method: "PUT", headers: { "Content-Type": start.contentType }, body: file });
    if (!sent.ok) return steps.failed(FAILED);
    return await steps.finish(start.key);
  } catch {
    return steps.failed(FAILED);
  }
}
