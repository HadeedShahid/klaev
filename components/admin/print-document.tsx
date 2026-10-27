import { dateTime, localPhone } from "@/lib/admin/format";
import { PAYMENT_LABELS } from "@/lib/admin/labels";
import type { AdminOrder } from "@/lib/admin/orders";
import { formatPKR } from "@/lib/money";
import { STORE } from "@/lib/store";

export type PrintKind = "slip" | "invoice";

// One order on one printed page: a packing slip for the parcel (what's in it, where it goes, what
// the rider collects), or an invoice with the prices. Black on white, nothing that needs colour.
export function PrintDocument({ order, kind, exchangeFor = null }: { order: AdminOrder; kind: PrintKind; exchangeFor?: number | null }) {
  const cod = order.paymentMethod === "cod";
  const collect = cod ? Math.max(0, order.total - order.paid - order.codTax) : 0;
  const balance = Math.max(0, order.total - order.paid - order.codTax);
  return (
    // The paper itself is white whatever the admin's theme, so on a dark screen it reads as a sheet.
    <article className="mx-auto my-6 flex max-w-[180mm] flex-col gap-8 bg-white px-8 py-10 text-sm leading-relaxed text-black break-after-page last:break-after-auto sm:px-12 print:my-0 print:px-0 print:py-0">
      <header className="flex items-start justify-between gap-6 border-b border-black pb-4">
        <div className="flex flex-col gap-1">
          <p className="text-[17px] font-semibold tracking-[0.28em] uppercase">Klaev</p>
          <p className="text-neutral-600">
            {STORE.email} · WhatsApp {STORE.whatsappDisplay}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <p className="text-[17px] font-semibold">{kind === "slip" ? "Packing slip" : "Invoice"}</p>
          <p className="tabular-nums">Order #{order.number}</p>
          <p className="text-neutral-600 tabular-nums">{dateTime(order.createdAt)}</p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">{kind === "slip" ? "Ship to" : "Bill to"}</p>
          <p className="font-semibold">{order.name}</p>
          {order.phone ? <p className="tabular-nums">{localPhone(order.phone)}</p> : null}
          {order.address1 ? <p>{order.address1}</p> : null}
          {order.city ? <p>{order.city}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <p className="text-xs font-semibold tracking-wide text-neutral-600 uppercase">Payment</p>
          <p>{PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</p>
          {kind === "slip" ? (
            <p className="text-[15px] font-semibold tabular-nums">{collect > 0 ? `Collect ${formatPKR(collect)}` : "Nothing to collect"}</p>
          ) : (
            <p className="tabular-nums">{balance > 0 ? `${formatPKR(balance)} still due` : "Paid"}</p>
          )}
          {order.trackingNumber ? <p className="text-neutral-600 tabular-nums">Tracking {order.trackingNumber}</p> : null}
        </div>
      </section>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black text-left text-xs tracking-wide text-neutral-600 uppercase">
            {kind === "slip" ? <th className="w-8 py-2 font-semibold" aria-label="Packed" /> : null}
            <th className="py-2 font-semibold">Item</th>
            <th className="py-2 font-semibold">Size</th>
            <th className="py-2 text-right font-semibold">Qty</th>
            {kind === "invoice" ? <th className="py-2 text-right font-semibold">Price</th> : null}
            {kind === "invoice" ? <th className="py-2 text-right font-semibold">Amount</th> : null}
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.id} className="border-b border-neutral-300 align-top">
              {kind === "slip" ? (
                <td className="py-2.5">
                  <span aria-hidden className="mt-0.5 block size-3.5 border border-black" />
                </td>
              ) : null}
              <td className="py-2.5 pr-4">
                {line.title}
                {line.sku ? <span className="block text-xs text-neutral-600">{line.sku}</span> : null}
              </td>
              <td className="py-2.5 pr-4">{line.size ?? "One size"}</td>
              <td className="py-2.5 text-right tabular-nums">{line.quantity}</td>
              {kind === "invoice" ? (
                exchangeFor && line.unitPrice === 0 ? (
                  <td colSpan={2} className="py-2.5 text-right">
                    No charge, exchange for #{exchangeFor}
                  </td>
                ) : (
                  <>
                    <td className="py-2.5 text-right tabular-nums">{formatPKR(line.unitPrice)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formatPKR(line.unitPrice * line.quantity)}</td>
                  </>
                )
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {kind === "invoice" ? (
        <dl className="ml-auto grid w-72 grid-cols-[1fr_auto] gap-x-6 gap-y-1 tabular-nums">
          <dt>Subtotal</dt>
          <dd className="text-right">{formatPKR(order.subtotal)}</dd>
          {order.discountTotal > 0 ? (
            <>
              <dt>Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
              <dd className="text-right">−{formatPKR(order.discountTotal)}</dd>
            </>
          ) : null}
          <dt>Delivery</dt>
          <dd className="text-right">{order.deliveryFee > 0 ? formatPKR(order.deliveryFee) : "Free"}</dd>
          <div aria-hidden className="col-span-2 my-1 h-px bg-black" />
          <dt className="font-semibold">Total</dt>
          <dd className="text-right font-semibold">{formatPKR(order.total)}</dd>
          <dt>Paid</dt>
          <dd className="text-right">{formatPKR(order.paid)}</dd>
          {balance > 0 ? (
            <>
              <dt className="font-semibold">{cod ? "Cash on delivery" : "Still due"}</dt>
              <dd className="text-right font-semibold">{formatPKR(balance)}</dd>
            </>
          ) : null}
        </dl>
      ) : order.note ? (
        <p className="border border-neutral-300 p-3">
          <span className="font-semibold">Note: </span>
          {order.note}
        </p>
      ) : null}

      <footer className="mt-auto border-t border-neutral-300 pt-4 text-neutral-600">
        Size exchanges within 7 days of delivery. Unworn, tags on. You cover delivery both ways. No refunds. Questions: WhatsApp {STORE.whatsappDisplay}.
      </footer>
    </article>
  );
}
