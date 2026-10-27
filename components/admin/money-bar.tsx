import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";

type Money = { paymentMethod: string; total: number; advance: number; paid: number; codTax: number; status: string };

const HATCH = "bg-[repeating-linear-gradient(135deg,var(--muted-foreground)_0_1.5px,transparent_1.5px_4px)] opacity-60";

// The admin's signature: an order's money as one bar. Received is Ink. On cash on delivery, what
// the rider still has to collect at the door is hatched, and the share the courier keeps as tax
// sits at the end: faint while it's an estimate, solid Quiet Grey once a payout records it.
// Anything else still due is left open.
export function MoneyBar({ order, taxPercent = 4, className }: { order: Money; taxPercent?: number; className?: string }) {
  const { total, paid, codTax } = order;
  const share = (amount: number) => `${Math.max(0, Math.min(100, (amount / Math.max(total, 1)) * 100))}%`;
  const cod = order.paymentMethod === "cod" && order.status !== "cancelled" && order.status !== "refused";
  const settled = paid + codTax >= total;
  // The door's share starts after the advance, or after whatever came in, if more did.
  const doorFrom = Math.min(total, Math.max(order.advance, paid));
  const atDoor = cod && !settled ? total - doorFrom : 0;
  const taxEstimate = Math.round((atDoor * taxPercent) / 100);
  const label = [
    `${formatPKR(Math.min(paid, total))} of ${formatPKR(total)} received`,
    atDoor > 0 ? `${formatPKR(atDoor)} to collect at the door, about ${formatPKR(taxEstimate)} of it kept by the courier as tax` : null,
    codTax > 0 ? `${formatPKR(codTax)} kept by the courier as tax` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div role="img" aria-label={label} className={cn("relative h-1.5 overflow-hidden rounded-full bg-muted ring-1 ring-foreground/10 ring-inset", className)}>
      {atDoor > 0 ? (
        <>
          <span className={cn("absolute inset-y-0", HATCH)} style={{ left: share(doorFrom), right: share(taxEstimate) }} />
          <span className="absolute inset-y-0 right-0 bg-muted-foreground/30" style={{ width: share(taxEstimate) }} />
        </>
      ) : null}
      {codTax > 0 ? <span className="absolute inset-y-0 right-0 bg-muted-foreground" style={{ width: share(codTax) }} /> : null}
      <span className="absolute inset-y-0 left-0 rounded-full bg-foreground" style={{ width: share(paid) }} />
    </div>
  );
}
