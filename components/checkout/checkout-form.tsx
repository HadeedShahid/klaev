"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { checkout, type CheckoutState } from "@/app/actions/checkout";
import { ExchangeTerms } from "@/components/site/exchange-terms";
import type { CheckoutField, PaymentChoice } from "@/lib/checkout";
import { CITIES } from "@/lib/cities";
import { formatPKR } from "@/lib/money";
import { bankTransferSummary, codSummary } from "@/lib/payment";
import { STORE } from "@/lib/store";
import { pill } from "@/lib/styles";
import { cn } from "@/lib/utils";

export function CheckoutForm({ subtotal }: { subtotal: number }) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(checkout, {});
  const [payment, setPayment] = useState<PaymentChoice>("cod");
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  // After a failed attempt, take the shopper straight to the first thing to fix.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']")?.focus();
  }, [state]);

  // Submitted through a transition rather than the form's action, so React keeps what was typed.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  const cod = codSummary(subtotal);
  const bank = bankTransferSummary(subtotal);
  const field = (name: CheckoutField) => ({ name, id: `${id}-${name}`, error: state.errors?.[name], value: state.fields?.[name] });

  return (
    <form ref={formRef} action={formAction} onSubmit={submit} noValidate className="flex flex-col gap-10">
      {state.message ? (
        <div role="alert" tabIndex={-1} className="flex flex-col gap-2 rounded-2xl bg-muted p-4 text-sm outline-none">
          <p className="font-medium">{state.message}</p>
          <Link href="/cart" className="self-start underline underline-offset-[0.2em] hover:no-underline">
            Change your cart
          </Link>
        </div>
      ) : null}

      <Section title="Contact">
        <Field {...field("name")} label="Full name" autoComplete="name" />
        <Field
          {...field("phone")}
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hint="We confirm every order on WhatsApp, on this number."
        />
        <Field {...field("email")} label="Email" type="email" autoComplete="email" hint="Your order details go here." />
      </Section>

      <Section title="Delivery">
        <Field {...field("city")} label="City" autoComplete="address-level2" list={`${id}-cities`} />
        <datalist id={`${id}-cities`}>
          {CITIES.map((city) => (
            <option key={city} value={city} />
          ))}
        </datalist>
        <Field
          {...field("address")}
          label="Full address"
          autoComplete="street-address"
          multiline
          hint="House, street and area. Add a landmark if it helps."
        />
        <p className="text-sm text-muted-foreground">Most orders arrive in {STORE.deliveryDays} days, anywhere in Pakistan.</p>
      </Section>

      <Section title="How you pay">
        <div role="radiogroup" aria-label="How you pay" className="flex flex-col gap-2">
          <PaymentCard
            value="cod"
            checked={payment === "cod"}
            onChange={setPayment}
            title="Cash on delivery"
            note={`${formatPKR(cod.deliveryFee)} delivery`}
            total={cod.total}
          />
          <PaymentCard
            value="bank_transfer"
            checked={payment === "bank_transfer"}
            onChange={setPayment}
            title="Bank transfer"
            note="Free delivery"
            total={bank.total}
          />
        </div>
        {state.errors?.payment ? <p className="text-sm text-destructive">{state.errors.payment}</p> : null}

        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-2xl bg-muted p-4 text-sm tabular-nums">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="text-right">{formatPKR(subtotal)}</dd>
          <dt className="text-muted-foreground">Delivery</dt>
          <dd className="text-right">{payment === "cod" ? formatPKR(cod.deliveryFee) : "Free"}</dd>
          <dt className="font-medium">Total</dt>
          <dd className="text-right font-medium">{formatPKR(payment === "cod" ? cod.total : bank.total)}</dd>
          <div className="col-span-2 my-1 h-px bg-hairline" />
          <dt className="font-medium">Send now to confirm</dt>
          <dd className="text-right font-semibold">{formatPKR(payment === "cod" ? cod.advance : bank.total)}</dd>
          {payment === "cod" ? (
            <>
              <dt className="text-muted-foreground">Pay on delivery, in cash</dt>
              <dd data-testid="checkout-on-delivery" className="text-right">
                {formatPKR(cod.onDelivery)}
              </dd>
            </>
          ) : null}
        </dl>
        <p className="text-sm text-muted-foreground">The account to send it to appears as soon as the order is placed.</p>
        <ExchangeTerms />
      </Section>

      <div
        data-testid="checkout-bar"
        data-fixed-bar
        className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:static md:border-0 md:p-0"
      >
        <div className="mx-auto flex max-w-xl items-center gap-4 md:flex-col md:items-stretch md:gap-3">
          <p key={payment} className="flex min-w-0 flex-1 flex-col text-sm animate-in fade-in duration-300 motion-reduce:animate-none md:flex-row md:items-baseline md:gap-2">
            <span className="text-base font-semibold tabular-nums">
              {formatPKR(payment === "cod" ? cod.advance : bank.total)}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums md:text-sm">
              {payment === "cod" ? `to confirm, ${formatPKR(cod.total)} total` : "by bank transfer, free delivery"}
            </span>
          </p>
          <button
            type="submit"
            disabled={pending}
            className={cn(pill, "shrink-0 px-6 disabled:bg-muted disabled:text-muted-foreground md:h-14 md:w-full")}
          >
            {pending ? "Placing order" : "Place order"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="mb-4 text-xl font-semibold tracking-tight">{title}</legend>
      {children}
    </fieldset>
  );
}

type FieldProps = {
  id: string;
  name: CheckoutField;
  label: string;
  error?: string;
  value?: string;
  hint?: string;
  multiline?: boolean;
  type?: string;
  inputMode?: "tel" | "email" | "text";
  autoComplete: string;
  list?: string;
};

// Red belongs to the error line alone, so an invalid field keeps its grey border.
const control =
  "w-full rounded-xl border border-input bg-background px-4 text-base transition-colors placeholder:text-muted-foreground";

function Field({ id, name, label, error, value, hint, multiline, type = "text", inputMode, autoComplete, list }: FieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") || undefined;
  const shared = {
    id,
    name,
    defaultValue: value,
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.9375rem] font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={3} className={cn(control, "min-h-24 resize-none py-3 leading-normal")} />
      ) : (
        <input {...shared} type={type} inputMode={inputMode} list={list} className={cn(control, "h-12")} />
      )}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function PaymentCard({
  value,
  checked,
  onChange,
  title,
  note,
  total,
}: {
  value: PaymentChoice;
  checked: boolean;
  onChange: (value: PaymentChoice) => void;
  title: string;
  note: string;
  total: number;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-xl border border-border px-4 py-3 transition-colors",
        "has-checked:border-foreground has-checked:ring-1 has-checked:ring-foreground",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
      )}
    >
      <input
        type="radio"
        name="payment"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="absolute inset-0 cursor-pointer appearance-none rounded-xl opacity-0"
      />
      <span className="flex flex-col">
        <span className="text-base font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{note}</span>
      </span>
      <span className="text-sm font-medium tabular-nums">{formatPKR(total)}</span>
    </label>
  );
}
