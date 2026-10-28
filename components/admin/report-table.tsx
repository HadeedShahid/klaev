import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Column, ReportTable } from "@/lib/admin/analytics";
import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";

export function formatCell(kind: Column["kind"], value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "None";
  if (kind === "pkr") return formatPKR(Number(value));
  if (kind === "count") return Number(value).toLocaleString("en-PK");
  if (kind === "percent") return `${value}%`;
  if (kind === "days") return `${value} ${Number(value) === 1 ? "day" : "days"}`;
  return String(value);
}

// Wide tables keep their first and last columns on a phone and drop the ones between, rather than
// scroll sideways; the CSV has them all.
const between = (index: number, columns: number) => columns > 3 && index > 0 && index < columns - 1 && "hidden sm:table-cell";

// One report's table in a card, with its CSV beside the title.
export function ReportCard({ table, csvHref, empty = "Nothing in this period yet." }: { table: ReportTable; csvHref?: string; empty?: string }) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b border-hairline py-4">
        <CardTitle>{table.title}</CardTitle>
        {table.note ? <CardDescription>{table.note}</CardDescription> : null}
        {csvHref && table.rows.length ? (
          <CardAction>
            <Button variant="ghost" size="sm" nativeButton={false} render={<a href={csvHref} download />}>
              <Download data-icon="inline-start" strokeWidth={1.8} aria-hidden />
              CSV
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="px-0">
        {table.rows.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {table.columns.map((column, index) => (
                  <TableHead key={column.key} className={cn(index === 0 ? "pl-4" : "text-right", index === table.columns.length - 1 && "pr-4", between(index, table.columns.length))}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex} className="border-hairline">
                  {table.columns.map((column, index) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        index === 0 ? "max-w-72 truncate pl-4 font-medium whitespace-normal sm:whitespace-nowrap" : "text-right tabular-nums",
                        index === table.columns.length - 1 && "pr-4",
                        between(index, table.columns.length),
                        (row[column.key] === null || row[column.key] === undefined) && "text-muted-foreground",
                      )}
                    >
                      {formatCell(column.kind, row[column.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}
