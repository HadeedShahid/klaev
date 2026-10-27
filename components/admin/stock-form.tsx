"use client";

import { useActionState, useId, useState } from "react";

import { updateStock, type ActionState } from "@/app/actions/admin";
import { adminField, quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

type Variant = { id: number; size: string | null; stock: number };

const valuesOf = (variants: Variant[]) => Object.fromEntries(variants.map((variant) => [variant.id, String(variant.stock)]));

// A product's sizes, each with what is free to sell. Saving sends the number the page showed
// beside the number typed, so a sale made meanwhile still counts (lib/admin/stock.ts).
export function StockForm({ title, variants }: { title: string; variants: Variant[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateStock, null);
  const id = useId();
  // When the saved numbers come back from the server, the fields take them.
  const shown = variants.map((variant) => `${variant.id}:${variant.stock}`).join();
  const [seen, setSeen] = useState(shown);
  const [values, setValues] = useState(() => valuesOf(variants));
  if (shown !== seen) {
    setSeen(shown);
    setValues(valuesOf(variants));
  }
  const changed = variants.some((variant) => values[variant.id] !== String(variant.stock));

  return (
    <form action={action} aria-label={`Stock for ${title}`} className="flex flex-wrap items-end gap-3">
      {variants.map((variant) => (
        <div key={variant.id} className="flex flex-col gap-1">
          <input type="hidden" name="variant" value={variant.id} />
          <input type="hidden" name={`from-${variant.id}`} value={variant.stock} />
          <label htmlFor={`${id}-${variant.id}`} className="text-center text-xs text-muted-foreground">
            {variant.size ?? "Stock"}
          </label>
          <input
            id={`${id}-${variant.id}`}
            name={`to-${variant.id}`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={values[variant.id]}
            onChange={(event) => setValues({ ...values, [variant.id]: event.target.value })}
            aria-label={`${title}, size ${variant.size ?? "one size"}`}
            className={cn(adminField, "w-16 px-2 text-center tabular-nums", variant.stock === 0 && "text-muted-foreground")}
          />
        </div>
      ))}
      <button type="submit" disabled={pending || !changed} className={quietPill}>
        {pending ? "Saving" : "Save"}
      </button>
      {state ? (
        <p role={"error" in state ? "alert" : "status"} className={cn("w-full text-sm", "error" in state ? "text-destructive" : "text-muted-foreground")}>
          {"error" in state ? state.error : state.done}
        </p>
      ) : null}
    </form>
  );
}
