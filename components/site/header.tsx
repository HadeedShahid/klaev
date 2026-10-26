import Link from "next/link";

import { CartLink } from "./cart-link";

// Full-width glass (the `glass` utility in globals.css) with a faint hairline to seat it. Shop on the
// left in ink, so it holds its contrast over dark leather beneath; the wordmark centred; the cart on
// the right. 48px tall on phones, 52px from tablets up.
export function SiteHeader() {
  return (
    <header className="glass sticky top-0 z-40 border-b border-foreground/8 [view-transition-name:site-header]">
      <div className="mx-auto grid h-12 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-5 md:h-13 md:px-8">
        <nav aria-label="Main" className="-ml-3 flex items-center justify-self-start">
          <Link
            href="/collections/all"
            className="flex h-11 items-center rounded-full px-3 text-sm transition-colors hover:bg-accent"
          >
            Shop
          </Link>
        </nav>
        {/* The left padding balances the letter spacing after the V, so the word sits on the true centre. */}
        <Link href="/" className="pl-[0.28em] text-[1.0625rem] font-semibold tracking-[0.28em] uppercase">
          Klaev
        </Link>
        <div className="justify-self-end">
          <CartLink />
        </div>
      </div>
    </header>
  );
}
