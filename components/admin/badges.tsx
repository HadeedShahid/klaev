import { Check, FileCheck, Truck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { COURIER_LABELS, STATE_LABELS, STATUS_LABELS } from "@/lib/admin/labels";
import type { CourierStatus, OrderStatus, paymentState } from "@/lib/admin/orders";
import { cn } from "@/lib/utils";

// State without hue: Ink for what needs you, Panel Grey for what's moving, outline for what's
// out of your hands or over.
const STATUS_VARIANT: Record<OrderStatus, "default" | "secondary" | "outline"> = {
  pending: "default",
  confirmed: "secondary",
  packed: "secondary",
  shipped: "outline",
  delivered: "secondary",
  cancelled: "outline",
  refused: "outline",
};

// A shipped order shows where the parcel is; a failed attempt or a parcel coming back needs you.
export function StatusBadge({ status, courierStatus = null }: { status: OrderStatus; courierStatus?: CourierStatus | null }) {
  const trouble = status === "shipped" && (courierStatus === "attempted" || courierStatus === "returning");
  return (
    <Badge variant={trouble ? "default" : STATUS_VARIANT[status]} className={cn((status === "cancelled" || status === "refused") && "text-muted-foreground")}>
      {status === "delivered" ? <Check strokeWidth={2} aria-hidden /> : null}
      {status === "shipped" && courierStatus ? COURIER_LABELS[courierStatus] : STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentBadge({ state }: { state: ReturnType<typeof paymentState> }) {
  return (
    <Badge variant={state === "paid" ? "secondary" : "outline"} className={cn(state === "unpaid" && "text-muted-foreground")}>
      {state === "paid" ? <Check strokeWidth={2} aria-hidden /> : state === "with_courier" ? <Truck strokeWidth={2} aria-hidden /> : null}
      {STATE_LABELS[state]}
    </Badge>
  );
}

export function ReceiptBadge() {
  return (
    <Badge variant="default">
      <FileCheck strokeWidth={2} aria-hidden />
      Receipt in
    </Badge>
  );
}
