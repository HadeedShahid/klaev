"use client";

import { Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { loadCart, removeFromCart } from "@/app/actions/cart";
import type { CartView } from "@/lib/cart";
import { formatPKR } from "@/lib/money";
import { codSummary, type CodTerms } from "@/lib/payment";
import { pill } from "@/lib/styles";

import { notifyCartChanged, OPEN_CART_EVENT } from "./cart-link";

// The cart as a drawer over the page (behind FLAGS.cartDrawer). It opens from the cart icon and
// after Add to cart, loads the cart from the server each time, and closes on Esc, the close button,
// a tap outside it, or any link inside it. A native modal <dialog>, so focus stays inside. It opens
// on its title rather than the close button, so a tap doesn't greet the shopper with a focus ring.
export function CartDrawer({ terms }: { terms: CodTerms }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartView | null>(null);
  const titleId = useId();

  const refresh = useCallback(async () => setCart(await loadCart()), []);

  useEffect(() => {
    function onOpen(event: Event) {
      trigger.current = (event as CustomEvent<{ trigger: HTMLElement | null }>).detail?.trigger ?? null;
      setOpen(true);
      void refresh();
    }
    window.addEventListener(OPEN_CART_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CART_EVENT, onOpen);
  }, [refresh]);

  useLayoutEffect(() => {
    if (!open || dialog.current?.open) return;
    dialog.current?.showModal();
    heading.current?.focus();
  }, [open]);

  function close() {
    dialog.current?.close();
  }

  function onClose() {
    setOpen(false);
    trigger.current?.focus();
  }

  async function remove(variantId: string) {
    const form = new FormData();
    form.set("variantId", variantId);
    await removeFromCart(form);
    notifyCartChanged();
    await refresh();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="cart-drawer m-0 ml-auto h-dvh max-h-none w-full max-w-md border-0 bg-background p-0 text-foreground"
    >
      {open ? (
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-5">
            <h2 ref={heading} id={titleId} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
              Cart
            </h2>
            <button
              type="button"
              aria-label="Close cart"
              onClick={close}
              className="-mr-2 flex size-11 items-center justify-center rounded-full transition-colors hover:bg-accent"
            >
              <X className="size-5" strokeWidth={1.6} aria-hidden />
            </button>
          </div>

          {cart === null ? (
            <div aria-hidden className="flex flex-col gap-4 p-5">
              <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            </div>
          ) : cart.lines.length === 0 ? (
            <div className="flex flex-col items-start gap-4 p-5">
              <p className="font-medium">Your cart is empty</p>
              <Link href="/collections/all" onClick={close} className={pill}>
                See all products
              </Link>
            </div>
          ) : (
            <>
              <ul className="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto px-5">
                {cart.lines.map((line) => {
                  const size = line.size ? `, size ${line.size}` : "";
                  return (
                    <li key={line.variantId} className="flex gap-4 py-4">
                      {line.image ? (
                        <Image
                          src={line.image.src}
                          width={line.image.width}
                          height={line.image.height}
                          alt=""
                          sizes="80px"
                          loading="eager"
                          className="aspect-4/5 w-16 shrink-0 rounded-xl bg-muted object-cover"
                        />
                      ) : null}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <Link
                          href={`/products/${line.handle}`}
                          onClick={close}
                          className="text-[0.9375rem] font-medium text-balance hover:underline"
                        >
                          {line.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {line.size ? `Size ${line.size}` : "One size"}
                          {line.quantity > 1 ? `, quantity ${line.quantity}` : null}
                        </p>
                        <p className="text-sm font-medium tabular-nums">{formatPKR(line.lineTotal)}</p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${line.title}${size}`}
                        onClick={() => void remove(line.variantId)}
                        className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Trash2 className="size-4.5" strokeWidth={1.6} aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex shrink-0 flex-col gap-3 border-t border-hairline px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium">Subtotal</p>
                  <p data-testid="drawer-subtotal" className="text-lg font-semibold tabular-nums">
                    {formatPKR(cart.subtotal)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cash on delivery: send {formatPKR(codSummary(cart.subtotal, { advance: terms.codAdvance, deliveryFee: terms.codDeliveryFee }).advance)} now and pay the
                  rest at the door, plus {formatPKR(terms.codDeliveryFee)} delivery. Bank transfer delivers free.
                </p>
                <Link href="/checkout" onClick={close} className={`${pill} h-14 w-full`}>
                  Checkout
                </Link>
                <Link
                  href="/cart"
                  onClick={close}
                  className="flex h-11 items-center justify-center text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  View cart
                </Link>
              </div>
            </>
          )}
        </div>
      ) : null}
    </dialog>
  );
}
