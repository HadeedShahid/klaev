"use client";

import { Check, ChevronDown } from "lucide-react";
import { startTransition, useActionState, useId, useState } from "react";

import { updateOrder, type ActionState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatPKR } from "@/lib/money";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

type DialogKind = "ship" | "payout" | "advance" | "cancel" | "refuse";
type Step = { label: string; intent?: string; dialog?: DialogKind; value?: string };

// Where the parcel is, as the courier's tracking shows it. Booked is set on shipping.
const COURIER_STEPS: { value: string; label: string }[] = [
  { value: "booked", label: "Booked" },
  { value: "in_transit", label: "In transit" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "attempted", label: "Delivery attempted" },
  { value: "returning", label: "Coming back" },
];

export type StatusControlProps = {
  number: number;
  name: string;
  status: string;
  courierStatus: string | null;
  cod: boolean;
  paidOut: boolean;
  advance: number;
  owedToConfirm: number;
  collected: number;
  courierCharge: number;
  codTaxPercent: number;
};

// Every step for this order's state: the next one first, then the rest, then the ways out. The
// COD advance can change at every step until the courier pays out.
function steps({ status, cod, paidOut, owedToConfirm, collected }: StatusControlProps): { next: Step[]; other: Step[]; exits: Step[] } {
  const cancel: Step = { label: "Cancel order", dialog: "cancel" };
  const advance: Step[] = cod && !paidOut ? [{ label: "Change the advance", dialog: "advance" }] : [];
  switch (status) {
    case "pending":
      return {
        next: [{ label: owedToConfirm > 0 ? `Confirm, ${formatPKR(owedToConfirm)} received` : "Confirm", intent: "confirm" }],
        other: advance,
        exits: [cancel],
      };
    case "confirmed":
      return { next: [{ label: "Mark packed", intent: "pack" }], other: [{ label: "Mark shipped", dialog: "ship" }, ...advance], exits: [cancel] };
    case "packed":
      return { next: [{ label: "Mark shipped", dialog: "ship" }], other: advance, exits: [cancel] };
    case "shipped":
      return {
        next: [{ label: cod && collected > 0 ? `Mark delivered, ${formatPKR(collected)} collected` : "Mark delivered", intent: "deliver" }],
        other: advance,
        exits: [{ label: "Refused at the door", dialog: "refuse" }],
      };
    case "delivered":
      return cod && !paidOut ? { next: [{ label: "Record the courier's payout", dialog: "payout" }], other: advance, exits: [] } : { next: [], other: [], exits: [] };
    default:
      return { next: [], other: [], exits: [] };
  }
}

// The one control that moves an order on. Steps that need nothing more happen on the spot; the
// rest open a dialog. What happened, or what's wrong, is said beside it.
export function StatusControl(props: StatusControlProps) {
  const { number, name, status, courierStatus, cod, advance, collected, courierCharge, codTaxPercent } = props;
  const [state, action, pending] = useActionState<ActionState, FormData>(updateOrder, null);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [seen, setSeen] = useState(state);
  // The payout starts from what the courier should pay, worked out from the order as it is when the dialog opens.
  const expected = () => String(collected - Math.round((collected * codTaxPercent) / 100));
  const [payout, setPayout] = useState(expected);
  const id = useId();
  // A dialog closes once its step went through.
  if (state !== seen) {
    setSeen(state);
    if (state && "done" in state) setDialog(null);
  }

  const { next, other, exits } = steps(props);
  const run = (step: Step) => {
    if (step.dialog === "payout") setPayout(expected());
    if (step.dialog) return setDialog(step.dialog);
    const form = new FormData();
    form.set("number", String(number));
    form.set("intent", step.intent ?? "");
    if (step.value) form.set("courierStatus", step.value);
    startTransition(() => action(form));
  };
  const kept = collected - (Number(payout.replace(/[,\s]/g, "")) || 0);

  const hidden = (intent: string) => (
    <>
      <input type="hidden" name="number" value={number} />
      <input type="hidden" name="intent" value={intent} />
    </>
  );
  const error = dialog && state && "error" in state ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null;
  const footer = (yes: string, dismiss = "Not now") => (
    <DialogFooter>
      <Button type="button" variant="outline" onClick={() => setDialog(null)}>
        {dismiss}
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : yes}
      </Button>
    </DialogFooter>
  );

  return (
    <div className="flex items-center gap-3">
      {state && !dialog ? (
        <p role={"error" in state ? "alert" : "status"} className={cn("text-sm", "error" in state ? "text-destructive" : "text-muted-foreground")}>
          {"error" in state ? state.error : state.done}
        </p>
      ) : null}
      {next.length + other.length + exits.length === 0 ? (
        <Button variant="outline" disabled>
          Nothing left to do
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button disabled={pending} />}>
            {pending ? "Saving" : "Update status"}
            <ChevronDown data-icon="inline-end" strokeWidth={1.8} aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-64">
            {next.length > 0 ? (
              <DropdownMenuGroup>
                <DropdownMenuLabel>Next step</DropdownMenuLabel>
                {next.map((step) => (
                  <DropdownMenuItem key={step.label} onClick={() => run(step)} className="font-medium">
                    {step.label}
                    {step.dialog ? "…" : ""}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ) : null}
            {status === "shipped" ? (
              <DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Where the parcel is</DropdownMenuLabel>
                {COURIER_STEPS.map((step) => (
                  <DropdownMenuItem
                    key={step.value}
                    disabled={step.value === courierStatus}
                    onClick={() => run({ label: step.label, intent: "courier", value: step.value })}
                  >
                    {step.label}
                    {step.value === courierStatus ? <Check className="ml-auto" strokeWidth={2} aria-label="Now" /> : null}
                  </DropdownMenuItem>
                ))}
                {other.length > 0 ? <DropdownMenuSeparator /> : null}
              </DropdownMenuGroup>
            ) : null}
            {other.map((step) => (
              <DropdownMenuItem key={step.label} onClick={() => run(step)}>
                {step.label}
                {step.dialog ? "…" : ""}
              </DropdownMenuItem>
            ))}
            {exits.length > 0 ? <DropdownMenuSeparator /> : null}
            {exits.map((step) => (
              <DropdownMenuItem key={step.label} onClick={() => run(step)}>
                {step.label}…
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Dialog open={dialog === "ship"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <form action={action} className="flex flex-col gap-4">
            {hidden("ship")}
            <DialogHeader>
              <DialogTitle>Ship #{number}</DialogTitle>
              <DialogDescription>Book the parcel, then add its tracking number and what the courier charged upfront.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-[1fr_8rem] gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${id}-tracking`} className="text-sm font-medium">
                  Tracking number
                </label>
                <input id={`${id}-tracking`} name="trackingNumber" required autoComplete="off" autoFocus className={adminField} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${id}-charge`} className="text-sm font-medium">
                  Courier charge
                </label>
                <input id={`${id}-charge`} name="courierFee" inputMode="numeric" defaultValue={courierCharge} className={cn(adminField, "tabular-nums")} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {cod ? "COD parcels carry delivery and cash handling." : "Prepaid parcels carry delivery only."} The charge starts from your default in Settings.
            </p>
            {error}
            {footer("Mark shipped")}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "payout"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <form action={action} className="flex flex-col gap-4">
            {hidden("payout")}
            <DialogHeader>
              <DialogTitle>Courier payout for #{number}</DialogTitle>
              <DialogDescription>
                The rider collected {formatPKR(collected)}. The courier pays it out less {codTaxPercent}% tax.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-payout`} className="text-sm font-medium">
                Amount paid out
              </label>
              <input
                id={`${id}-payout`}
                name="amount"
                inputMode="numeric"
                value={payout}
                onChange={(event) => setPayout(event.target.value)}
                autoFocus
                className={cn(adminField, "tabular-nums")}
              />
              <p className="text-xs text-muted-foreground tabular-nums">
                {kept >= 0 ? `The courier kept ${formatPKR(kept)}, recorded as tax.` : "That's more than the rider collected."}
              </p>
            </div>
            {error}
            {footer("Record payout")}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "advance"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <form action={action} className="flex flex-col gap-4">
            {hidden("advance")}
            <DialogHeader>
              <DialogTitle>Advance for #{number}</DialogTitle>
              <DialogDescription>
                What {name.split(/\s+/)[0]} sends to confirm; the rider collects the rest. If the advance is already recorded as received,
                that payment changes with it.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-advance`} className="text-sm font-medium">
                Advance
              </label>
              <input id={`${id}-advance`} name="advance" inputMode="numeric" defaultValue={advance} autoFocus className={cn(adminField, "tabular-nums")} />
            </div>
            {error}
            {footer("Save")}
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "cancel" || dialog === "refuse"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <form action={action} className="flex flex-col gap-4">
            {hidden(dialog === "refuse" ? "refuse" : "cancel")}
            <DialogHeader>
              <DialogTitle>{dialog === "refuse" ? `Was #${number} refused at the door?` : `Cancel #${number}?`}</DialogTitle>
              <DialogDescription>
                {dialog === "refuse"
                  ? "The parcel comes back, and its pieces go back into stock. The courier's charge stays a cost."
                  : "Its pieces go back into stock. Payments already recorded stay on the order."}
              </DialogDescription>
            </DialogHeader>
            {error}
            {footer(dialog === "refuse" ? "Yes, it was refused" : "Yes, cancel it", "Keep it")}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
