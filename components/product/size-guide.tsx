import { ChevronDown } from "lucide-react";

import { Disclosure } from "@/components/ui/disclosure";
import { jacketChest, type SizeGuide as Guide } from "@/lib/sizing";

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
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="py-2 font-normal">
                Size
              </th>
              {guide.kind === "garment" ? (
                <>
                  <th scope="col" className="py-2 font-normal">
                    Jacket chest
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    Length
                  </th>
                </>
              ) : (
                <th scope="col" className="py-2 font-normal">
                  Fits chest
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {guide.kind === "garment"
              ? guide.rows.map((row) => (
                  <tr key={row.size} className="border-b border-hairline last:border-0">
                    <th scope="row" className="py-2 font-medium">
                      {row.size}
                    </th>
                    <td className="py-2">{jacketChest(row.chestFlat)} in</td>
                    <td className="py-2">{row.length} in</td>
                  </tr>
                ))
              : guide.rows.map((row) => (
                  <tr key={row.size} className="border-b border-hairline last:border-0">
                    <th scope="row" className="py-2 font-medium">
                      {row.size}
                    </th>
                    <td className="py-2">
                      {row.chest[0]} to {row.chest[1]} in
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground">{guide.note}</p>
      </div>
    </Disclosure>
  );
}
