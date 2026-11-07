import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ReviewForm } from "@/components/orders/review-form";
import { getDb } from "@/lib/db";
import { shownName } from "@/lib/review-rules";
import { reviewableOrder } from "@/lib/reviews";

// Behind the order's private link, like the order page: never cached or indexed, and no referrer.
export const metadata: Metadata = { title: "Write a review", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ReviewPage({ params }: PageProps<"/orders/[token]/review">) {
  await connection();
  const { token } = await params;
  const order = await reviewableOrder(await getDb(), token);
  if (!order) notFound();
  const waiting = order.items.filter((item) => item.reviewId === null);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-10 px-5 pt-8 pb-16 md:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight text-balance">How is it?</h1>
        <p className="text-lg text-muted-foreground text-pretty">
          {!order.open
            ? "Reviews open once your order is delivered."
            : order.items.length === 0
              ? "There's nothing in this order to review any more."
              : waiting.length === 0
              ? "Your review is in. Thank you."
              : "Tell other buyers what you think. A star rating is enough."}
        </p>
      </div>

      {order.open
        ? waiting.map((item) => (
            <section key={item.lineId} aria-label={item.title} className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                {item.image ? (
                  <Image src={item.image.src} width={item.image.width} height={item.image.height} alt="" sizes="64px" loading="eager" className="size-16 shrink-0 rounded-xl bg-muted object-cover" />
                ) : null}
                <div className="flex min-w-0 flex-col">
                  <p className="font-medium text-balance">{item.title}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{[item.size ? `Size ${item.size}` : null, `order #${order.number}`].filter(Boolean).join(", ")}</p>
                </div>
              </div>
              <ReviewForm token={token} lineId={item.lineId} name={shownName(order.name)} city={order.city} />
            </section>
          ))
        : null}

      <Link href={`/orders/${token}`} className="text-sm underline underline-offset-[0.2em] hover:no-underline">
        Back to your order
      </Link>
    </div>
  );
}
