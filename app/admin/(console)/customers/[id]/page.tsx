import { ChevronLeft, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { customerAction } from "@/app/actions/admin-customers";
import { ActionDialog } from "@/components/admin/action-dialog";
import { StatusBadge } from "@/components/admin/badges";
import { CustomerBadges } from "@/components/admin/customer-badges";
import { Field } from "@/components/admin/field";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/admin/auth";
import { getCustomer, type AdminCustomer } from "@/lib/admin/customers";
import { dateTime, localPhone, whatsappTo } from "@/lib/admin/format";
import { PAYMENT_LABELS } from "@/lib/admin/labels";
import { getDb } from "@/lib/db";
import { formatPKR } from "@/lib/money";
import { adminField, quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/admin/customers/[id]">): Promise<Metadata> {
  const customer = await getCustomer(await getDb(), Number((await params).id));
  return { title: customer?.name ?? "Customer" };
}

// The most recent orders; the rest are a search away on the orders list.
const SHOWN_ORDERS = 15;

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "numeric", month: "short", year: "numeric" });

// Both forms send the whole record; each carries what the other edits in hidden fields.
function kept(customer: AdminCustomer, except: "contact" | "notes") {
  const contact = { name: customer.name ?? "", email: customer.email ?? "", phone: customer.phone ? localPhone(customer.phone) : "", city: customer.city ?? "", address1: customer.address1 ?? "" };
  const notes = { tags: customer.tags.join(", "), note: customer.note ?? "" };
  return { id: customer.id, ...(except === "contact" ? notes : contact) };
}

// One customer: what they've bought, how they pay, and whether they've refused a parcel, with
// their contact details and your notes on them.
export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requireAdmin();
  const customer = await getCustomer(await getDb(), Number((await params).id));
  if (!customer) notFound();
  const { stats } = customer;
  const firstName = (customer.name ?? "").split(/\s+/)[0] || "them";
  const figures: [string, string][] = [
    ["Orders", String(stats.orders)],
    ["Spent", formatPKR(stats.spent)],
    ["Average order", stats.average ? formatPKR(stats.average) : "None yet"],
    ["Customer since", stats.firstOrderAt ? day.format(stats.firstOrderAt) : day.format(customer.createdAt)],
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/admin/customers" className="flex items-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
              Customers
            </Link>
            <span>{customer.name || "No name"}</span>
            <CustomerBadges stats={{ orders: stats.orders, refused: stats.refused, lastOrderAt: stats.lastOrderAt }} />
          </span>
        }
      />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Card className="py-0">
          <dl className="grid grid-cols-2 divide-hairline md:grid-cols-4 md:divide-x">
            {figures.map(([term, value]) => (
              <div key={term} className="flex flex-col gap-1 px-4 py-4">
                <dt className="text-xs text-muted-foreground">{term}</dt>
                <dd className="text-lg font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b border-hairline py-4">
              <CardTitle>Orders</CardTitle>
              {stats.refused || stats.cancelled ? (
                <p className="text-sm text-muted-foreground">
                  {[stats.refused ? `${stats.refused} refused at the door` : null, stats.cancelled ? `${stats.cancelled} cancelled` : null].filter(Boolean).join(", ")}
                </p>
              ) : null}
            </CardHeader>
            {customer.orders.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Payment</TableHead>
                    <TableHead className="pr-4 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.orders.slice(0, SHOWN_ORDERS).map((order) => (
                    <TableRow key={order.number} className="relative border-hairline">
                      <TableCell className="pl-4">
                        <Link href={`/admin/orders/${order.number}`} className="font-medium tabular-nums after:absolute after:inset-0">
                          #{order.number}
                        </Link>
                        <p className="text-xs text-muted-foreground tabular-nums">{dateTime(order.createdAt)}</p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {PAYMENT_LABELS[order.paymentMethod]}, {order.items} {order.items === 1 ? "item" : "items"}
                      </TableCell>
                      <TableCell className={cn("pr-4 text-right font-medium tabular-nums", order.status === "cancelled" && "text-muted-foreground line-through")}>
                        {formatPKR(order.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
            {customer.orders.length > SHOWN_ORDERS && customer.phone ? (
              <Link
                href={`/admin/orders?q=${encodeURIComponent(localPhone(customer.phone))}`}
                className="border-t border-hairline px-4 py-3 text-sm font-medium underline-offset-4 hover:underline"
              >
                All {customer.orders.length} orders
              </Link>
            ) : null}
            {customer.orders.length ? null : (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">No orders yet. Brought over from Shopify, or signed up without buying.</p>
            )}
          </Card>

          {/* On a phone the contact details come first: the call or WhatsApp is usually why you're here. */}
          <div className="order-first flex flex-col gap-4 lg:order-none">
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
                <CardAction>
                  <ActionDialog action={customerAction} label="Edit" title={`Contact for ${customer.name || "this customer"}`} hidden={kept(customer, "contact")} submit="Save" variant="ghost">
                    <Field id={`customer-${customer.id}-name`} name="name" label="Name" defaultValue={customer.name ?? ""} required autoComplete="off" />
                    <Field
                      id={`customer-${customer.id}-phone`}
                      name="phone"
                      label="Mobile number"
                      defaultValue={customer.phone ? localPhone(customer.phone) : ""}
                      inputMode="tel"
                      autoComplete="off"
                    />
                    <Field id={`customer-${customer.id}-email`} name="email" label="Email" type="email" defaultValue={customer.email ?? ""} autoComplete="off" />
                    <Field id={`customer-${customer.id}-address`} name="address1" label="Address" defaultValue={customer.address1 ?? ""} autoComplete="off" />
                    <Field id={`customer-${customer.id}-city`} name="city" label="City" defaultValue={customer.city ?? ""} autoComplete="off" />
                    <p className="text-xs text-muted-foreground">Orders keep the details they were placed with.</p>
                  </ActionDialog>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {customer.phone ? <p className="tabular-nums">{localPhone(customer.phone)}</p> : null}
                {customer.email ? (
                  <a href={`mailto:${customer.email}`} className="text-muted-foreground underline-offset-4 hover:underline">
                    {customer.email}
                  </a>
                ) : null}
                <p className="text-muted-foreground">{[customer.address1, customer.city].filter(Boolean).join(", ") || "No address"}</p>
                {customer.phone ? (
                  <a
                    href={whatsappTo(customer.phone, `Assalam o Alaikum ${firstName}, this is Klaev.`)}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(quietPill, "mt-3 self-start")}
                  >
                    <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden />
                    WhatsApp {firstName}
                  </a>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardAction>
                  <ActionDialog action={customerAction} label="Edit" title={`Notes on ${customer.name || "this customer"}`} hidden={kept(customer, "notes")} submit="Save" variant="ghost">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`customer-${customer.id}-note`} className="text-sm font-medium">
                        Note
                      </label>
                      <textarea
                        id={`customer-${customer.id}-note`}
                        name="note"
                        rows={4}
                        defaultValue={customer.note ?? ""}
                        className={cn(adminField, "h-auto resize-none py-2 leading-normal")}
                      />
                    </div>
                    <Field id={`customer-${customer.id}-tags`} name="tags" label="Tags" defaultValue={customer.tags.join(", ")} autoComplete="off" hint="Separated by commas, like VIP, wholesale." />
                  </ActionDialog>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className={cn("whitespace-pre-line", !customer.note && "text-muted-foreground")}>{customer.note || "No notes."}</p>
                {customer.tags.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {customer.tags.map((tag) => (
                      <li key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs">
                        {tag}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
