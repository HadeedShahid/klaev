import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// The change from the period before, in whole percent; none when there was nothing before.
export function change(current: number, previous: number) {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

// A figure on the dashboard and in Analytics: what it is, the number, and a line on it.
export function Kpi({ label, value, delta, note }: { label: string; value: string; delta?: number | null; note: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
        {delta !== undefined && delta !== null ? (
          <CardAction>
            <Badge variant="outline" className="tabular-nums">
              {delta >= 0 ? <TrendingUp strokeWidth={2} aria-hidden /> : <TrendingDown strokeWidth={2} aria-hidden />}
              {delta > 0 ? "+" : ""}
              {delta}%
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{note}</CardContent>
    </Card>
  );
}
