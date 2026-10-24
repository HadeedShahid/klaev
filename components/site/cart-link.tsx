import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { getCartView } from "@/lib/cart";

function itemsLabel(count: number) {
  return `Cart, ${count} ${count === 1 ? "item" : "items"}`;
}

export function CartLinkShell({ count }: { count: number | null }) {
  return (
    <Link
      href="/cart"
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

// Reads the cart cookie, so it always renders behind a Suspense boundary.
export async function CartLink() {
  const { count } = await getCartView();
  return <CartLinkShell count={count} />;
}
