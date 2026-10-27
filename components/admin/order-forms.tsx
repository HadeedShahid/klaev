"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";

import { updateOrder, type ActionState } from "@/app/actions/admin";
import { adminField, quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

// Every order action posts to updateOrder with the order number and its intent. What happened
// (or what's wrong) is said beneath the control; red is for that error line alone.
function useOrderAction() {
  return useActionState<ActionState, FormData>(updateOrder, null);
}

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  const error = "error" in state;
  return (
    <p role={error ? "alert" : "status"} className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}>
      {error ? state.error : state.done}
    </p>
  );
}

function Hidden({ number, intent }: { number: number; intent: string }) {
  return (
    <>
      <input type="hidden" name="number" value={number} />
      <input type="hidden" name="intent" value={intent} />
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id)}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PaymentForm({ number, today }: { number: number; today: string }) {
  const [state, action, pending] = useOrderAction();
  return (
    <form action={action} className="flex flex-col gap-3 pt-3">
      <Hidden number={number} intent="payment" />
      <div className="grid grid-cols-2 gap-2">
        <Field label="How">
          {(id) => (
            <select id={id} name="method" defaultValue="bank_transfer" className={adminField}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cod">Cash on delivery</option>
              <option value="cash">Cash</option>
            </select>
          )}
        </Field>
        <Field label="Amount">
          {(id) => <input id={id} name="amount" inputMode="numeric" required placeholder="PKR" className={cn(adminField, "tabular-nums")} />}
        </Field>
        <Field label="Received">
          {(id) => <input id={id} name="receivedAt" type="date" required defaultValue={today} className={adminField} />}
        </Field>
        <Field label="Reference">
          {(id) => <input id={id} name="reference" placeholder="Optional" autoComplete="off" className={adminField} />}
        </Field>
      </div>
      <button type="submit" disabled={pending} className={cn(quietPill, "self-start")}>
        {pending ? "Recording" : "Record payment"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function NoteForm({ number, note }: { number: number; note: string | null }) {
  const [state, action, pending] = useOrderAction();
  const id = useId();
  return (
    <form action={action} className="flex flex-col gap-2">
      <Hidden number={number} intent="note" />
      <label htmlFor={id} className="text-sm font-medium">
        Note
      </label>
      <textarea
        id={id}
        name="note"
        rows={3}
        defaultValue={note ?? ""}
        placeholder="Only you see this"
        className={cn(adminField, "h-auto min-h-20 resize-y py-2 leading-normal")}
      />
      <button type="submit" disabled={pending} className={cn(quietPill, "self-start")}>
        {pending ? "Saving" : "Save note"}
      </button>
      <Feedback state={state} />
    </form>
  );
}

// Copies the whole parcel block for the courier's booking form.
export function CopyText({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard blocked: every field is on screen to copy by hand.
    }
  }

  return (
    <button type="button" onClick={copy} className={cn(quietPill, "self-start")}>
      {copied ? <Check className="size-4" strokeWidth={1.8} aria-hidden /> : <Copy className="size-4" strokeWidth={1.8} aria-hidden />}
      {copied ? "Copied" : label}
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
