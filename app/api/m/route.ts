import { getCloudflareContext } from "@opennextjs/cloudflare";

import { isBot } from "@/lib/analytics-source";
import { parseBrowserEvent } from "@/lib/meta";
import { trackMeta } from "@/lib/meta-server";

const done = () => new Response(null, { status: 204 });

// Events from the browser (lib/meta-client.ts), passed on to Meta. Always answers 204: the page
// never waits on it. Only sent at all while Meta is switched on.
export async function POST(request: Request) {
  if (isBot(request.headers.get("user-agent"))) return done();
  const address = request.headers.get("cf-connecting-ip");
  if (address) {
    const { env } = await getCloudflareContext({ async: true });
    if (!(await env.EVENTS_LIMITER.limit({ key: `meta:${address}` })).success) return done();
  }
  const text = await request.text();
  if (text.length > 2048) return done();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return done();
  }
  const event = parseBrowserEvent(body);
  if (event) await trackMeta(event);
  return done();
}
