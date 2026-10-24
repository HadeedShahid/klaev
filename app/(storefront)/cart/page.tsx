import { X } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { removeFromCart } from "@/app/actions/cart";
import { PaymentOptions } from "@/components/product/payment-options";
import { ExchangeTerms } from "@/components/site/exchange-terms";
import { getCartView } from "@/lib/cart";
import { formatPKR } from "@/lib/money";
import { orderMessage } from "@/lib/order-message";
import { whatsappLink } from "@/lib/store";
import { pill } from "@/lib/styles";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pt-8 pb-16 md:px-8">
      <h1 className="text-[2rem] leading-tight font-semibold tracking-tight">Cart</h1>
      <Suspense fallback={<CartSkeleton />}>
        <CartContents />
      </Suspense>
    </div>
  );
}

async function CartContents() {
  const cart = await getCartView();

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl bg-muted p-6">
        <p className="font-medium">Your cart is empty</p>
        <Link
          href="/"
          className={pill}
        >
          See all products
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ul className="divide-y divide-hairline border-y border-hairline">
        {cart.lines.map((line) => {
          const sizeLabel = line.size ? `, size ${line.size}` : "";
          return (
            <li key={line.variantId} className="flex gap-4 py-4">
              {line.image ? (
                <Image
                  src={line.image.src}
                  width={line.image.width}
                  height={line.image.height}
                  alt=""
                  sizes="96px"
                  className="aspect-4/5 w-20 shrink-0 rounded-xl bg-muted object-cover"
                />
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/products/${line.handle}`} className="font-medium text-balance hover:underline">
                  {line.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {line.size ? `Size ${line.size}` : "One size"}
                  {line.quantity > 1 ? `, quantity ${line.quantity}` : null}
                </p>
                <p className="text-sm font-medium tabular-nums">{formatPKR(line.lineTotal)}</p>
              </div>
              <form action={removeFromCart}>
                <input type="hidden" name="variantId" value={line.variantId} />
                <button
                  type="submit"
                  aria-label={`Remove ${line.title}${sizeLabel}`}
                  className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4.5" aria-hidden />
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      <div className="flex items-baseline justify-between">
        <p className="font-medium">Subtotal</p>
        <p data-testid="cart-subtotal" className="text-lg font-semibold tabular-nums">
          {formatPKR(cart.subtotal)}
        </p>
      </div>

      <PaymentOptions id="cart" subtotal={cart.subtotal} />
      <ExchangeTerms />

      <div className="flex flex-col gap-2">
        <a
          href={whatsappLink(orderMessage(cart.lines, cart.subtotal))}
          className={`${pill} h-14`}
        >
          Order on WhatsApp
        </a>
        <p className="text-center text-sm text-muted-foreground">
          Online checkout opens soon. Until then, send your order on WhatsApp and we confirm it there.
        </p>
      </div>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
