"use client";

import { Area, AreaChart, CartesianGrid, ReferenceArea, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatPKR } from "@/lib/money";


const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// "29 Sep" from 2026-09-29, the same in every browser.
const day = (date: string) => {
  const [, month, dayOfMonth] = date.split("-").map(Number);
  return `${dayOfMonth} ${MONTHS[month - 1] ?? ""}`;
};
// Axis labels kept short enough for the axis: 450k, 2.1M.
const thousands = (value: number) =>
  value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);

// One figure per day (sales, visitors) in Ink over a faint wash of the same. Today is still going,
// so its stretch of the line sits in a shaded band named "Today", and a low point there doesn't read
// as a collapse. Each point can carry a detail for its tooltip ("3 orders", "41 visits").
export function TrendChart({ data, label, money = false }: { data: { date: string; value: number; detail?: string }[]; label: string; money?: boolean }) {
  const today = data.at(-1)?.date;
  const yesterday = data.at(-2)?.date;
  const config = { value: { label, color: "var(--chart-1)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        {/* Drawn under the line (Recharts puts areas and reference areas on one layer otherwise), above the grid. */}
        {today && yesterday ? <ReferenceArea x1={yesterday} x2={today} fill="var(--muted)" fillOpacity={1} ifOverflow="hidden" zIndex={-50} /> : null}
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={(date: string) => (date === today ? "Today" : day(date))}
        />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={thousands} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => {
                const date = String(payload?.[0]?.payload?.date ?? "");
                return date === today ? "Today so far" : day(date);
              }}
              formatter={(value, _name, item) => (
                <div className="flex w-full justify-between gap-4">
                  <span className="text-muted-foreground">{item.payload.detail ?? label}</span>
                  <span className="font-medium tabular-nums">{money ? formatPKR(Number(value)) : Number(value).toLocaleString("en-PK")}</span>
                </div>
              )}
            />
          }
        />
        <Area dataKey="value" type="monotone" stroke="var(--color-value)" strokeWidth={1.5} fill="var(--color-value)" fillOpacity={0.06} />
      </AreaChart>
    </ChartContainer>
  );
}
