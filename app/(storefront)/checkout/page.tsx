import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { OrderLines } from "@/components/checkout/order-lines";
import { CartCountSync } from "@/components/site/cart-link";
import { getCartView } from "@/lib/cart";
import { pill } from "@/lib/styles";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

// One scrolling page: what is being bought, contact, delivery, how you pay. The bar fixed to the
// bottom always says what to send now, and changes with the way to pay.
export default function CheckoutPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-5 pt-8 pb-16 md:px-8">
      <h1 className="text-[2rem] leading-tight font-semibold tracking-tight">Checkout</h1>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutContents />
      </Suspense>
    </div>
  );
}

async function CheckoutContents() {
  const cart = await getCartView();

  if (cart.lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-2xl bg-muted p-6">
        <CartCountSync count={0} />
        <p className="font-medium">Your cart is empty</p>
        <Link href="/" className={pill}>
          See all products
        </Link>
      </div>
    );
  }

  return (
    <>
      <OrderLines
        lines={cart.lines.map((line) => ({
          key: line.variantId,
          title: line.title,
          size: line.size,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
          image: line.image,
        }))}
      />
      <CheckoutForm subtotal={cart.subtotal} />
    </>
  );
}

function CheckoutSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="h-64 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
