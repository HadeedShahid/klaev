import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";

// A product's price. On sale (a compare-at price above it), the old price follows, crossed out
// in Quiet Grey; a screen reader hears "Sale price ... was ...". Never red: that's for errors.
export function Price({ price, compareAt, className }: { price: number; compareAt: number | null; className?: string }) {
  const onSale = compareAt !== null && compareAt > price;
  return (
    <span className={cn("tabular-nums", className)}>
      {onSale ? <span className="sr-only">Sale price </span> : null}
      {formatPKR(price)}
      {onSale ? (
        <s data-testid="compare-at-price" className="ml-2 font-normal text-muted-foreground">
          <span className="sr-only">was </span>
          {formatPKR(compareAt)}
        </s>
      ) : null}
    </span>
  );
}
