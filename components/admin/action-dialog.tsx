"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { updateOrder, type ActionState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  // The server action the form posts to; order changes by default.
  action?: (state: ActionState, form: FormData) => Promise<ActionState>;
  label: string;
  title: string;
  description?: string;
  number?: number;
  intent?: string;
  submit: string;
  // "Not now" closes a form; "Keep it" backs out of removing something.
  dismiss?: string;
  hidden?: Record<string, string | number>;
  variant?: "default" | "outline" | "ghost" | "link";
  children?: ReactNode;
  // Opened from elsewhere (a row's menu) instead of its own button.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

// A button that opens one small form: edit an order's contact details, correct a payment, restock a
// size. The fields come in as children; the dialog closes once the change went through.
export function ActionDialog({
  action: serverAction = updateOrder,
  label,
  title,
  description,
  number,
  intent,
  submit,
  dismiss = "Not now",
  hidden = {},
  variant = "outline",
  children,
  open: controlled,
  onOpenChange,
}: Props) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = controlled ?? ownOpen;
  const setOpen = (next: boolean) => (onOpenChange ? onOpenChange(next) : setOwnOpen(next));
  const [state, action, pending] = useActionState<ActionState, FormData>(serverAction, null);
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state && "done" in state && controlled === undefined) setOwnOpen(false);
  }
  // Opened from elsewhere, it tells its opener to close once a change went through: once per
  // result, so opening it again later doesn't close it straight away.
  const opener = useRef(onOpenChange);
  useEffect(() => {
    opener.current = onOpenChange;
  });
  useEffect(() => {
    if (state && "done" in state) opener.current?.(false);
  }, [state]);
  return (
    <>
      {controlled === undefined ? (
        <Button type="button" variant={variant} size="sm" onClick={() => setOpen(true)}>
          {label}
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form action={action} className="flex flex-col gap-4">
            {number !== undefined ? <input type="hidden" name="number" value={number} /> : null}
            {intent ? <input type="hidden" name="intent" value={intent} /> : null}
            {Object.entries(hidden).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description ? <DialogDescription>{description}</DialogDescription> : null}
            </DialogHeader>
            {children}
            {state && "error" in state ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {dismiss}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving" : submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
