import { TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { LAPSED_DAYS } from "@/lib/admin/customers";

type Stats = { orders: number; refused: number; lastOrderAt: Date | null };

// Who a customer is to the store, in Shopify's segment words. A refusal is the one that needs you,
// so it alone is Ink: a COD order from them is a risk worth a call first.
export function CustomerBadges({ stats, now = new Date() }: { stats: Stats; now?: Date }) {
  const lapsed = stats.orders > 0 && stats.lastOrderAt !== null && now.getTime() - stats.lastOrderAt.getTime() > LAPSED_DAYS * 86_400_000;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {stats.refused > 0 ? (
        <Badge variant="default">
          <TriangleAlert strokeWidth={2} aria-hidden />
          Refused {stats.refused === 1 ? "a delivery" : `${stats.refused} deliveries`}
        </Badge>
      ) : null}
      {stats.orders >= 2 ? <Badge variant="secondary">Repeat</Badge> : stats.orders === 1 ? <Badge variant="outline">First-time</Badge> : null}
      {lapsed ? (
        <Badge variant="outline" className="text-muted-foreground">
          Lapsed
        </Badge>
      ) : null}
      {stats.orders === 0 ? (
        <Badge variant="outline" className="text-muted-foreground">
          No orders
        </Badge>
      ) : null}
    </span>
  );
}
