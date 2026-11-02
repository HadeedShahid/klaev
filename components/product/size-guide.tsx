import { ChevronDown } from "lucide-react";

import { Disclosure } from "@/components/ui/disclosure";
import type { SizeChart, SizeGuide as Guide } from "@/lib/sizing";

const UNIT_NAMES = { in: "Inches", cm: "Centimetres" };

export function SizeGuide({ guide }: { guide: Guide }) {
  return (
    <Disclosure
      className="rounded-xl bg-muted"
      summaryClassName="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 text-sm font-medium"
      summary={
        <>
          Size guide
          <ChevronDown className="disclosure-chevron size-4" aria-hidden />
        </>
      }
    >
      <div className="flex flex-col gap-3 px-4 pb-4">
        <SizeTable chart={guide.chart} />
        <SizeNotes notes={guide.chart.notes} />
      </div>
    </Disclosure>
  );
}

// The measurements alone, for the product page's size guide, the home page and the size chart page.
export function SizeTable({ chart }: { chart: SizeChart }) {
  return (
    // Fixed layout: the names take a third, and the sizes share the rest evenly, so the numbers spread
    // out on a wide screen instead of bunching at the right.
    <table className="w-full table-fixed text-left text-sm tabular-nums">
      <thead>
        <tr className="border-b border-border">
          <th scope="col" className="w-[34%] py-2 pr-2 font-normal text-muted-foreground">
            {UNIT_NAMES[chart.unit]}
          </th>
          {chart.sizes.map((size) => (
            <th key={size} scope="col" className="py-2 text-center font-medium">
              {size}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {chart.rows.map((row) => (
          <tr key={row.name} className="border-b border-hairline last:border-0">
            <th scope="row" className="py-2 pr-2 font-normal text-muted-foreground">
              {row.name}
            </th>
            {row.values.map((value, index) => (
              <td key={chart.sizes[index]} className="py-2 text-center">
                {value}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SizeNotes({ notes, className }: { notes: string[]; className?: string }) {
  return (
    <div className={className ?? "flex flex-col gap-1 text-xs text-muted-foreground"}>
      {notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </div>
  );
}
