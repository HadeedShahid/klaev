import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies, headers } from "next/headers";

import { classifySource, deviceOf, isBot } from "./analytics-source";
import { getDb, type Db } from "./db";
import { events } from "./db/schema";

// The tracker's cookies (components/site/tracker.tsx): a visitor kept a year, a session kept for
// 30 minutes after its last page. Both are random, and say nothing about the person.
export const VISITOR_COOKIE = "klaev_vid";
export const SESSION_COOKIE = "klaev_sid";
const ID = /^[a-z0-9]{12,40}$/;

type Where = { device: "phone" | "tablet" | "desktop"; country: string | null; city: string | null };

// The device from the browser, and the city and country Cloudflare reads from the connection.
export async function locate(userAgent: string | null): Promise<Where> {
  let cf: { city?: string; country?: string } | undefined;
  try {
    cf = (await getCloudflareContext({ async: true })).cf as typeof cf;
  } catch {
    cf = undefined;
  }
  return { device: deviceOf(userAgent), country: cf?.country ?? null, city: cf?.city ?? null };
}

export type ViewInput = {
  path: string;
  entry: boolean;
  referrer?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  gclid?: boolean;
  fbclid?: boolean;
};

// A page view from the tracker. The first page of a session says where the visit came from.
export async function recordView(
  db: Db,
  input: ViewInput & { visitorId: string; sessionId: string; userAgent: string | null; ownHost: string; where: Where },
) {
  // An order's page address is its secret link, so every one is counted as the same page.
  const path = input.path
    .split(/[?#]/)[0]
    .replace(/^\/orders\/[^/]+$/, "/orders/order")
    .slice(0, 300);
  if (!path.startsWith("/") || !ID.test(input.visitorId) || !ID.test(input.sessionId)) return;
  const origin = input.entry
    ? classifySource({ utmSource: input.utmSource, referrer: input.referrer, userAgent: input.userAgent, gclid: input.gclid, fbclid: input.fbclid, ownHost: input.ownHost })
    : null;
  await db.insert(events).values({
    type: "view",
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    entry: input.entry,
    path,
    productHandle: path.match(/^\/products\/([a-z0-9-]+)$/)?.[1] ?? null,
    source: origin?.source ?? null,
    referrer: origin?.referrer?.slice(0, 120) ?? null,
    campaign: input.entry ? input.utmCampaign?.trim().slice(0, 100) || null : null,
    ...input.where,
  });
}

// A cart or an order, recorded by the server action that made it, under the shopper's tracker
// cookies. Without them (cookies blocked, a bot) nothing is recorded. Analytics never fails a sale.
export async function recordServerEvent(type: "cart" | "order", extra: { productHandle?: string; orderNumber?: number; path?: string }) {
  try {
    const [store, request] = await Promise.all([cookies(), headers()]);
    const visitorId = store.get(VISITOR_COOKIE)?.value ?? "";
    const sessionId = store.get(SESSION_COOKIE)?.value ?? "";
    const userAgent = request.get("user-agent");
    if (!ID.test(visitorId) || !ID.test(sessionId) || isBot(userAgent)) return;
    const db = await getDb();
    await db.insert(events).values({
      type,
      visitorId,
      sessionId,
      path: extra.path ?? "",
      productHandle: extra.productHandle ?? null,
      orderNumber: extra.orderNumber ?? null,
      ...(await locate(userAgent)),
    });
  } catch (error) {
    console.error("analytics: couldn't record", type, error);
  }
}

