import Link from "next/link";

import { PERIODS, type Period } from "@/lib/admin/period";
import { cn } from "@/lib/utils";

// The 7, 30 and 90 days switch in a page's header. `href` builds each period's link.
export function PeriodControl({ days, href }: { days: Period; href: (days: Period) => string }) {
  return (
    <nav aria-label="Period" className="inline-flex rounded-lg bg-muted p-0.5 text-sm">
      {PERIODS.map((period) => (
        <Link
          key={period}
          href={href(period)}
          aria-current={period === days ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 text-muted-foreground transition-colors hover:text-foreground",
            period === days && "bg-background font-medium text-foreground ring-1 ring-foreground/10",
          )}
        >
          {period} days
        </Link>
      ))}
    </nav>
  );
}
