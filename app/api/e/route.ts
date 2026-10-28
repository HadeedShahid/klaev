import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies } from "next/headers";

import { isBot } from "@/lib/analytics-source";
import { locate, recordView, SESSION_COOKIE, VISITOR_COOKIE } from "@/lib/analytics";
import { getDb } from "@/lib/db";

const done = () => new Response(null, { status: 204 });

// The tracker's page views (components/site/tracker.tsx). Always answers 204: the page never
// waits on it, and a refused view isn't worth telling the browser about.
export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent");
  if (isBot(userAgent)) return done();
  const address = request.headers.get("cf-connecting-ip");
  if (address) {
    const { env } = await getCloudflareContext({ async: true });
    if (!(await env.EVENTS_LIMITER.limit({ key: `events:${address}` })).success) return done();
  }
  const text = await request.text();
  if (text.length > 2048) return done();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return done();
  }
  const store = await cookies();
  const str = (value: unknown) => (typeof value === "string" ? value : null);
  try {
    await recordView(await getDb(), {
      path: str(body.path) ?? "",
      entry: body.entry === true,
      referrer: str(body.referrer),
      utmSource: str(body.utmSource),
      utmCampaign: str(body.utmCampaign),
      gclid: body.gclid === true,
      fbclid: body.fbclid === true,
      visitorId: store.get(VISITOR_COOKIE)?.value ?? str(body.visitorId) ?? "",
      sessionId: store.get(SESSION_COOKIE)?.value ?? str(body.sessionId) ?? "",
      userAgent,
      ownHost: new URL(request.url).hostname.replace(/^www\./, ""),
      where: await locate(userAgent),
    });
  } catch (error) {
    console.error("analytics: couldn't record a view", error);
  }
  return done();
}
