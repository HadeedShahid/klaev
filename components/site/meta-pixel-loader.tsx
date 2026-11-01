"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { metaEvent } from "@/lib/meta-client";

let requested = false;

// Meta's script is heavy, so it waits until the page has finished and the phone is idle. Events
// queue in the small stub meanwhile. It never loads on an order page.
function loadPixel() {
  if (requested) return;
  requested = true;
  const add = () => {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  };
  // Safari has no requestIdleCallback.
  const idle = window.requestIdleCallback as typeof window.requestIdleCallback | undefined;
  const whenIdle = () => (idle ? idle(add, { timeout: 3000 }) : setTimeout(add, 1));
  if (document.readyState === "complete") whenIdle();
  else window.addEventListener("load", whenIdle, { once: true });
}

export function MetaPixelLoader() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/orders/")) return;
    loadPixel();
    metaEvent("PageView");
  }, [pathname]);

  // A tap on any WhatsApp link, wherever it is on the store.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.('a[href^="https://wa.me/"]')) metaEvent("Contact");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
