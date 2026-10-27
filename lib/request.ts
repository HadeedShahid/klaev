import "server-only";

import { headers } from "next/headers";

// Plain-http local addresses: the dev server and the local Cloudflare preview. Cookies are Secure
// everywhere else; on these, Safari would drop a Secure cookie.
export async function isLocalRequest() {
  const host = (await headers()).get("host") ?? "";
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
}
