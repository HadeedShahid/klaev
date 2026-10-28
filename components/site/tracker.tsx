"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const VISITOR = "klaev_vid";
const SESSION = "klaev_sid";
const YEAR = 60 * 60 * 24 * 365;
// A session ends after 30 minutes without a page.
const SESSION_SECONDS = 30 * 60;

const read = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([a-z0-9]+)`))?.[1] ?? null;
const write = (name: string, value: string, seconds: number) => {
  document.cookie = `${name}=${value}; Max-Age=${seconds}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
};
const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(36).padStart(2, "0")).join("");

// The store's own page counter: one small beacon per page, to /api/e, after the page has shown.
// The first page of a session also says where the visit came from. No other script is loaded.
export function Tracker() {
  const pathname = usePathname();
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === pathname) return;
    sent.current = pathname;
    try {
      const visitorId = read(VISITOR) ?? randomId();
      const existing = read(SESSION);
      const sessionId = existing ?? randomId();
      write(VISITOR, visitorId, YEAR);
      write(SESSION, sessionId, SESSION_SECONDS);
      const params = new URLSearchParams(location.search);
      const entry = existing === null;
      const body = JSON.stringify({
        path: location.pathname,
        entry,
        visitorId,
        sessionId,
        ...(entry
          ? {
              referrer: document.referrer || null,
              utmSource: params.get("utm_source"),
              utmCampaign: params.get("utm_campaign"),
              gclid: params.has("gclid"),
              fbclid: params.has("fbclid"),
            }
          : {}),
      });
      if (!navigator.sendBeacon?.("/api/e", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/e", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
      }
    } catch {
      // Counting a page never gets in the way of showing it.
    }
  }, [pathname]);
  return null;
}
