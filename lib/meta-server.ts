import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies, headers } from "next/headers";
import { after } from "next/server";

import { VISITOR_COOKIE } from "./analytics";
import { getDb } from "./db";
import { siteOrigin } from "./email";
import { metaUser, postToMeta, type BrowserEvent, type MetaConnection } from "./meta";
import { getOrderByToken } from "./orders";
import { getMetaSettings } from "./settings";

type Secrets = { META_ACCESS_TOKEN?: string; META_TEST_EVENT_CODE?: string };

export async function metaTokenIsSet() {
  const { env } = await getCloudflareContext({ async: true });
  return Boolean((env as unknown as Secrets).META_ACCESS_TOKEN);
}

// Null unless Meta is switched on and the access token is set (a Worker secret, never in the repo).
async function connection(): Promise<MetaConnection | null> {
  const [{ env }, { enabled, pixelId }] = await Promise.all([getCloudflareContext({ async: true }), getMetaSettings()]);
  const { META_ACCESS_TOKEN: token, META_TEST_EVENT_CODE: testCode } = env as unknown as Secrets;
  return enabled && pixelId && token ? { pixelId, token, testCode } : null;
}

async function visitor() {
  const [store, request] = await Promise.all([cookies(), headers()]);
  return {
    host: request.get("host"),
    who: {
      address: request.get("cf-connecting-ip"),
      userAgent: request.get("user-agent"),
      fbp: store.get("_fbp")?.value,
      fbc: store.get("_fbc")?.value,
      visitorId: store.get(VISITOR_COOKIE)?.value,
    },
  };
}

const now = () => Math.floor(Date.now() / 1000);

// An event from the browser (app/api/m/route.ts), sent after the response. Nothing here fails a page.
export async function trackMeta(event: BrowserEvent) {
  try {
    const meta = await connection();
    if (!meta) return;
    const { who } = await visitor();
    const time = now();
    after(async () => {
      await postToMeta(meta, [
        {
          event_name: event.name,
          event_time: time,
          event_id: event.id,
          event_source_url: event.url,
          action_source: "website",
          user_data: await metaUser(who),
          ...(Object.keys(event.custom).length ? { custom_data: event.custom } : {}),
        },
      ]);
    });
  } catch (error) {
    console.error("Meta event skipped:", error instanceof Error ? error.message : "unknown error");
  }
}

// A placed order, from the server only: the browser never runs on an order page, whose address is
// the customer's private link, so this names the checkout as the page it came from. The order number
// makes the ID, so Meta counts it once however it's sent.
export async function trackPurchase(token: string) {
  try {
    const meta = await connection();
    if (!meta) return;
    const [{ who, host }, db] = await Promise.all([visitor(), getDb()]);
    const time = now();
    after(async () => {
      const order = await getOrderByToken(db, token);
      if (!order) return;
      const contents = order.lines.map((line) => ({ id: String(line.variantId ?? line.sku ?? line.title), quantity: line.quantity, item_price: line.unitPrice }));
      await postToMeta(meta, [
        {
          event_name: "Purchase",
          event_time: time,
          event_id: `purchase-${order.number}`,
          event_source_url: `${siteOrigin(host)}/checkout`,
          action_source: "website",
          user_data: await metaUser({ ...who, email: order.email, phone: order.phone, name: order.name, city: order.city }),
          custom_data: {
            currency: "PKR",
            value: order.total,
            order_id: String(order.number),
            content_type: "product",
            content_ids: contents.map((item) => item.id),
            contents,
            num_items: contents.reduce((sum, item) => sum + item.quantity, 0),
          },
        },
      ]);
    });
  } catch (error) {
    console.error("Meta purchase skipped:", error instanceof Error ? error.message : "unknown error");
  }
}
