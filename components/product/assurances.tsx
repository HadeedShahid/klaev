import { MessageCircle, Repeat2, Truck } from "lucide-react";

import { STORE, whatsappLink } from "@/lib/store";

export function Assurances({ productTitle }: { productTitle: string }) {
  return (
    <ul className="flex flex-col gap-3 text-sm">
      <li className="flex gap-3">
        <Truck className="mt-0.5 size-4.5 shrink-0" strokeWidth={1.6} aria-hidden />
        <span>Delivered to any city in Pakistan, usually in {STORE.deliveryDays} days.</span>
      </li>
      <li className="flex gap-3">
        <Repeat2 className="mt-0.5 size-4.5 shrink-0" strokeWidth={1.6} aria-hidden />
        <span>
          Size exchanges within {STORE.exchangeDays} days of delivery. Unworn, tags on. You cover delivery both
          ways. No refunds.
        </span>
      </li>
      <li className="flex gap-3">
        <MessageCircle className="mt-0.5 size-4.5 shrink-0" strokeWidth={1.6} aria-hidden />
        <span>
          Questions about fit?{" "}
          <a
            href={whatsappLink(`Hi Klaev, I have a question about the ${productTitle}.`)}
            className="font-medium underline hover:no-underline"
          >
            WhatsApp us
          </a>
        </span>
      </li>
    </ul>
  );
}
