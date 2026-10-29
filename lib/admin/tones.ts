import type { STATE_LABELS } from "./labels";
import type { CourierStatus, OrderStatus } from "./orders";

// The admin's few colours, each with one meaning wherever it appears: amber waits on you, green is
// ready, settled or up, blue is on its way, violet is done, red is lost or down, and grey is nothing
// yet. Words always come with them, so colour is never the only sign. Tokens: app/globals.css.
export type Tone = "green" | "blue" | "violet" | "amber" | "red" | "grey";

const STATUS: Record<OrderStatus, Tone> = {
  pending: "amber",
  confirmed: "green",
  packed: "green",
  shipped: "blue",
  delivered: "violet",
  cancelled: "red",
  refused: "red",
};

// A shipped parcel in trouble changes colour: a failed attempt needs you, one coming back is going wrong.
export function statusTone(status: OrderStatus, courierStatus: CourierStatus | null = null): Tone {
  if (status === "shipped" && courierStatus === "attempted") return "amber";
  if (status === "shipped" && courierStatus === "returning") return "red";
  return STATUS[status];
}

const PAYMENT: Record<keyof typeof STATE_LABELS, Tone> = { paid: "green", with_courier: "blue", advance: "blue", part: "amber", unpaid: "grey" };

export const paymentTone = (state: keyof typeof STATE_LABELS) => PAYMENT[state];

// A figure against the period before. Every change the admin shows is better going up.
export const deltaTone = (delta: number): Tone => (delta > 0 ? "green" : delta < 0 ? "red" : "grey");

// A tone as a soft badge (tinted ground, coloured words) and as a dot.
export const TONE_BADGE: Record<Tone, string> = {
  green: "bg-tone-green-soft text-tone-green",
  blue: "bg-tone-blue-soft text-tone-blue",
  violet: "bg-tone-violet-soft text-tone-violet",
  amber: "bg-tone-amber-soft text-tone-amber",
  red: "bg-tone-red-soft text-tone-red",
  grey: "bg-muted text-muted-foreground",
};

export const TONE_DOT: Record<Tone, string> = {
  green: "bg-tone-green",
  blue: "bg-tone-blue",
  violet: "bg-tone-violet",
  amber: "bg-tone-amber",
  red: "bg-tone-red",
  grey: "bg-muted-foreground",
};
