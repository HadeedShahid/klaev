import { STORE } from "@/lib/store";

// The exchange policy stated plainly wherever money is discussed (landing page, cart).
export function ExchangeTerms() {
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">Exchanges.</span> Size exchanges within {STORE.exchangeDays} days of
      delivery. Unworn, tags on. You cover delivery both ways. No refunds.
    </p>
  );
}
