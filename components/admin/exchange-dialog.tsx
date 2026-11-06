"use client";

import { useActionState, useId, useState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { exchangeAction } from "@/app/actions/admin-orders";
import { BusyLabel } from "@/components/ui/busy-label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SellableProduct } from "@/lib/admin/order-changes";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

type Line = { id: number; title: string; size: string | null; variantId: number; productId: number };

// How the customer pays the delivery charge: by transfer before it ships, as exchanges usually are,
// or in cash to the rider. Admin choice cards, as on a manual order.
const METHODS = [
  { value: "bank_transfer", label: "Bank transfer", note: "Paid before it ships" },
  { value: "cod", label: "Cash on delivery", note: "Collected at the door" },
] as const;

// A size exchange on a delivered order: which jacket, the size it becomes, the delivery charge the
// customer pays and how they pay it. The new size goes out as its own order.
export function ExchangeDialog({ number, lines, catalog, charge }: { number: number; lines: Line[]; catalog: SellableProduct[]; charge: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(exchangeAction, null);
  const [lineId, setLineId] = useState(lines[0]?.id ?? 0);
  const [method, setMethod] = useState<(typeof METHODS)[number]["value"]>("bank_transfer");
  const id = useId();
  const line = lines.find((candidate) => candidate.id === lineId) ?? lines[0];
  const available = (catalog.find((product) => product.productId === line?.productId)?.sizes ?? []).filter(
    (size) => size.variantId !== line?.variantId && size.stock > 0,
  );

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Exchange a size
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="number" value={number} />
            <DialogHeader>
              <DialogTitle>Exchange a size from #{number}</DialogTitle>
              <DialogDescription>
                The new size goes out as its own order, linked to this one. The old jacket goes back in stock when it arrives, from that order&apos;s page.
              </DialogDescription>
            </DialogHeader>
            {lines.length > 1 ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${id}-line`} className="text-sm font-medium">
                  Jacket
                </label>
                <select id={`${id}-line`} name="lineId" value={lineId} onChange={(event) => setLineId(Number(event.target.value))} className={adminField}>
                  {lines.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.title}, {candidate.size ?? "one size"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <input type="hidden" name="lineId" value={line?.id} />
                <p className="text-sm">
                  {line?.title}, size {line?.size ?? "one size"}
                </p>
              </>
            )}
            {available.length === 0 ? (
              <p className="rounded-xl bg-muted p-3 text-sm">
                Every other size of it is sold out. Restock one in Inventory first.
              </p>
            ) : (
            <div className="grid grid-cols-[1fr_8rem] gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${id}-size`} className="text-sm font-medium">
                  New size
                </label>
                <select key={line?.id} id={`${id}-size`} name="variantId" required className={adminField}>
                  {available.map((size) => (
                    <option key={size.variantId} value={size.variantId}>
                      {size.size ?? "One size"}, {size.stock} in stock
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${id}-charge`} className="text-sm font-medium">
                  Delivery charge
                </label>
                <input id={`${id}-charge`} name="charge" inputMode="numeric" defaultValue={charge} className={cn(adminField, "tabular-nums")} />
              </div>
            </div>
            )}
            {available.length > 0 ? (
              <>
                <div role="radiogroup" aria-label="How they pay" className="grid grid-cols-2 gap-2">
                  {METHODS.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer flex-col gap-0.5 rounded-xl border border-input px-3 py-2.5 text-sm has-checked:border-foreground has-checked:ring-1 has-checked:ring-foreground"
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.value}
                        checked={method === option.value}
                        onChange={() => setMethod(option.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.note}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {method === "bank_transfer"
                    ? "The new order waits for the transfer: confirm it from Update status once it's in. With nothing to pay, it starts confirmed."
                    : "The rider collects it at the door, and the courier pays it out with the rest."}{" "}
                  The exchange terms have the customer cover delivery both ways.
                </p>
              </>
            ) : null}
            {state && "error" in state ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Not now
              </Button>
              <Button aria-busy={pending} type="submit" disabled={pending || available.length === 0}>
                <BusyLabel busy={pending} busyText="Saving">Send the new size</BusyLabel>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
