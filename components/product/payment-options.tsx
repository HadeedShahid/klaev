import { formatPKR } from "@/lib/money";
import { bankTransferSummary, codSummary, type CodTerms } from "@/lib/payment";
import { cn } from "@/lib/utils";

// The two ways to pay, with the real numbers for this amount. Shared by the product page and the cart.
// `id` must be unique per page: Next.js keeps recently visited pages mounted, hidden, in the same document.
export function PaymentOptions({ id, subtotal, terms }: { id: string; subtotal: number; terms: CodTerms }) {
  const headingId = `how-you-pay-${id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="text-[0.9375rem] font-medium">
        How you pay
      </h2>
      <PaymentBreakdown subtotal={subtotal} terms={terms} />
    </section>
  );
}

// The panel on its own, for pages that give it their own heading (the landing page).
export function PaymentBreakdown({ subtotal, terms, className }: { subtotal: number; terms: CodTerms; className?: string }) {
  const cod = codSummary(subtotal, { advance: terms.codAdvance, deliveryFee: terms.codDeliveryFee });
  const bank = bankTransferSummary(subtotal);

  return (
    <div className={cn("divide-y divide-hairline rounded-2xl bg-muted text-left", className)}>
      <div data-testid="pay-cod" className="flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-medium text-foreground">Cash on delivery</p>
          <p className="text-sm text-muted-foreground tabular-nums">{formatPKR(cod.total)} total</p>
        </div>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm tabular-nums">
          <dt className="text-muted-foreground">Send now to confirm</dt>
          <dd className="text-right font-medium text-foreground">{formatPKR(cod.advance)}</dd>
          <dt className="text-muted-foreground">Pay on delivery</dt>
          <dd className="text-right font-medium text-foreground">{formatPKR(cod.onDelivery)}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">Includes {formatPKR(cod.deliveryFee)} delivery.</p>
      </div>
      <div data-testid="pay-bank" className="flex flex-col gap-1 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-medium text-foreground">Bank transfer</p>
          <p className="text-sm text-muted-foreground tabular-nums">{formatPKR(bank.total)} total</p>
        </div>
        <p className="text-sm text-muted-foreground">Pay in full before dispatch. Free delivery.</p>
      </div>
    </div>
  );
}
