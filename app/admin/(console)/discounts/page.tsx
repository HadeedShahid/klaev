import type { Metadata } from "next";

import { discountAction } from "@/app/actions/admin-discounts";
import { ActionDialog } from "@/components/admin/action-dialog";
import { DiscountFields } from "@/components/admin/discount-fields";
import { DiscountActions } from "@/components/admin/discount-actions";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { firstDay, lastDay, listDiscounts, type DiscountRow, type DiscountStatus } from "@/lib/admin/discounts";
import { getDb } from "@/lib/db";
import { discountLabel } from "@/lib/discounts";
import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Discounts" };

const STATUS: Record<DiscountStatus, string> = {
  active: "Active",
  scheduled: "Scheduled",
  ended: "Ended",
  used_up: "Used up",
  off: "Off",
};

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" });

function when(row: DiscountRow) {
  const start = row.startsAt ? day.format(row.startsAt) : null;
  const end = row.endsAt ? day.format(new Date(row.endsAt.getTime() - 1)) : null;
  if (start && end) return `${start} to ${end}`;
  if (end) return `Until ${end}`;
  if (start) return `From ${start}`;
  return "No end date";
}

const used = (row: DiscountRow) => (row.usageLimit ? `${row.uses} of ${row.usageLimit}` : String(row.uses));

function conditions(row: DiscountRow) {
  return [
    discountLabel(row),
    row.minSubtotal ? `orders of ${formatPKR(row.minSubtotal)} or more` : null,
    row.oncePerCustomer ? "once per customer" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

// Codes customers type at checkout. Sale prices are set on each product instead.
export default async function DiscountsPage() {
  await requireAdmin();
  const rows = await listDiscounts(await getDb());
  return (
    <>
      <PageHeader title="Discounts">
        <ActionDialog action={discountAction} label="Create code" title="Create a discount code" hidden={{ intent: "create" }} submit="Create code" variant="default">
          <DiscountFields id="new-discount" />
        </ActionDialog>
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          A code takes a percentage or an amount off the items, or the delivery fee, when a customer types it at checkout. For a sale on one product, set its compare-at price on the product instead.
        </p>
        {rows.length === 0 ? (
          <Card className="items-start gap-2 px-6 py-8">
            <p className="font-medium">No codes yet</p>
            <p className="text-sm text-muted-foreground">Create one for Eid, a returning customer, or free delivery on a slow week.</p>
          </Card>
        ) : (
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Dates</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Used</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Given off</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} data-testid={`discount-${row.code}`} className="border-hairline">
                    <TableCell className="py-3 pl-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium tracking-wide">{row.code}</span>
                        <span className="text-xs whitespace-normal text-muted-foreground first-letter:uppercase">{conditions(row)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums sm:hidden">Used {used(row)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "active" ? "secondary" : "outline"} className={cn(row.status !== "active" && row.status !== "scheduled" && "text-muted-foreground")}>
                        {STATUS[row.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{when(row)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{used(row)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{row.given ? formatPKR(row.given) : "None"}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end">
                        <DiscountActions
                          id={row.id}
                          active={row.active}
                          used={row.uses > 0}
                          values={{
                            code: row.code,
                            kind: row.kind,
                            value: row.value,
                            minSubtotal: row.minSubtotal,
                            startsOn: row.startsAt ? firstDay(row.startsAt) : "",
                            endsOn: row.endsAt ? lastDay(row.endsAt) : "",
                            usageLimit: row.usageLimit,
                            oncePerCustomer: row.oncePerCustomer,
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
