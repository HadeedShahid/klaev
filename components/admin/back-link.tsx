"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

// Works like the browser's back button: the page you came from, as you left it (filters, scroll).
// Opened fresh in a new tab, with nowhere to go back to, it follows href instead.
export function BackLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      className={className}
      onClick={(event) => {
        // A Cmd or Ctrl click still opens href in a new tab, like any link.
        if (event.metaKey || event.ctrlKey || event.shiftKey || window.history.length <= 1) return;
        event.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
