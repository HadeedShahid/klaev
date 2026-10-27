"use client";

import { Plus, X } from "lucide-react";
import { startTransition, useActionState, useId, useState, type FormEvent } from "react";

import type { ActionState } from "@/app/actions/admin";
import { manualOrderAction } from "@/app/actions/admin-orders";
import { Field } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SellableProduct } from "@/lib/admin/order-changes";
import { formatPKR } from "@/lib/money";
import { adminField } from "@/lib/styles";
import { cn } from "@/lib/utils";

type Line = { key: number; productId: number; variantId: number; quantity: number; price: string };
type Method = "cod" | "bank_transfer" | "in_person";

const METHODS: { value: Method; label: string; note: string }[] = [
  { value: "cod", label: "Cash on delivery", note: "An advance now, the rest to the rider" },
  { value: "bank_transfer", label: "Bank transfer", note: "The whole amount up front" },
  { value: "in_person", label: "In person", note: "Paid and handed over" },
];

const amount = (value: string) => Number(value.replace(/[,\s]/g, "")) || 0;

// An order taken on WhatsApp, Instagram or in person: the items at the price agreed, the customer,
// and how they pay. Prices start at the store's; change them for a bargain.
export function ManualOrderForm({ catalog, codDeliveryFee, codAdvance }: { catalog: SellableProduct[]; codDeliveryFee: number; codAdvance: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(manualOrderAction, null);
  const [lines, setLines] = useState<Line[]>([]);
  const [adding, setAdding] = useState("");
  const [method, setMethod] = useState<Method>("cod");
  const [discount, setDiscount] = useState("");
  const [delivery, setDelivery] = useState(String(codDeliveryFee));
  // The advance follows the usual one, never more than the total, until it's typed over.
  const [typedAdvance, setAdvance] = useState<string | null>(null);
  const id = useId();

  const product = (productId: number) => catalog.find((candidate) => candidate.productId === productId);
  const update = (key: number, change: Partial<Line>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)));
  const add = () => {
    const chosen = product(Number(adding));
    const size = chosen?.sizes.find((candidate) => candidate.stock > 0);
    if (!chosen || !size) return;
    setLines((current) => [...current, { key: Date.now(), productId: chosen.productId, variantId: size.variantId, quantity: 1, price: String(chosen.price) }]);
    setAdding("");
  };
  const choose = (next: Method) => {
    setMethod(next);
    setDelivery(next === "cod" ? String(codDeliveryFee) : "0");
  };
  // Sent through a transition rather than the form's action, so a refused order keeps what was typed.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
  const subtotal = lines.reduce((sum, line) => sum + amount(line.price) * line.quantity, 0);
  const total = Math.max(0, subtotal - amount(discount)) + amount(delivery);
  const advance = typedAdvance ?? String(Math.min(codAdvance, total));
  const advanceTooHigh = method === "cod" && amount(advance) > total;

  return (
    <form action={action} onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity, unitPrice: amount(line.price) })))}
      />
      <input type="hidden" name="paymentMethod" value={method} />

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
            <CardDescription>Stock is taken when the order is created.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {lines.length === 0 ? <p className="text-sm text-muted-foreground">Nothing added yet.</p> : null}
            <ul className="flex flex-col gap-3">
              {lines.map((line) => {
                const item = product(line.productId);
                return (
                  <li key={line.key} className="flex flex-col gap-2 rounded-xl border border-hairline p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{item?.title}</p>
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${item?.title}`} onClick={() => setLines((current) => current.filter((other) => other.key !== line.key))}>
                        <X strokeWidth={1.8} aria-hidden />
                      </Button>
                    </div>
                    <div className="grid grid-cols-[1fr_4.5rem_7rem] gap-2">
                      <select aria-label="Size" value={line.variantId} onChange={(event) => update(line.key, { variantId: Number(event.target.value) })} className={adminField}>
                        {item?.sizes.map((size) => (
                          <option key={size.variantId} value={size.variantId} disabled={size.stock === 0}>
                            {size.size ?? "One size"}, {size.stock === 0 ? "sold out" : `${size.stock} in stock`}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Quantity"
                        type="number"
                        min={1}
                        max={20}
                        value={line.quantity}
                        onChange={(event) => update(line.key, { quantity: Math.max(1, Math.floor(Number(event.target.value)) || 1) })}
                        className={cn(adminField, "tabular-nums")}
                      />
                      <input aria-label="Price each, PKR" inputMode="numeric" value={line.price} onChange={(event) => update(line.key, { price: event.target.value })} className={cn(adminField, "tabular-nums")} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2">
              <label htmlFor={`${id}-add`} className="sr-only">
                Add a jacket or belt
              </label>
              <select id={`${id}-add`} value={adding} onChange={(event) => setAdding(event.target.value)} className={adminField}>
                <option value="">Add a jacket or belt</option>
                {catalog.map((item) => (
                  <option key={item.productId} value={item.productId} disabled={item.sizes.every((size) => size.stock === 0)}>
                    {item.title}, {formatPKR(item.price)}
                    {item.sizes.every((size) => size.stock === 0) ? ", sold out" : ""}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={add} disabled={!adding}>
                <Plus data-icon="inline-start" strokeWidth={1.8} aria-hidden />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div role="radiogroup" aria-label="How they pay" className="grid gap-2 sm:grid-cols-3">
              {METHODS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer flex-col gap-0.5 rounded-xl border border-input px-3 py-2.5 text-sm has-checked:border-foreground has-checked:ring-1 has-checked:ring-foreground"
                >
                  <input type="radio" name="method-choice" value={option.value} checked={method === option.value} onChange={() => choose(option.value)} className="sr-only" />
                  <span className="font-medium">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.note}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field id={`${id}-discount`} name="discount" label="Discount, PKR" inputMode="numeric" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="0" />
              <Field id={`${id}-delivery`} name="deliveryFee" label="Delivery, PKR" inputMode="numeric" value={delivery} onChange={(event) => setDelivery(event.target.value)} />
              {method === "cod" ? (
                <Field
                  id={`${id}-advance`}
                  name="advance"
                  label="Advance, PKR"
                  inputMode="numeric"
                  value={advance}
                  onChange={(event) => setAdvance(event.target.value)}
                  aria-invalid={advanceTooHigh || undefined}
                />
              ) : null}
            </div>
            {advanceTooHigh ? (
              <p role="alert" className="-mt-2 text-sm text-destructive">
                The advance is more than the total of {formatPKR(total)}.
              </p>
            ) : null}
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 rounded-xl bg-muted p-4 text-sm tabular-nums">
              <dt className="text-muted-foreground">Items</dt>
              <dd className="text-right">{formatPKR(subtotal)}</dd>
              {amount(discount) > 0 ? (
                <>
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="text-right">−{formatPKR(Math.min(amount(discount), subtotal))}</dd>
                </>
              ) : null}
              <dt className="text-muted-foreground">Delivery</dt>
              <dd className="text-right">{amount(delivery) > 0 ? formatPKR(amount(delivery)) : "Free"}</dd>
              <dt className="font-medium">Total</dt>
              <dd className="text-right font-medium">{formatPKR(total)}</dd>
              {method === "cod" ? (
                <>
                  <dt className="text-muted-foreground">The rider collects</dt>
                  <dd className="text-right">{formatPKR(Math.max(0, total - amount(advance)))}</dd>
                </>
              ) : null}
            </dl>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" name="received" className="mt-0.5 size-4 accent-foreground" />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">
                  {method === "cod" ? "The advance is in" : method === "bank_transfer" ? "The transfer is in" : "Paid, and handed over"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {method === "in_person" ? "Records the cash and marks it delivered." : "Records the payment and confirms the order. Leave it for later otherwise."}
                </span>
              </span>
            </label>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
            <CardDescription>Someone who has ordered before is matched by their number.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Field id={`${id}-name`} name="name" label="Name" required autoComplete="off" />
            <Field id={`${id}-phone`} name="phone" label="Mobile number" inputMode="tel" required autoComplete="off" placeholder="0300 1234567" />
            <Field id={`${id}-email`} name="email" label="Email" type="email" autoComplete="off" hint="Optional." />
            <Field id={`${id}-city`} name="city" label="City" autoComplete="off" />
            <Field id={`${id}-address`} name="address" label="Address" autoComplete="off" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Note</CardTitle>
          </CardHeader>
          <CardContent>
            <label htmlFor={`${id}-note`} className="sr-only">
              Note
            </label>
            <textarea id={`${id}-note`} name="note" rows={3} placeholder="Where it came from, what was agreed" className={cn(adminField, "h-auto resize-none py-2 leading-normal")} />
          </CardContent>
        </Card>
        {state && "error" in state ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending || lines.length === 0 || advanceTooHigh} className="h-10">
          {pending ? "Creating" : "Create order"}
        </Button>
        {lines.length === 0 ? <p className="-mt-2 text-xs text-muted-foreground">Add an item first. The customer&apos;s name and number are needed too.</p> : null}
      </div>
    </form>
  );
}
