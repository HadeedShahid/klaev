import Link from "next/link";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dateTime } from "@/lib/admin/format";
import { PAYMENT_LABELS } from "@/lib/admin/labels";
import { paymentState, type listOrders } from "@/lib/admin/orders";
import { formatPKR } from "@/lib/money";

import { PaymentBadge, ReceiptBadge, StatusBadge } from "./badges";
import { MoneyBar } from "./money-bar";

export type OrderRowData = Awaited<ReturnType<typeof listOrders>>[number];

// Orders as a table; the whole row opens the order. `compact` leaves out the items and the
// money bar, for the dashboard's recent orders.
export function OrdersTable({ rows, compact = false }: { rows: OrderRowData[]; compact?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-4">Order</TableHead>
          <TableHead>Customer</TableHead>
          {compact ? null : <TableHead className="hidden md:table-cell">Items</TableHead>}
          <TableHead className="hidden sm:table-cell">Payment</TableHead>
          <TableHead className="hidden sm:table-cell">Status</TableHead>
          <TableHead className="pr-4 text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.number} className="relative border-hairline">
            <TableCell className="pl-4">
              <Link href={`/admin/orders/${row.number}`} className="font-medium tabular-nums after:absolute after:inset-0">
                #{row.number}
              </Link>
              <p className="text-xs text-muted-foreground tabular-nums">{dateTime(row.createdAt)}</p>
            </TableCell>
            <TableCell className="max-w-48">
              <p className="truncate font-medium">{row.name}</p>
              <p className="truncate text-xs text-muted-foreground">{row.city}</p>
              <div className="mt-1.5 sm:hidden">
                <StatusBadge status={row.status} courierStatus={row.courierStatus} />
              </div>
            </TableCell>
            {compact ? null : (
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {row.items} {row.items === 1 ? "item" : "items"}
              </TableCell>
            )}
            <TableCell className="hidden sm:table-cell">
              <div className="flex w-36 flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <PaymentBadge state={paymentState(row)} />
                  {compact ? null : <span className="text-xs text-muted-foreground">{row.paymentMethod === "cod" ? "COD" : PAYMENT_LABELS[row.paymentMethod]}</span>}
                </div>
                {compact ? null : <MoneyBar order={row} />}
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={row.status} courierStatus={row.courierStatus} />
                {row.status === "pending" && row.receipts > 0 ? <ReceiptBadge /> : null}
              </div>
            </TableCell>
            <TableCell className="pr-4 text-right font-medium tabular-nums">{formatPKR(row.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
