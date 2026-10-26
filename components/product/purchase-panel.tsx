"use client";

import Link from "next/link";
import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { addToCart, type AddToCartState } from "@/app/actions/cart";
import { notifyCartChanged, openCartDrawer } from "@/components/site/cart-link";
import { FLAGS } from "@/lib/flags";
import { pill } from "@/lib/styles";
import { cn } from "@/lib/utils";

type SizeOption = { variantId: string; size: string; measurement: string | null; available: boolean };

type Props = {
  price: string;
  // The cash-on-delivery advance for this item, already formatted: what is sent now to confirm.
  confirmNow: string;
  sizes: SizeOption[];
  // Set for one-size products such as belts.
  singleVariant: { variantId: string; available: boolean } | null;
  sizeGuide: ReactNode;
};

const idle: AddToCartState = { status: "idle" };

export function PurchasePanel({ price, confirmNow, sizes, singleVariant, sizeGuide }: Props) {
  const [state, formAction, pending] = useActionState(addToCart, idle);
  const [selected, setSelected] = useState<SizeOption | null>(null);
  const sizesRef = useRef<HTMLDivElement>(null);
  const sizeLabelId = useId();

  // Next.js keeps this page mounted but hidden after navigating away. Coming back should not
  // still say "Added to cart", so the confirmation is dismissed when the page is hidden.
  const [dismissed, setDismissed] = useState<AddToCartState | null>(null);
  const latest = useRef(state);
  useLayoutEffect(() => {
    latest.current = state;
  });
  useLayoutEffect(() => () => setDismissed(latest.current), []);
  const buyRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (state.status !== "added") return;
    notifyCartChanged();
    if (FLAGS.cartDrawer) openCartDrawer(buyRef.current);
  }, [state]);
  const added = state.status === "added" && state !== dismissed;

  const hasSizes = sizes.length > 0;
  const soldOut = hasSizes ? sizes.every((option) => !option.available) : !singleVariant?.available;
  const needsSize = hasSizes && !selected;

  let label = "Add to cart";
  if (soldOut) label = "Sold out";
  else if (pending) label = "Adding";
  else if (needsSize) label = "Choose a size";
  else if (selected) label = `Add to cart, size ${selected.size}`;

  function promptForSize(event: React.MouseEvent<HTMLButtonElement>) {
    if (!needsSize) return;
    event.preventDefault();
    const group = sizesRef.current;
    group?.scrollIntoView({ behavior: "smooth", block: "center" });
    group?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus({ preventScroll: true });
  }

  // Submitting through the handler skips React's automatic form reset, which would untick the
  // chosen size after every add. The action prop stays for browsers that haven't loaded JavaScript.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={submit} className="flex flex-col gap-4">
      {singleVariant ? <input type="hidden" name="variantId" value={singleVariant.variantId} /> : null}

      {hasSizes ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <p id={sizeLabelId} className="text-[0.9375rem] font-medium">
              Size
            </p>
            {needsSize && state.status === "error" ? (
              <p className="text-sm text-destructive">{state.message}</p>
            ) : null}
          </div>
          <div
            ref={sizesRef}
            role="radiogroup"
            aria-labelledby={sizeLabelId}
            className="grid scroll-mt-24 grid-cols-2 gap-2"
          >
            {sizes.map((option) => (
              <label
                key={option.variantId}
                className={cn(
                  "relative flex min-h-16 cursor-pointer flex-col justify-center gap-0.5 rounded-xl border border-border px-4 py-3 transition-colors",
                  "has-checked:border-foreground has-checked:ring-1 has-checked:ring-foreground",
                  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
                  "has-disabled:cursor-not-allowed has-disabled:bg-muted has-disabled:text-muted-foreground",
                )}
              >
                <input
                  type="radio"
                  name="variantId"
                  value={option.variantId}
                  disabled={!option.available}
                  // Controlled, because React resets a form's fields after its action finishes.
                  checked={selected?.variantId === option.variantId}
                  onChange={() => setSelected(option)}
                  className="absolute inset-0 cursor-pointer appearance-none rounded-xl opacity-0 disabled:cursor-not-allowed"
                />
                <span className="text-base font-semibold">{option.size}</span>
                {option.measurement ? (
                  <span className="text-xs text-muted-foreground">{option.measurement}</span>
                ) : null}
                {option.available ? null : <span className="text-xs font-medium">Sold out</span>}
              </label>
            ))}
          </div>
          {sizeGuide}
        </div>
      ) : null}

      <div
        data-testid="buy-bar"
        data-fixed-bar
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          "md:static md:border-0 md:bg-transparent md:p-0",
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 md:flex-col md:items-stretch md:gap-3">
          <div role="status" className="min-w-0 flex-1 text-sm md:order-last">
            {added ? (
              <span className="flex flex-col md:flex-row md:gap-2">
                <span className="font-medium">Added to cart</span>
                {/* With the drawer on, the drawer has the way on. */}
                {FLAGS.cartDrawer ? null : (
                  <Link href="/cart" className="text-muted-foreground underline hover:text-foreground">
                    View cart
                  </Link>
                )}
              </span>
            ) : (
              <span className="flex flex-col whitespace-nowrap md:hidden">
                <span className="font-semibold tabular-nums">{price}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{confirmNow} to confirm</span>
              </span>
            )}
          </div>
          <button
            ref={buyRef}
            type="submit"
            data-testid="buy-button"
            disabled={soldOut || pending}
            onClick={promptForSize}
            className={cn(pill, "shrink-0 px-5 disabled:bg-muted disabled:text-muted-foreground md:h-14 md:w-full")}
          >
            {label}
          </button>
        </div>
      </div>
    </form>
  );
}
