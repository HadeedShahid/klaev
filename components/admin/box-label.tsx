import { cashToCollect, localPhone, PREPAID_PARCEL } from "@/lib/admin/format";
import type { AdminOrder } from "@/lib/admin/orders";
import { formatPKR } from "@/lib/money";

// The label for the outside of the box, so nothing is written by hand: who the parcel goes to, and
// the cash the rider collects or that there is none. Printed at the top of the page, inside a black
// border to cut along, about the size of a courier's label (150 by 100mm), growing taller for a long
// address. Nothing about what's inside, no phone number of the store's, and never the courier's name.
export function BoxLabel({ order }: { order: AdminOrder }) {
  const cash = cashToCollect(order);
  return (
    // White paper whatever the admin's theme, as the other printed documents are.
    <article className="mx-auto my-6 flex min-h-[100mm] w-full max-w-[150mm] flex-col border-[1.5px] border-black bg-white px-6 py-5 text-black print:my-0 print:break-inside-avoid">
      <header className="flex items-baseline justify-between gap-4 border-b border-black pb-3">
        <p className="text-[17px] font-semibold tracking-[0.28em] uppercase">Klaev</p>
        <p className="text-[18px] font-semibold tabular-nums">Order #{order.number}</p>
      </header>

      <section className="flex flex-1 flex-col gap-1 py-4">
        <p className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">To</p>
        <p className="text-[24px] leading-tight font-semibold">{order.name}</p>
        {order.phone ? <p className="text-[24px] leading-tight font-semibold tabular-nums">{localPhone(order.phone)}</p> : null}
        {order.address1 ? <p className="mt-1 text-[18px] leading-snug">{order.address1}</p> : null}
        {order.city ? <p className="text-[20px] leading-snug font-semibold">{order.city}</p> : null}
      </section>

      <footer className="border-t border-black pt-3">
        <p className="text-[28px] leading-tight font-semibold tabular-nums">{cash > 0 ? `COD ${formatPKR(cash)}` : PREPAID_PARCEL}</p>
      </footer>
    </article>
  );
}
