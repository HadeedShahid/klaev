"use client";

import { useActionState, useId } from "react";

import { signIn, type SignInState } from "@/app/actions/admin";
import { cn } from "@/lib/utils";
import { pill } from "@/lib/styles";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, null);
  const id = useId();
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-password`} className="text-[0.9375rem] font-medium">
          Password
        </label>
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? `${id}-error` : undefined}
          className="h-12 w-full rounded-xl border border-input bg-background px-4 text-base"
        />
        {state?.error ? (
          <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>
      <button type="submit" disabled={pending} className={cn(pill, "w-full disabled:bg-muted disabled:text-muted-foreground")}>
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
