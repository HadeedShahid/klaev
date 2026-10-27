"use client";

import { Check } from "lucide-react";
import { startTransition, useActionState, useEffect, useId, useRef, type FormEvent } from "react";

import { lookUpOrder, type TrackState } from "@/app/actions/track";
import { orderSteps, statusLine } from "@/lib/order-status";
import { pill } from "@/lib/styles";
import { cn } from "@/lib/utils";

const control = "h-12 w-full rounded-xl border border-input bg-background px-4 text-base transition-colors placeholder:text-muted-foreground";
const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short" });

// The order number and the phone it was placed with; then where the order is.
export function TrackForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(lookUpOrder, null);
  const id = useId();
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state) result.current?.focus();
  }, [state]);
  // Sent through a transition rather than the form's action, so a miss keeps what was typed.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <div className="flex flex-col gap-10">
      <form action={action} onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-number`} className="text-[0.9375rem] font-medium">
            Order number
          </label>
          <input id={`${id}-number`} name="number" inputMode="numeric" autoComplete="off" placeholder="1042" className={control} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-phone`} className="text-[0.9375rem] font-medium">
            Mobile number
          </label>
          <input id={`${id}-phone`} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" className={control} />
          <p className="text-sm text-muted-foreground">The one you ordered with.</p>
        </div>
        <button type="submit" disabled={pending} className={cn(pill, "w-full disabled:bg-muted disabled:text-muted-foreground")}>
          {pending ? "Finding it" : "Track order"}
        </button>
      </form>

      <div ref={result} tabIndex={-1} aria-live="polite" className="outline-none">
        {state && "error" in state ? <p className="rounded-2xl bg-muted p-4 text-sm">{state.error}</p> : null}
        {state && "order" in state ? <Tracked order={state.order} /> : null}
      </div>
    </div>
  );
}

function Tracked({ order }: { order: Extract<NonNullable<TrackState>, { order: unknown }>["order"] }) {
  const stopped = order.status === "cancelled" || order.status === "refused";
  const steps = orderSteps(order);
  const reached = steps.filter((step) => step.at).length;
  return (
    <section aria-labelledby="tracked" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="tracked" className="text-xl font-semibold tracking-tight">
          Order #{order.number}
        </h2>
        <p data-testid="track-status" className="text-lg text-muted-foreground text-pretty">
          {statusLine(order)}
        </p>
      </div>

      {stopped ? null : (
        <ol className="flex flex-col">
          {steps.map((step, index) => {
            const done = step.at !== null;
            const current = index === reached - 1;
            return (
              <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
                {index < steps.length - 1 ? (
                  <span aria-hidden className={cn("absolute top-6 bottom-0 left-[11px] w-px", done && steps[index + 1].at ? "bg-foreground" : "bg-hairline")} />
                ) : null}
                <span
                  aria-hidden
                  className={cn(
                    "relative flex size-6 shrink-0 items-center justify-center rounded-full border",
                    done ? "border-foreground bg-foreground text-background" : "border-border bg-background",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={2.2} /> : null}
                </span>
                <span className="flex flex-1 items-baseline justify-between gap-3 pt-0.5">
                  <span className={cn("text-[0.9375rem]", current ? "font-semibold" : !done && "text-muted-foreground")}>
                    {step.label}
                    <span className="sr-only">{done ? ", done" : ", not yet"}</span>
                  </span>
                  {step.at ? <span className="text-sm text-muted-foreground tabular-nums">{day.format(step.at)}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {order.trackingNumber && order.status === "shipped" ? (
        <p className="text-sm text-muted-foreground">
          Tracking number <span className="font-medium text-foreground tabular-nums">{order.trackingNumber}</span>
        </p>
      ) : null}

      <ul className="flex flex-col gap-1 border-t border-hairline pt-4 text-[0.9375rem]">
        {order.lines.map((line, index) => (
          <li key={index}>
            {line.title}
            <span className="text-muted-foreground">
              {line.size ? `, size ${line.size}` : ""}
              {line.quantity > 1 ? `, ${line.quantity} pieces` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
