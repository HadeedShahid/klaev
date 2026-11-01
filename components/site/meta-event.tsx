"use client";

import { useEffect, useRef } from "react";

import type { BrowserEventName, MetaData } from "@/lib/meta";
import { metaEvent } from "@/lib/meta-client";

// Reports one Meta event when a page opens, for server-rendered pages: a product, the checkout.
export function MetaEvent({ name, data }: { name: BrowserEventName; data: MetaData }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    metaEvent(name, data);
  }, [name, data]);
  return null;
}
