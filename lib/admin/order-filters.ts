import { STATE_LABELS } from "./labels";

// The orders list's filters beside its tabs: how the order is paid, where its money stands, and
// when it was placed. They live in the address, so a filtered list can be bookmarked, and the tabs,
// paging and the CSV export keep them. Days are Pakistan days.

export const METHOD_OPTIONS = [
  { value: "cod", label: "Cash on delivery" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "in_person", label: "In person" },
] as const;
export type MethodFilter = (typeof METHOD_OPTIONS)[number]["value"];

export type PaidFilter = keyof typeof STATE_LABELS;
export const PAID_OPTIONS: { value: PaidFilter; label: string }[] = (["unpaid", "advance", "part", "with_courier", "paid"] as const).map((value) => ({
  value,
  label: STATE_LABELS[value],
}));

export const PLACED_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom dates" },
] as const;
export type PlacedFilter = (typeof PLACED_OPTIONS)[number]["value"];

// `from` is the first moment counted and `to` the first one after; a custom range keeps its days as typed.
export type OrderFilters = {
  method?: MethodFilter;
  paid?: PaidFilter;
  placed?: PlacedFilter;
  from?: Date;
  to?: Date;
  fromDay?: string;
  toDay?: string;
};

type Params = Record<string, string | string[] | undefined>;

const DAY = 86_400_000;
const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : undefined);
const startOf = (day: string) => new Date(`${day}T00:00:00+05:00`);
const karachiDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(date);
const isDay = (text: string | undefined): text is string => !!text && /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(startOf(text).getTime());
const daysBefore = (date: Date, days: number) => new Date(date.getTime() - days * DAY);

export function readOrderFilters(params: Params, now = new Date()): OrderFilters {
  const filters: OrderFilters = {};
  const method = METHOD_OPTIONS.find((option) => option.value === one(params.method));
  if (method) filters.method = method.value;
  const paid = PAID_OPTIONS.find((option) => option.value === one(params.paid));
  if (paid) filters.paid = paid.value;
  const placed = PLACED_OPTIONS.find((option) => option.value === one(params.placed))?.value;
  if (!placed) return filters;

  const today = startOf(karachiDay(now));
  const tomorrow = daysBefore(today, -1);
  const monthStart = startOf(`${karachiDay(now).slice(0, 7)}-01`);
  switch (placed) {
    case "today":
      return { ...filters, placed, from: today, to: tomorrow };
    case "yesterday":
      return { ...filters, placed, from: daysBefore(today, 1), to: today };
    case "7d":
      return { ...filters, placed, from: daysBefore(today, 6), to: tomorrow };
    case "30d":
      return { ...filters, placed, from: daysBefore(today, 29), to: tomorrow };
    case "month":
      return { ...filters, placed, from: monthStart, to: tomorrow };
    case "last_month":
      return { ...filters, placed, from: startOf(`${karachiDay(daysBefore(monthStart, 1)).slice(0, 7)}-01`), to: monthStart };
    case "custom": {
      let fromDay = one(params.from);
      let toDay = one(params.to);
      if (!isDay(fromDay)) fromDay = undefined;
      if (!isDay(toDay)) toDay = undefined;
      if (fromDay && toDay && fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
      return {
        ...filters,
        placed,
        ...(fromDay ? { from: startOf(fromDay), fromDay } : {}),
        ...(toDay ? { to: daysBefore(startOf(toDay), -1), toDay } : {}),
      };
    }
  }
}

// The filters as address parameters, to carry them onto a link.
export function filtersQuery(filters: OrderFilters) {
  const query = new URLSearchParams();
  if (filters.method) query.set("method", filters.method);
  if (filters.paid) query.set("paid", filters.paid);
  if (filters.placed) query.set("placed", filters.placed);
  if (filters.placed === "custom" && filters.fromDay) query.set("from", filters.fromDay);
  if (filters.placed === "custom" && filters.toDay) query.set("to", filters.toDay);
  return query;
}

export const hasFilters = (filters: OrderFilters) => Boolean(filters.method || filters.paid || filters.placed);
