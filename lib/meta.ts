// Meta's Conversions API: events sent from the Worker straight to Meta, so an ad blocker or a closed
// tab can't lose them. lib/meta-server.ts sends them; components/site/meta-pixel.tsx is the browser
// half. What a customer typed is hashed here before it leaves, as Meta requires.
export const META_API = "https://graph.facebook.com/v26.0";

const BROWSER_EVENTS = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "AddPaymentInfo", "Contact"] as const;
export type BrowserEventName = (typeof BROWSER_EVENTS)[number];

export type MetaData = {
  value?: number;
  content_ids?: string[];
  content_type?: "product" | "product_group";
  content_name?: string;
  num_items?: number;
};
export type MetaCustom = MetaData & { currency?: "PKR" };
export type BrowserEvent = { name: BrowserEventName; id: string; url: string; custom: MetaCustom };

export type MetaConnection = { pixelId: string; token: string; testCode?: string };
export type MetaServerEvent = {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: "website";
  user_data: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
};

export const validPixelId = (value: string) => /^\d{6,20}$/.test(value);

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

type Who = {
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  city?: string | null;
  visitorId?: string | null;
  address?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

// Who an event is about, in the forms Meta matches on. Klaev sells in Pakistan only.
export async function metaUser({ email, phone, name, city, visitorId, address, userAgent, fbp, fbc }: Who) {
  const [first, ...rest] = name?.trim().toLowerCase().split(/\s+/) ?? [];
  const hashed: [string, string | null | undefined][] = [
    ["em", email?.trim().toLowerCase()],
    ["ph", phone?.replace(/\D/g, "")],
    ["fn", first],
    ["ln", rest.join(" ")],
    ["ct", city?.toLowerCase().replace(/[^a-z]/g, "")],
    ["country", "pk"],
    ["external_id", visitorId],
  ];
  const fields = await Promise.all(hashed.filter(([, value]) => value).map(async ([key, value]) => [key, [await sha256(value as string)]]));
  const plain = { client_ip_address: address, client_user_agent: userAgent, fbp, fbc };
  return { ...Object.fromEntries(fields), ...Object.fromEntries(Object.entries(plain).filter(([, value]) => value)) } as Record<string, unknown>;
}

// Never throws: whatever an event reports has already happened. The token goes in the body, so it
// never lands in a log of addresses.
export async function postToMeta({ pixelId, token, testCode }: MetaConnection, data: MetaServerEvent[]) {
  try {
    const response = await fetch(`${META_API}/${pixelId}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data, access_token: token, ...(testCode ? { test_event_code: testCode } : {}) }),
    });
    if (response.ok) return true;
    const refusal = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    console.error("Meta refused events:", refusal?.error?.message ?? response.status);
  } catch (error) {
    console.error("Meta events failed:", error instanceof Error ? error.message : "unknown error");
  }
  return false;
}

const count = (value: unknown) => (Number.isSafeInteger(value) && (value as number) >= 0 ? (value as number) : undefined);

// What /api/m will pass on from a browser. Purchase is left out on purpose: it comes only from the
// server, once the order is saved. So is any order page, because its address is the customer's
// private link. Anything else unknown is dropped.
export function parseBrowserEvent(input: unknown): BrowserEvent | null {
  if (typeof input !== "object" || input === null) return null;
  const { name, id, url, data } = input as Record<string, unknown>;
  if (!BROWSER_EVENTS.includes(name as BrowserEventName)) return null;
  if (typeof id !== "string" || !/^[a-z0-9]{8,40}$/.test(id)) return null;
  let page: URL;
  try {
    page = new URL(String(url));
  } catch {
    return null;
  }
  if (!/^https?:$/.test(page.protocol) || page.pathname.startsWith("/orders/")) return null;

  const raw = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  const value = count(raw.value);
  const ids = Array.isArray(raw.content_ids) ? raw.content_ids.filter((item): item is string => typeof item === "string" && item.length <= 64).slice(0, 30) : [];
  const custom: MetaCustom = {
    ...(value === undefined ? {} : { value, currency: "PKR" as const }),
    ...(ids.length ? { content_ids: ids } : {}),
    ...(raw.content_type === "product" || raw.content_type === "product_group" ? { content_type: raw.content_type } : {}),
    ...(typeof raw.content_name === "string" ? { content_name: raw.content_name.slice(0, 150) } : {}),
    ...(count(raw.num_items) === undefined ? {} : { num_items: count(raw.num_items) }),
  };
  return { name: name as BrowserEventName, id, url: `${page.origin}${page.pathname}`, custom };
}
