"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { readCartCount } from "@/lib/cart-codec";
import { FLAGS } from "@/lib/flags";

const CART_EVENT = "klaev:cart";
export const OPEN_CART_EVENT = "klaev:open-cart";

// Tells the header to re-read the count cookie after the cart changes.
export function notifyCartChanged() {
  window.dispatchEvent(new Event(CART_EVENT));
}

// Opens the cart drawer (components/site/cart-drawer.tsx). Focus returns to `trigger` when it closes.
export function openCartDrawer(trigger: HTMLElement | null) {
  window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT, { detail: { trigger } }));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CART_EVENT, onChange);
  window.addEventListener("pageshow", onChange);
  return () => {
    window.removeEventListener(CART_EVENT, onChange);
    window.removeEventListener("pageshow", onChange);
  };
}

function itemsLabel(count: number) {
  return `Cart, ${count} ${count === 1 ? "item" : "items"}`;
}

// The count is read in the browser from a cookie the server keeps in sync, so the header
// never makes a page dynamic. Prerendered HTML shows the plain cart icon until hydration.
export function CartLink() {
  const count = useSyncExternalStore(
    subscribe,
    () => readCartCount(document.cookie),
    () => null,
  );

  return (
    <Link
      href="/cart"
      onClick={(event) => {
        if (!FLAGS.cartDrawer) return;
        event.preventDefault();
        openCartDrawer(event.currentTarget);
      }}
      aria-label={count === null ? "Cart" : itemsLabel(count)}
      className="relative -mr-2 flex size-11 items-center justify-center rounded-full transition-colors hover:bg-accent"
    >
      <ShoppingBag className="size-5.5" strokeWidth={1.6} aria-hidden />
      {count ? (
        <span className="absolute top-1.5 right-1 flex min-w-4.5 items-center justify-center rounded-full bg-foreground px-1 text-[0.6875rem] leading-4.5 font-semibold text-background tabular-nums">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

// Rendered by pages that change the cart on the server (the cart page), so the header catches up.
export function CartCountSync({ count }: { count: number }) {
  useEffect(() => {
    notifyCartChanged();
  }, [count]);
  return null;
}
