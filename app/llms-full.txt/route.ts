import { llmsFullTxt } from "@/lib/llms";
import { storeFacts } from "@/lib/store-facts";

// The store in full for AI tools: every jacket, size chart, policy and answer (lib/llms.ts). Read
// on every request, like the sitemap.
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(llmsFullTxt(await storeFacts()), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
