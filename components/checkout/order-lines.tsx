import Image from "next/image";

import { formatPKR } from "@/lib/money";

export type OrderLineView = {
  key: string;
  title: string;
  size: string | null;
  quantity: number;
  lineTotal: number;
  image: { src: string; width: number; height: number } | null;
};

// What is being bought, compact: used at checkout and on the order page.
export function OrderLines({ lines }: { lines: OrderLineView[] }) {
  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {lines.map((line) => (
        <li key={line.key} className="flex items-center gap-3 py-3">
          {line.image ? (
            <Image
              src={line.image.src}
              width={line.image.width}
              height={line.image.height}
              alt=""
              sizes="48px"
              className="aspect-4/5 w-12 shrink-0 rounded-lg bg-muted object-cover"
            />
          ) : (
            <div aria-hidden className="aspect-4/5 w-12 shrink-0 rounded-lg bg-muted" />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-[0.9375rem] font-medium text-balance">{line.title}</p>
            <p className="text-sm text-muted-foreground">
              {line.size ? `Size ${line.size}` : "One size"}
              {line.quantity > 1 ? `, quantity ${line.quantity}` : null}
            </p>
          </div>
          <p className="shrink-0 text-sm font-medium tabular-nums">{formatPKR(line.lineTotal)}</p>
        </li>
      ))}
    </ul>
  );
}
