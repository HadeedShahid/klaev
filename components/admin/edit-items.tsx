"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useId, useState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { editItemsAction } from "@/app/actions/admin-orders";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SellableProduct } from "@/lib/admin/order-changes";
import { formatPKR } from "@/lib/money";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

type Row = { key: string; productId: number; variantId: number; quantity: number };

const sizeName = (size: string | null) => size ?? "One size";

// Changes an order's items before it ships: a size, a quantity, a jacket added or taken off.
// Each size lists what's free to sell; the order's own pieces count as free for it.
export function EditItems({
  number,
  lines,
  catalog,
}: {
  number: number;
  lines: { variantId: number; productId: number; quantity: number }[];
  catalog: SellableProduct[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(editItemsAction, null);
  const [seen, setSeen] = useState(state);
  const start = () => lines.map((line, index) => ({ key: `line-${index}`, ...line }));
  const [rows, setRows] = useState<Row[]>(start);
  const [adding, setAdding] = useState<number | "">("");
  const id = useId();
  if (state !== seen) {
    setSeen(state);
    if (state && "done" in state) setOpen(false);
  }

  const product = (productId: number) => catalog.find((candidate) => candidate.productId === productId);
  const held = (variantId: number) => lines.filter((line) => line.variantId === variantId).reduce((sum, line) => sum + line.quantity, 0);
  const update = (key: string, change: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  const add = () => {
    const chosen = product(Number(adding));
    const size = chosen?.sizes.find((candidate) => candidate.stock > 0) ?? chosen?.sizes[0];
    if (!chosen || !size) return;
    setRows((current) => [...current, { key: `new-${Date.now()}`, productId: chosen.productId, variantId: size.variantId, quantity: 1 }]);
    setAdding("");
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setRows(start());
          setOpen(true);
        }}
      >
        Edit items
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <form action={action} className="flex flex-col gap-4">
            <input type="hidden" name="number" value={number} />
            <input type="hidden" name="items" value={JSON.stringify(rows.map(({ variantId, quantity }) => ({ variantId, quantity })))} />
            <DialogHeader>
              <DialogTitle>Items in #{number}</DialogTitle>
              <DialogDescription>Stock moves by the difference. Pieces already on the order keep their price; added ones take today&apos;s.</DialogDescription>
            </DialogHeader>

            <ul className="flex flex-col gap-3">
              {rows.map((row) => {
                const item = product(row.productId);
                return (
                  <li key={row.key} className="flex flex-col gap-2 rounded-xl border border-hairline p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-pretty">{item?.title ?? "No longer on the store"}</p>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Take ${item?.title ?? "it"} off the order`} onClick={() => setRows((current) => current.filter((other) => other.key !== row.key))}>
                        <X strokeWidth={1.8} aria-hidden />
                      </Button>
                    </div>
                    <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                      <select
                        aria-label="Size"
                        value={row.variantId}
                        onChange={(event) => update(row.key, { variantId: Number(event.target.value) })}
                        className={adminField}
                      >
                        {item?.sizes.map((size) => {
                          const free = size.stock + held(size.variantId);
                          return (
                            <option key={size.variantId} value={size.variantId} disabled={free === 0 && size.variantId !== row.variantId}>
                              {sizeName(size.size)}, {free === 0 ? "sold out" : `${free} free`}
                            </option>
                          );
                        })}
                      </select>
                      <input
                        aria-label="Quantity"
                        type="number"
                        min={1}
                        max={20}
                        value={row.quantity}
                        onChange={(event) => update(row.key, { quantity: Math.max(1, Math.floor(Number(event.target.value)) || 1) })}
                        className={cn(adminField, "tabular-nums")}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex gap-2">
              <label htmlFor={`${id}-add`} className="sr-only">
                Add a jacket
              </label>
              <select id={`${id}-add`} value={adding} onChange={(event) => setAdding(event.target.value ? Number(event.target.value) : "")} className={adminField}>
                <option value="">Add a jacket or belt</option>
                {catalog.map((item) => (
                  <option key={item.productId} value={item.productId} disabled={item.sizes.every((size) => size.stock === 0)}>
                    {item.title}, {formatPKR(item.price)}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={add} disabled={adding === ""}>
                <Plus data-icon="inline-start" strokeWidth={1.8} aria-hidden />
                Add
              </Button>
            </div>

            {state && "error" in state ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Not now
              </Button>
              <Button type="submit" disabled={pending || rows.length === 0}>
                {pending ? "Saving" : "Save items"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
