"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { applyDiscount, checkout, saveCheckoutDraft, type AppliedDiscount, type CheckoutState } from "@/app/actions/checkout";
import { ExchangeTerms } from "@/components/site/exchange-terms";
import type { CheckoutField, PaymentChoice } from "@/lib/checkout";
import { CITIES } from "@/lib/cities";
import { formatPKR } from "@/lib/money";
import { bankTransferSummary, codSummary, type CodTerms } from "@/lib/payment";
import { STORE } from "@/lib/store";
import { pill } from "@/lib/styles";
import { cn } from "@/lib/utils";

export function CheckoutForm({ subtotal, terms }: { subtotal: number; terms: CodTerms }) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(checkout, {});
  const [payment, setPayment] = useState<PaymentChoice>("cod");
  const [discount, setDiscount] = useState<AppliedDiscount | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  // After a failed attempt, take the shopper straight to the first thing to fix.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [role='alert']")?.focus();
  }, [state]);

  // Once the phone number is in, what's typed is saved as the shopper leaves each field, so Klaev
  // can follow up on WhatsApp if the order isn't placed. Only changes are sent.
  const saved = useRef("");
  function saveDraft(form: HTMLFormElement) {
    const data = new FormData(form);
    const fields = { name: "", email: "", phone: "", city: "", address: "" };
    for (const key of Object.keys(fields) as (keyof typeof fields)[]) fields[key] = String(data.get(key) ?? "");
    if (fields.phone.replace(/\D/g, "").length < 10) return;
    const snapshot = JSON.stringify(fields);
    if (snapshot === saved.current) return;
    saved.current = snapshot;
    saveCheckoutDraft(fields).catch(() => {
      saved.current = "";
    });
  }

  // Submitted through a transition rather than the form's action, so React keeps what was typed.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  const off = discount?.amount ?? 0;
  const cod = codSummary(subtotal, { discount: off, advance: terms.codAdvance, deliveryFee: discount?.freeDelivery ? 0 : terms.codDeliveryFee });
  const bank = bankTransferSummary(subtotal, off);
  const field = (name: CheckoutField) => ({ name, id: `${id}-${name}`, error: state.errors?.[name], value: state.fields?.[name] });

  return (
    <form ref={formRef} action={formAction} onSubmit={submit} onBlur={(event) => saveDraft(event.currentTarget)} noValidate className="flex flex-col gap-10">
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
            note={cod.deliveryFee ? `${formatPKR(cod.deliveryFee)} delivery` : "Free delivery"}
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

        <DiscountCode id={`${id}-discount`} applied={discount} onChange={setDiscount} />

        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-2xl bg-muted p-4 text-sm tabular-nums">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="text-right">{formatPKR(subtotal)}</dd>
          {off > 0 ? (
            <>
              <dt className="text-muted-foreground">Discount ({discount?.code})</dt>
              <dd data-testid="checkout-discount" className="text-right">
                −{formatPKR(off)}
              </dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">Delivery</dt>
          <dd className="text-right">{payment === "cod" && cod.deliveryFee ? formatPKR(cod.deliveryFee) : "Free"}</dd>
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

// A code typed and applied here; only an applied code goes with the order. The field is read when
// Apply is pressed, so a code typed while the page was still loading counts too.
function DiscountCode({ id, applied, onChange }: { id: string; applied: AppliedDiscount | null; onChange: (discount: AppliedDiscount | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function apply() {
    const typed = input.current?.value ?? "";
    if (!typed.trim()) return setError("Enter a code.");
    setChecking(true);
    const result = await applyDiscount(typed);
    setChecking(false);
    if (result.ok) {
      onChange(result.discount);
      setError(null);
    } else {
      setError(result.message);
    }
  }

  if (applied) {
    return (
      <div className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-border px-4 py-2">
        <input type="hidden" name="discountCode" value={applied.code} />
        <p className="flex flex-col text-sm">
          <span className="font-medium tracking-wide">{applied.code}</span>
          <span className="text-xs text-muted-foreground">{applied.label}</span>
        </p>
        <button type="button" onClick={() => onChange(null)} className="text-sm underline underline-offset-[0.2em] hover:no-underline">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.9375rem] font-medium">
        Discount code
      </label>
      <div className="flex gap-2">
        <input
          ref={input}
          id={id}
          // Enter applies the code here; it never places the order.
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void apply();
            }
          }}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(control, "h-12 min-w-0 flex-1 uppercase placeholder:normal-case")}
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={checking}
          className="h-12 shrink-0 rounded-full border border-border px-5 text-sm font-medium transition-colors hover:bg-muted disabled:text-muted-foreground"
        >
          {checking ? "Checking" : "Apply"}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="status" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
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
