import { ChevronDown } from "lucide-react";

import { jacketChest, type SizeGuide as Guide } from "@/lib/sizing";

export function SizeGuide({ guide }: { guide: Guide }) {
  return (
    <details className="group rounded-xl bg-muted">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 px-4 text-sm font-medium">
        Size guide
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
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
    </details>
  );
}
