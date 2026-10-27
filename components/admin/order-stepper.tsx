import { Check, X } from "lucide-react";

import { dateTime } from "@/lib/admin/format";
import type { AdminOrder } from "@/lib/admin/orders";
import { cn } from "@/lib/utils";

type Step = { label: string; at: Date | null; ended?: boolean };

// Where the order is, step by step: done steps in Ink with their date, the next one ringed, the rest
// waiting. Cash on delivery adds the courier's payout as the last step. A cancelled or refused order
// ends at the step where it stopped.
export function OrderStepper({ order }: { order: AdminOrder }) {
  const cod = order.paymentMethod === "cod";
  // Cash settled by hand before payouts were recorded (Shopify's orders) counts as paid out, on the day it came in.
  const settledAt =
    order.paidOutAt ??
    (order.deliveredAt && order.paid + order.codTax >= order.total ? (order.payments.at(-1)?.receivedAt ?? order.deliveredAt) : null);
  const steps: Step[] = [
    { label: "Placed", at: order.createdAt },
    // A COD order with no advance (an exchange, or one agreed without) is simply confirmed.
    { label: cod ? (order.advance > 0 ? "Advance in" : "Confirmed") : "Paid", at: order.confirmedAt },
    { label: "Packed", at: order.packedAt },
    { label: "Shipped", at: order.shippedAt },
    { label: "Delivered", at: order.deliveredAt },
    ...(cod ? [{ label: "Paid out", at: settledAt }] : []),
  ];
  const ended = order.status === "cancelled" ? order.cancelledAt : order.status === "refused" ? order.refusedAt : null;
  // A step counts as done once it or any later step happened (an order can ship without being marked packed).
  const lastDone = steps.reduce((last, step, index) => (step.at ? index : last), 0);
  const shown: Step[] = ended
    ? [...steps.slice(0, lastDone + 1), { label: order.status === "cancelled" ? "Cancelled" : "Refused", at: ended, ended: true }]
    : steps;
  const next = ended ? -1 : lastDone + 1;

  return (
    <ol aria-label="Order progress" className="grid gap-3" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
      {shown.map((step, index) => {
        const done = step.ended || index <= lastDone;
        return (
          <li key={step.label} aria-current={index === next ? "step" : undefined} className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                  done ? "bg-foreground text-background" : index === next ? "ring-2 ring-foreground" : "ring-1 ring-border",
                )}
              >
                {step.ended ? <X className="size-3.5" strokeWidth={2.2} aria-hidden /> : done ? <Check className="size-3.5" strokeWidth={2.2} aria-hidden /> : null}
              </span>
              {index < shown.length - 1 ? <span className={cn("h-px flex-1", index < lastDone ? "bg-foreground" : "bg-border")} /> : null}
            </div>
            <div className="min-w-0">
              <p className={cn("text-xs leading-snug sm:truncate sm:text-sm", done || index === next ? "font-medium" : "text-muted-foreground")}>
                {step.label}
              </p>
              {/* Dates from tablets up; on a phone the steps keep their names whole instead. */}
              <p className="hidden truncate text-xs text-muted-foreground tabular-nums sm:block">
                {step.at ? dateTime(step.at) : index === next ? "Next" : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
