import type { Metadata } from "next";

import { TrackForm } from "@/components/orders/track-form";
import { STORE, whatsappLink } from "@/lib/store";

export const metadata: Metadata = {
  title: "Track your order",
  description: "See where your Klaev order is with its order number and your mobile number.",
};

export default function TrackPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-5 pt-8 pb-16 md:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight">Track your order</h1>
        <p className="text-muted-foreground text-pretty">
          The order number is in your order email and our WhatsApp messages. Or ask us on{" "}
          <a href={whatsappLink("Hi Klaev, where is my order?")} className="text-foreground underline underline-offset-[0.2em] hover:no-underline">
            WhatsApp {STORE.whatsappDisplay}
          </a>
          .
        </p>
      </div>
      <TrackForm />
    </div>
  );
}
