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
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";

import { addToCart, type AddToCartState } from "@/app/actions/cart";
import { RestockNotice } from "@/components/product/restock-notice";
import { notifyCartChanged, openCartDrawer } from "@/components/site/cart-link";
import { BusyLabel } from "@/components/ui/busy-label";
import { limitWords } from "@/lib/cart-codec";
import { FLAGS } from "@/lib/flags";
import { metaEvent } from "@/lib/meta-client";
import { instagramChatLink } from "@/lib/store";
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
  // A new batch is on order and a size is sold out (lib/restock.ts).
  restocking: boolean;
};

const idle: AddToCartState = { status: "idle" };

// The size a link named (?variant=, as search lists each size, and as the address says once a size is
// chosen). Only the browser knows the link: the page is the same for every one, so the server renders
// with none and the browser fills it in.
const noSubscribe = () => () => {};
const linkedVariant = () => new URLSearchParams(window.location.search).get("variant");
const noLink = () => null;

export function PurchasePanel({ price, confirmNow, sizes, singleVariant, sizeGuide, restocking }: Props) {
  const [state, formAction, pending] = useActionState(addToCart, idle);
  // Told only once the action says it's really in the cart.
  useEffect(() => {
    if (state.status !== "added") return;
    metaEvent("AddToCart", { content_ids: [state.variantId], content_type: "product", content_name: state.title, value: state.price, num_items: 1 });
  }, [state]);
  const [selected, setSelected] = useState<SizeOption | null>(null);
  // Opened from one size's link, the page starts with that size chosen, unless it's sold out
  // (Google wants the link to show "the right image, price, and availability"). A size the shopper
  // picks takes over.
  const linkedId = useSyncExternalStore(noSubscribe, linkedVariant, noLink);
  const chosen = selected ?? sizes.find((option) => option.variantId === linkedId && option.available) ?? null;
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
  const shown = state === dismissed ? idle : state;

  const hasSizes = sizes.length > 0;
  const soldOut = hasSizes ? sizes.every((option) => !option.available) : !singleVariant?.available;
  // Sold out with a batch on order: the pill becomes the way to hold one from it.
  const reserve = soldOut && restocking;
  const needsSize = hasSizes && !chosen;
  const limit = shown.status === "limit" ? limitWords(shown.limit, shown.size) : null;

  let label = "Add to cart";
  if (soldOut) label = "Sold out";
  else if (needsSize) label = "Choose a size";
  else if (chosen) label = `Add to cart, size ${chosen.size}`;

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

      {restocking ? <RestockNotice soldOut={soldOut} sized={hasSizes} /> : null}

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
                  checked={chosen?.variantId === option.variantId}
                  onChange={() => {
                    setSelected(option);
                    // The address names the size too, so a copied or shared link keeps it. Replaced,
                    // not pushed, so Back still leaves the jacket in one step.
                    const address = new URL(window.location.href);
                    address.searchParams.set("variant", option.variantId);
                    window.history.replaceState(null, "", address);
                    // What the bar said was about the last size.
                    setDismissed(state);
                  }}
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
            {shown.status === "added" ? (
              <span className="flex flex-col md:flex-row md:gap-2">
                <span className="font-medium">Added to cart</span>
                {/* With the drawer on, the drawer has the way on. */}
                {FLAGS.cartDrawer ? null : (
                  <Link href="/cart" className="text-muted-foreground underline hover:text-foreground">
                    View cart
                  </Link>
                )}
              </span>
            ) : limit ? (
              <span className="flex flex-col">
                <span className="font-medium">{limit.title}</span>
                <span className="text-xs text-muted-foreground md:text-sm">{limit.detail}</span>
              </span>
            ) : shown.status === "error" && !needsSize ? (
              <span className="text-destructive">{shown.message}</span>
            ) : (
              <span className="flex flex-col whitespace-nowrap md:hidden">
                <span className="font-semibold tabular-nums">{price}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{reserve ? "Restocking soon" : `${confirmNow} to confirm`}</span>
              </span>
            )}
          </div>
          {reserve ? (
            <a href={instagramChatLink} target="_blank" rel="noreferrer" data-testid="reserve-link" className={cn(pill, "shrink-0 px-5 md:h-14 md:w-full")}>
              Reserve on Instagram
            </a>
          ) : (
            <button
              ref={buyRef}
              type="submit"
              data-testid="buy-button"
              disabled={soldOut || pending}
              aria-busy={pending}
              onClick={promptForSize}
              className={cn(pill, "shrink-0 px-5 disabled:bg-muted disabled:text-muted-foreground md:h-14 md:w-full")}
            >
              <BusyLabel busy={pending} busyText="Adding">{label}</BusyLabel>
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
