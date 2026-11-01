import type { BrowserEventName, MetaData } from "./meta";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { disablePushState?: boolean };
  }
}

const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(36).padStart(2, "0")).join("");

// One event, from the moment it really happened: to the pixel, and to /api/m for the Worker to send
// on, under one ID so Meta counts it once. fbq only exists while Meta is switched on, and an order
// page is skipped because its address is the customer's private link.
export function metaEvent(name: BrowserEventName, data?: MetaData) {
  if (typeof window.fbq !== "function" || location.pathname.startsWith("/orders/")) return;
  try {
    const id = randomId();
    window.fbq("track", name, data?.value === undefined ? { ...data } : { ...data, currency: "PKR" }, { eventID: id });
    const body = JSON.stringify({ name, id, url: `${location.origin}${location.pathname}`, data });
    if (!navigator.sendBeacon?.("/api/m", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/m", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // Telling Meta never gets in the way of the page.
  }
}
