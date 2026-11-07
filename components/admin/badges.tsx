import { Check, FileCheck, Truck } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { COURIER_LABELS, STATE_LABELS, STATUS_LABELS } from "@/lib/admin/labels";
import type { CourierStatus, OrderStatus, paymentState } from "@/lib/admin/orders";
import { paymentTone, statusTone, TONE_BADGE, type Tone } from "@/lib/admin/tones";
import { cn } from "@/lib/utils";

// A soft badge in one of the admin's status colours (lib/admin/tones.ts). `data-tone` names it.
function ToneBadge({ tone, className, children }: { tone: Tone; className?: string; children: React.ReactNode }) {
  return (
    <Badge variant="secondary" data-tone={tone} className={cn(TONE_BADGE[tone], className)}>
      {children}
    </Badge>
  );
}

// A shipped order shows where the parcel is, and turns amber or red when it's in trouble.
export function StatusBadge({ status, courierStatus = null }: { status: OrderStatus; courierStatus?: CourierStatus | null }) {
  return (
    <ToneBadge tone={statusTone(status, courierStatus)}>
      {status === "delivered" ? <Check strokeWidth={2} aria-hidden /> : null}
      {status === "shipped" && courierStatus ? COURIER_LABELS[courierStatus] : STATUS_LABELS[status]}
    </ToneBadge>
  );
}

export function PaymentBadge({ state }: { state: ReturnType<typeof paymentState> }) {
  return (
    <ToneBadge tone={paymentTone(state)}>
      {state === "paid" ? <Check strokeWidth={2} aria-hidden /> : state === "with_courier" ? <Truck strokeWidth={2} aria-hidden /> : null}
      {STATE_LABELS[state]}
    </ToneBadge>
  );
}

// An exchange order: a customer's jacket going out again in another size, for the order named. Something
// to know at a glance rather than a state or a call to act, so outline, like "No tracking". It links to
// that order; in the orders table it sits above the row's own link (z-10), so it opens that order
// rather than the exchange.
export function ExchangeBadge({ of }: { of: number }) {
  return (
    <Badge variant="outline" render={<Link href={`/admin/orders/${of}`} />} className="relative z-10">
      Exchange for #{of}
    </Badge>
  );
}

// A receipt waiting to be checked is the one thing in a row that asks you to act, so it stays Ink.
export function ReceiptBadge() {
  return (
    <Badge variant="default">
      <FileCheck strokeWidth={2} aria-hidden />
      Receipt in
    </Badge>
  );
}

// A parcel with the courier and no tracking number on file (Shopify's orders came over without
// one). Quieter than the receipt badge: the order page's Shipping box is where it gets added.
export function NoTrackingBadge() {
  return <Badge variant="outline">No tracking</Badge>;
}
