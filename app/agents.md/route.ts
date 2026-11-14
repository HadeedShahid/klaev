import { agentsMd } from "@/lib/llms";
import { storeFacts } from "@/lib/store-facts";

// How an AI agent can help someone order (lib/llms.ts). Read on every request, so the terms it
// gives are the ones checkout charges.
export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(agentsMd(await storeFacts()), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
