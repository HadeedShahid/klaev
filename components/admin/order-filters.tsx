"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { METHOD_OPTIONS, PAID_OPTIONS, PLACED_OPTIONS } from "@/lib/admin/order-filters";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

type Values = { method?: string; paid?: string; placed?: string; fromDay?: string; toDay?: string };

const ANY = "any";

// One filter: "Any …" until something is chosen, then the choice, outlined in Ink so a filtered
// list never passes for the whole one.
function FilterSelect({
  label,
  any,
  options,
  value,
  onChange,
}: {
  label: string;
  any: string;
  options: readonly { value: string; label: string }[];
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const items = [{ value: ANY, label: any }, ...options];
  return (
    <Select items={items} value={value ?? ANY} onValueChange={(next) => onChange(next && next !== ANY ? String(next) : undefined)}>
      <SelectTrigger aria-label={label} className={cn("h-8 min-w-36 bg-background", value ? "border-foreground/60 font-medium" : "text-muted-foreground")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// The filters beside the order tabs. Each choice goes straight into the address, which the page
// reads (lib/admin/order-filters.ts), keeping the tab and search and starting from the first page.
export function OrderFilters({ base, values }: { base: string; values: Values }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (next: Values) => {
    const query = new URLSearchParams(base);
    if (next.method) query.set("method", next.method);
    if (next.paid) query.set("paid", next.paid);
    if (next.placed) query.set("placed", next.placed);
    if (next.placed === "custom" && next.fromDay) query.set("from", next.fromDay);
    if (next.placed === "custom" && next.toDay) query.set("to", next.toDay);
    const text = query.toString();
    startTransition(() => router.push(`/admin/orders${text ? `?${text}` : ""}`));
  };

  return (
    <div role="group" aria-label="Filters" aria-busy={pending} className="flex flex-wrap items-center gap-2">
      <FilterSelect label="Payment method" any="Any payment method" options={METHOD_OPTIONS} value={values.method} onChange={(method) => go({ ...values, method })} />
      <FilterSelect label="Payment status" any="Any payment status" options={PAID_OPTIONS} value={values.paid} onChange={(paid) => go({ ...values, paid })} />
      <FilterSelect label="Placed" any="Any date" options={PLACED_OPTIONS} value={values.placed} onChange={(placed) => go({ ...values, placed })} />
      {values.placed === "custom" ? (
        <>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            From
            <input
              type="date"
              defaultValue={values.fromDay}
              max={values.toDay}
              onChange={(event) => go({ ...values, fromDay: event.target.value || undefined })}
              className={cn(adminField, "h-8 w-auto rounded-lg px-2.5")}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            To
            <input
              type="date"
              defaultValue={values.toDay}
              min={values.fromDay}
              onChange={(event) => go({ ...values, toDay: event.target.value || undefined })}
              className={cn(adminField, "h-8 w-auto rounded-lg px-2.5")}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
