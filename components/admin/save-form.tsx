"use client";

import { useActionState } from "react";

import type { ActionState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// A form whose fields sit across the page's cards (each joins with form={id}) and whose Save
// button lives in the page header, as on Shopify. The form element itself is empty.
export function SaveForm({ id, action, hidden }: { id: string; action: (state: ActionState, form: FormData) => Promise<ActionState>; hidden: Record<string, string | number> }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  return (
    <div className="flex items-center gap-3">
      <form id={id} action={formAction}>
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </form>
      {state ? (
        <p role={"error" in state ? "alert" : "status"} className={cn("max-w-md text-sm", "error" in state ? "text-destructive" : "text-muted-foreground")}>
          {"error" in state ? state.error : state.done}
        </p>
      ) : null}
      <Button type="submit" form={id} disabled={pending}>
        {pending ? "Saving" : "Save"}
      </Button>
    </div>
  );
}
