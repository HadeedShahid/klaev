import "server-only";

import { AwsClient } from "aws4fetch";

// Receipts go from the browser straight to the private klaev-receipts bucket, through a link the
// store signs. Cloudflare's security filter reads what passes through the site, and the bytes of an
// ordinary screenshot can look like an attack to it by chance (a 403 "Attention Required!" before
// the store sees it). R2's own address isn't behind that filter, and the file is stored as sent.
//
// The link needs an R2 API token for that bucket alone: R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY
// are Worker secrets, R2_ACCOUNT_ID is in wrangler.jsonc. Without them (local development) receipts
// go through the store instead.
type Secrets = { R2_ACCESS_KEY_ID?: string; R2_SECRET_ACCESS_KEY?: string; R2_ACCOUNT_ID?: string };

const BUCKET = "klaev-receipts";
const LIFETIME_SECONDS = 300;

export function canSignReceiptUploads(env: object) {
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID } = env as Secrets;
  return Boolean(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ACCOUNT_ID);
}

// A PUT link for one key, good for five minutes. The content type is part of the signature, so the
// browser must send the type the store checked.
export async function receiptUploadUrl(env: object, key: string, contentType: string) {
  const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID } = env as Required<Secrets>;
  const client = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });
  const url = new URL(`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(LIFETIME_SECONDS));
  const signed = await client.sign(new Request(url, { method: "PUT", headers: { "Content-Type": contentType } }), {
    aws: { signQuery: true, allHeaders: true },
  });
  return signed.url;
}
