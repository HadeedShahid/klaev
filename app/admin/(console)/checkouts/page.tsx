import type { Metadata } from "next";

import { FollowUpLink } from "@/components/admin/follow-up-link";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { age, localPhone, whatsappTo } from "@/lib/admin/format";
import { ABANDONED_AFTER_MINUTES, listAbandoned, type AbandonedCheckout } from "@/lib/checkouts";
import { getDb } from "@/lib/db";
import { formatPKR } from "@/lib/money";

export const metadata: Metadata = { title: "Abandoned checkouts" };

const items = (checkout: AbandonedCheckout) =>
  checkout.lines.map((line) => `${line.title}${line.size ? ` in size ${line.size}` : ""}${line.quantity > 1 ? ` (${line.quantity})` : ""}`).join(" and ");

// The WhatsApp follow-up: plain, and an offer of help rather than a push.
function followUp(checkout: AbandonedCheckout) {
  const first = checkout.name?.split(/\s+/)[0];
  return `Assalam o Alaikum${first ? ` ${first}` : ""}, this is Klaev. You were checking out the ${items(checkout)} on our site. Can we help you finish the order? We can also take it here on WhatsApp.`;
}

// Checkouts that got as far as a phone number but no order, newest first, for a WhatsApp follow-up.
export default async function AbandonedCheckoutsPage() {
  await requireAdmin();
  const rows = await listAbandoned(await getDb());
  return (
    <>
      <PageHeader title="Abandoned checkouts" />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Someone typed their phone number at checkout and didn&apos;t place the order within {ABANDONED_AFTER_MINUTES} minutes. An order from the same number later takes
          them off the list. They stay for 30 days.
        </p>
        <Card className="py-0">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">No abandoned checkouts. Everyone who started one finished it.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Cart</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Value</TableHead>
                  <TableHead className="hidden sm:table-cell">Left checkout</TableHead>
                  <TableHead className="pr-4">
                    <span className="sr-only">Follow up</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((checkout) => (
                  <TableRow key={checkout.id} className="border-hairline">
                    <TableCell className="max-w-56 py-3 pl-4">
                      <p className="truncate font-medium">{checkout.name || "No name given"}</p>
                      <p className="truncate text-xs text-muted-foreground tabular-nums">
                        {localPhone(checkout.phone)}
                        {checkout.city ? `, ${checkout.city}` : ""}
                      </p>
                      <p className="mt-1 text-xs whitespace-normal text-muted-foreground md:hidden">
                        {items(checkout)}, {formatPKR(checkout.subtotal)}
                        <span className="sm:hidden">, {age(checkout.updatedAt)} ago</span>
                      </p>
                      {checkout.contactedAt ? (
                        <Badge variant="outline" className="mt-1.5 sm:hidden">
                          Messaged
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden max-w-80 whitespace-normal md:table-cell">{items(checkout)}</TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatPKR(checkout.subtotal)}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      <div className="flex flex-col items-start gap-1">
                        <span className="tabular-nums">{age(checkout.updatedAt)} ago</span>
                        {checkout.contactedAt ? <Badge variant="outline">Messaged</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <FollowUpLink id={checkout.id} href={whatsappTo(checkout.phone, followUp(checkout))} contacted={checkout.contactedAt !== null} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
