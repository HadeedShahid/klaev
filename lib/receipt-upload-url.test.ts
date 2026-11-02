// @vitest-environment node
import { describe, expect, test } from "vitest";

import { canSignReceiptUploads, receiptUploadUrl } from "./receipt-upload-url";

const env = { R2_ACCESS_KEY_ID: "test-key-id", R2_SECRET_ACCESS_KEY: "test-secret", R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef" };

describe("signed links for receipts", () => {
  test("need the token and the account, so local development sends receipts through the store", () => {
    expect(canSignReceiptUploads(env)).toBe(true);
    expect(canSignReceiptUploads({ R2_ACCOUNT_ID: env.R2_ACCOUNT_ID })).toBe(false);
  });

  test("put one key in the receipts bucket, for five minutes, with its type signed", async () => {
    const url = new URL(await receiptUploadUrl(env, "orders/1026/1793609248779-e2e8616c.png", "image/png"));
    expect(url.host).toBe("0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com");
    expect(url.pathname).toBe("/klaev-receipts/orders/1026/1793609248779-e2e8616c.png");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe("content-type;host");
    expect(url.searchParams.get("X-Amz-Credential")).toMatch(/^test-key-id\/\d{8}\/auto\/s3\/aws4_request$/);
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });
});
