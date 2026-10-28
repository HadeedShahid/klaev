// Where a visit came from, what it came on, and whether it's a person at all, from what the
// browser sends. Shared by the tracker's endpoint and the tests.

export const SOURCES = ["instagram", "facebook", "tiktok", "google", "whatsapp", "youtube", "direct", "other"] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  google: "Google",
  whatsapp: "WhatsApp",
  youtube: "YouTube",
  direct: "Direct",
  other: "Other sites",
};

const NAMED: [RegExp, Source][] = [
  [/^(ig|insta|instagram)/, "instagram"],
  [/^(fb|facebook|meta)/, "facebook"],
  [/^(tiktok|tt)/, "tiktok"],
  [/^(google|adwords|gads)/, "google"],
  [/^(whatsapp|wa)$/, "whatsapp"],
  [/^(youtube|yt)/, "youtube"],
];

const HOSTS: [RegExp, Source][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "facebook"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube"],
];

// A tagged link (utm_source) wins, then an ad click id, then the in-app browser it opened in, then
// the page that linked here. A visit from the store's own pages, or with no referrer, is direct.
export function classifySource(input: { utmSource?: string | null; referrer?: string | null; userAgent?: string | null; gclid?: boolean; fbclid?: boolean; ownHost?: string }): {
  source: Source;
  referrer: string | null;
} {
  const tagged = input.utmSource?.trim().toLowerCase();
  let host: string | null = null;
  try {
    host = input.referrer ? new URL(input.referrer).hostname.replace(/^www\./, "") : null;
  } catch {
    host = null;
  }
  if (host && input.ownHost && (host === input.ownHost || host.endsWith(`.${input.ownHost}`))) host = null;
  if (tagged) return { source: NAMED.find(([pattern]) => pattern.test(tagged))?.[1] ?? "other", referrer: host };
  if (input.gclid) return { source: "google", referrer: host };
  const agent = input.userAgent ?? "";
  if (/Instagram/.test(agent)) return { source: "instagram", referrer: host };
  if (/FBAN|FBAV|FB_IAB/.test(agent)) return { source: "facebook", referrer: host };
  if (/musical_ly|TikTok|BytedanceWebview/.test(agent)) return { source: "tiktok", referrer: host };
  if (input.fbclid) return { source: "facebook", referrer: host };
  if (!host) return { source: "direct", referrer: null };
  return { source: HOSTS.find(([pattern]) => pattern.test(host))?.[1] ?? "other", referrer: host };
}

export function deviceOf(userAgent: string | null): "phone" | "tablet" | "desktop" {
  const agent = userAgent ?? "";
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(agent)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Opera Mini|IEMobile/i.test(agent)) return "phone";
  return "desktop";
}

// Crawlers, link previews and page-speed checkers. They aren't visitors.
export function isBot(userAgent: string | null) {
  return !userAgent || /bot|crawl|spider|slurp|facebookexternalhit|WhatsApp\/|Lighthouse|PageSpeed|Google-InspectionTool|bingpreview|preview/i.test(userAgent);
}
