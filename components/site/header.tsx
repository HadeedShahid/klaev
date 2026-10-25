import Link from "next/link";

import { CartLink } from "./cart-link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background [view-transition-name:site-header]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="text-[1.0625rem] font-semibold tracking-[0.28em] uppercase">
          Klaev
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Link
            href="/collections/all"
            className="flex h-11 items-center rounded-full px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Shop
          </Link>
          <CartLink />
        </nav>
      </div>
    </header>
  );
}
