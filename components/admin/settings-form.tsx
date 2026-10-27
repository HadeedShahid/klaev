"use client";

import { useActionState, useId, type HTMLInputTypeAttribute } from "react";

import type { ActionState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

export type SettingsField = {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string | number;
  type?: HTMLInputTypeAttribute;
  inputMode?: "numeric" | "decimal" | "text";
  autoComplete?: string;
};

// One settings card's fields, saved together. What happened is said beside the button.
export function SettingsForm({
  action: serverAction,
  fields,
  submit = "Save",
  columns = 3,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  fields: SettingsField[];
  submit?: string;
  columns?: 2 | 3;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(serverAction, null);
  const id = useId();
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className={cn("grid gap-4", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-${field.name}`} className="text-sm font-medium">
              {field.label}
            </label>
            <input
              id={`${id}-${field.name}`}
              name={field.name}
              type={field.type ?? "text"}
              inputMode={field.inputMode}
              autoComplete={field.autoComplete ?? "off"}
              defaultValue={field.defaultValue}
              className={cn(adminField, field.inputMode && field.inputMode !== "text" && "tabular-nums")}
            />
            {field.hint ? <p className="text-xs text-muted-foreground">{field.hint}</p> : null}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {/* Several of these share the Settings page, so none takes the one black primary. */}
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving" : submit}
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
