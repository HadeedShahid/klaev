import type { InputHTMLAttributes } from "react";

import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

// A labelled admin input. The id must be unique on the page: pass one built from the order or row.
export function Field({ id, label, hint, className, ...input }: { id: string; label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} {...input} className={cn(adminField, input.inputMode === "numeric" && "tabular-nums")} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
