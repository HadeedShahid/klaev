import { llmsTxt } from "@/lib/llms";
import { storeFacts } from "@/lib/store-facts";

// The store for AI tools, in the llmstxt.org layout (lib/llms.ts). Read on every request, like the
// sitemap, so a price or a sold-out size shows at once.
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(llmsTxt(await storeFacts()), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
