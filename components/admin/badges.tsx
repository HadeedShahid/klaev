import { Check, FileCheck, Truck } from "lucide-react";

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

// A receipt waiting to be checked is the one thing in a row that asks you to act, so it stays Ink.
export function ReceiptBadge() {
  return (
    <Badge variant="default">
      <FileCheck strokeWidth={2} aria-hidden />
      Receipt in
    </Badge>
  );
}
