"use client";

import { useState } from "react";

import { Field } from "@/components/admin/field";
import type { DiscountKind } from "@/lib/discounts";
import { adminField } from "@/lib/styles";

export type DiscountValues = {
  code: string;
  kind: DiscountKind;
  value: number;
  minSubtotal: number | null;
  startsOn: string;
  endsOn: string;
  usageLimit: number | null;
  oncePerCustomer: boolean;
};

const KINDS: { value: DiscountKind; label: string }[] = [
  { value: "percent", label: "Percentage off" },
  { value: "fixed", label: "Amount off" },
  { value: "free_delivery", label: "Free delivery" },
];

// What a code is, what it takes off, and when and how often it works. The amount field changes
// with the kind, and free delivery has none.
export function DiscountFields({ id, values }: { id: string; values?: DiscountValues }) {
  const [kind, setKind] = useState<DiscountKind>(values?.kind ?? "percent");
  return (
    <div className="flex flex-col gap-4">
      <Field
        id={`${id}-code`}
        name="code"
        label="Code"
        defaultValue={values?.code}
        placeholder="EID10"
        required
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="[&_input]:uppercase [&_input]:placeholder:normal-case"
        hint="What customers type at checkout. Letters and numbers, no spaces."
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-kind`} className="text-sm font-medium">
            Takes off
          </label>
          <select id={`${id}-kind`} name="kind" value={kind} onChange={(event) => setKind(event.target.value as DiscountKind)} className={adminField}>
            {KINDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {kind === "free_delivery" ? (
          <p className="self-end pb-2.5 text-xs text-muted-foreground">Cash on delivery orders skip the delivery fee.</p>
        ) : (
          <Field
            key={kind}
            id={`${id}-value`}
            name="value"
            label={kind === "percent" ? "Percent" : "Amount, PKR"}
            defaultValue={values?.kind === kind ? values.value : undefined}
            inputMode="numeric"
            required
            autoComplete="off"
          />
        )}
      </div>
      <Field
        id={`${id}-min`}
        name="minSubtotal"
        label="Minimum order, PKR"
        defaultValue={values?.minSubtotal ?? undefined}
        inputMode="numeric"
        autoComplete="off"
        hint="Leave empty for any order."
      />
      <div className="grid grid-cols-2 gap-3">
        <Field id={`${id}-starts`} name="startsOn" label="Starts" type="date" defaultValue={values?.startsOn} hint="Empty starts now." />
        <Field id={`${id}-ends`} name="endsOn" label="Ends after" type="date" defaultValue={values?.endsOn} hint="Empty never ends." />
      </div>
      <Field
        id={`${id}-limit`}
        name="usageLimit"
        label="Total uses"
        defaultValue={values?.usageLimit ?? undefined}
        inputMode="numeric"
        autoComplete="off"
        hint="Leave empty for no limit. Cancelled orders give their use back."
      />
      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input type="checkbox" name="oncePerCustomer" defaultChecked={values?.oncePerCustomer} className="mt-0.5 size-4 accent-foreground" />
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">Once per customer</span>
          <span className="text-xs text-muted-foreground">Checked by mobile number.</span>
        </span>
      </label>
    </div>
  );
}
