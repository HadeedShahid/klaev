"use client";

import { useActionState, useId } from "react";

import { updateCourierSettings, type ActionState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import type { CourierSettings } from "@/lib/admin/courier";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

export function CourierForm({ settings }: { settings: CourierSettings }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateCourierSettings, null);
  const id = useId();
  const fields: { name: keyof CourierSettings; label: string; hint: string }[] = [
    { name: "prepaidCharge", label: "Prepaid parcel, PKR", hint: "Delivery only, paid when you book it." },
    { name: "codCharge", label: "Cash on delivery parcel, PKR", hint: "Delivery and cash handling, paid when you book it." },
    { name: "codTaxPercent", label: "Tax on COD cash, %", hint: "Kept from each payout." },
  ];
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-${field.name}`} className="text-sm font-medium">
              {field.label}
            </label>
            <input
              id={`${id}-${field.name}`}
              name={field.name}
              inputMode="decimal"
              defaultValue={settings[field.name]}
              className={cn(adminField, "tabular-nums")}
            />
            <p className="text-xs text-muted-foreground">{field.hint}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving" : "Save"}
        </Button>
        {state ? (
          <p role={"error" in state ? "alert" : "status"} className={cn("text-sm", "error" in state ? "text-destructive" : "text-muted-foreground")}>
            {"error" in state ? state.error : state.done}
          </p>
        ) : null}
      </div>
    </form>
  );
}
