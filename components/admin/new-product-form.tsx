"use client";

import { useActionState, useId } from "react";

import type { ActionState } from "@/app/actions/admin";
import { createProductAction } from "@/app/actions/admin-products";
import { Button } from "@/components/ui/button";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

// The few things a product needs to exist. Everything else (photos, description, stock) goes on
// its page next, before it's put on the store.
export function NewProductForm({ collections }: { collections: { handle: string; title: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProductAction, null);
  const id = useId();
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-title`} className="text-sm font-medium">
          Title
        </label>
        <input id={`${id}-title`} name="title" required autoFocus placeholder="Tan Cropped Suede Jacket" className={adminField} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-collection`} className="text-sm font-medium">
            Collection
          </label>
          <select id={`${id}-collection`} name="collectionHandle" required className={adminField}>
            {collections.map((collection) => (
              <option key={collection.handle} value={collection.handle}>
                {collection.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-price`} className="text-sm font-medium">
            Price, PKR
          </label>
          <input id={`${id}-price`} name="price" inputMode="numeric" required className={cn(adminField, "tabular-nums")} />
        </div>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Sizes</legend>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <label key={size} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-input px-3 text-sm has-checked:border-foreground has-checked:ring-1 has-checked:ring-foreground">
              <input type="checkbox" name="size" value={size} defaultChecked={["S", "M", "L", "XL"].includes(size)} className="accent-foreground" />
              {size}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Leave them all unticked for a one-size product, like a belt. More sizes can be added later.</p>
      </fieldset>
      {state && "error" in state ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Creating" : "Create product"}
      </Button>
    </form>
  );
}
