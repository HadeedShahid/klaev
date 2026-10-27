import { ChevronLeft, FileText, MessageCircle, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ActionDialog } from "@/components/admin/action-dialog";
import { AdminReceiptUpload } from "@/components/admin/admin-receipt-upload";
import { PaymentBadge, StatusBadge } from "@/components/admin/badges";
import { Field } from "@/components/admin/field";
import { MoneyBar } from "@/components/admin/money-bar";
import { EditItems } from "@/components/admin/edit-items";
import { ExchangeDialog } from "@/components/admin/exchange-dialog";
import { CopyText, NoteForm, PaymentForm } from "@/components/admin/order-forms";
import { OrderStepper } from "@/components/admin/order-stepper";
import { PageHeader } from "@/components/admin/page-header";
import { ReceiptImage } from "@/components/admin/receipt-image";
import { StatusControl } from "@/components/admin/status-control";
import { CopyButton } from "@/components/orders/copy-button";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireAdmin } from "@/lib/admin/auth";
import { expectedPayout, getCourierSettings } from "@/lib/admin/courier";
import { customerHistory } from "@/lib/admin/customers";
import { exchangeLinks, ITEMS_EDITABLE, listSellable } from "@/lib/admin/order-changes";
import { customerMessage, dateTime, localPhone, parcelText, todayInKarachi, whatsappTo } from "@/lib/admin/format";
import { PAYMENT_LABELS, STATUS_LABELS } from "@/lib/admin/labels";
import { getAdminOrder, orderProfit, paymentState, type AdminOrder } from "@/lib/admin/orders";
import { returnAction } from "@/app/actions/admin-orders";
import { getDb } from "@/lib/db";
import { formatPKR } from "@/lib/money";
import { getCodTerms } from "@/lib/settings";
import { adminField, quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[number]">): Promise<Metadata> {
  return { title: `#${(await params).number}` };
}

function Row({ term, value, strong, muted }: { term: ReactNode; value: ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className={cn("tabular-nums", strong && "font-semibold", muted && "text-muted-foreground")}>{value}</dd>
    </div>
  );
}

// Everything that happened to the order, oldest first, from its own timestamps, payments and receipts.
function timeline(order: AdminOrder) {
  const events: { at: Date; text: string }[] = [
    { at: order.createdAt, text: order.source === "manual" ? "Entered by hand" : "Placed on the site" },
    ...order.receipts.map((receipt) => ({ at: receipt.createdAt, text: "Receipt uploaded" })),
    ...order.payments.map((payment) => ({
      at: payment.receivedAt,
      text: `${formatPKR(payment.amount)} received, ${PAYMENT_LABELS[payment.method]?.toLowerCase() ?? payment.method}${payment.note ? ` (${payment.note.toLowerCase()})` : ""}`,
    })),
  ];
  const stamps: [Date | null, string][] = [
    [order.confirmedAt, "Confirmed"],
    [order.packedAt, "Packed"],
    [order.shippedAt, order.trackingNumber ? `Shipped, tracking ${order.trackingNumber}` : "Shipped"],
    [order.deliveredAt, "Delivered"],
    [order.paidOutAt, order.codTax > 0 ? `Courier paid out, ${formatPKR(order.codTax)} kept as tax` : "Courier paid out"],
    [order.refusedAt, "Refused at the door"],
    [order.returnedAt, "Old jacket back in stock"],
    [order.cancelledAt, "Cancelled"],
  ];
  for (const [at, text] of stamps) if (at) events.push({ at, text });
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export default async function OrderPage({ params }: PageProps<"/admin/orders/[number]">) {
  await requireAdmin();
  const db = await getDb();
  const [order, courier] = await Promise.all([getAdminOrder(db, Number((await params).number)), getCourierSettings(db)]);
  if (!order) notFound();
  const editable = ITEMS_EDITABLE.some((status) => status === order.status);
  const exchangeable = order.status === "delivered" && order.lines.some((line) => line.variantId !== null && line.productId !== null);
  const [history, links, catalog, terms] = await Promise.all([
    customerHistory(db, order),
    exchangeLinks(db, order),
    editable || exchangeable ? listSellable(db) : Promise.resolve([]),
    getCodTerms(db),
  ]);

  const cod = order.paymentMethod === "cod";
  const expected = cod ? order.advance : order.paymentMethod === "bank_transfer" ? order.total : 0;
  const owedToConfirm = Math.max(0, expected - order.paid);
  // The COD cash: before delivery what the rider will collect, after it what the courier holds.
  const collected = cod ? Math.max(0, order.total - order.paid - order.codTax) : 0;
  const finished = ["delivered", "cancelled", "refused"].includes(order.status);
  const state = paymentState(order);
  const profit = orderProfit(order, courier.codTaxPercent);
  const costsKnown = order.lines.every((line) => line.costPrice !== null);
  const [newest, ...older] = [...order.receipts].reverse();
  const firstName = order.name.split(/\s+/)[0];
  const parcelRows: [string, string, string][] = [
    ["Name", order.name, order.name],
    ["Phone", order.phone ? localPhone(order.phone) : "", order.phone ? localPhone(order.phone) : ""],
    ["Address", order.address1 ?? "", order.address1 ?? ""],
    ["City", order.city ?? "", order.city ?? ""],
    ["Cash to collect", !cod ? "Nothing, it's prepaid" : formatPKR(collected), String(collected)],
  ];

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/admin/orders" className="flex items-center text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" strokeWidth={1.8} aria-hidden />
              Orders
            </Link>
            <span className="tabular-nums">#{order.number}</span>
            <StatusBadge status={order.status} courierStatus={order.courierStatus} />
            <PaymentBadge state={state} />
          </span>
        }
      >
        <StatusControl
          number={order.number}
          name={order.name}
          status={order.status}
          courierStatus={order.courierStatus}
          cod={cod}
          paidOut={order.paidOutAt !== null || collected === 0}
          advance={order.advance}
          owedToConfirm={owedToConfirm}
          collected={collected}
          courierCharge={order.courierFee ?? (cod ? courier.codCharge : courier.prepaidCharge)}
          codTaxPercent={courier.codTaxPercent}
        />
      </PageHeader>

      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{order.name}</span>, {order.city} · placed {dateTime(order.createdAt)} ·{" "}
                {PAYMENT_LABELS[order.paymentMethod]}
              </p>
              <p className="text-xl font-semibold tabular-nums">{formatPKR(order.total)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <MoneyBar order={order} taxPercent={courier.codTaxPercent} className="h-2" />
              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                <span>
                  <span className="font-medium text-foreground">{formatPKR(order.paid)}</span> received
                </span>
                {cod && collected > 0 ? (
                  <span>
                    {formatPKR(collected)} {order.status === "delivered" ? "with the courier" : "at the door"}, about{" "}
                    {formatPKR(collected - expectedPayout(collected, courier.codTaxPercent))} kept as tax
                  </span>
                ) : null}
                {order.codTax > 0 ? <span>{formatPKR(order.codTax)} kept by the courier as tax</span> : null}
                {!cod && order.paid < order.total && order.status !== "cancelled" ? <span>{formatPKR(order.total - order.paid)} still due</span> : null}
              </p>
            </div>
            <OrderStepper order={order} />
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="gap-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="flex flex-col gap-4">
                {order.status === "pending" ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Receipt</CardTitle>
                      <CardDescription className="text-base text-foreground">
                        {owedToConfirm > 0 ? (
                          <>
                            It should show <span className="font-semibold tabular-nums">{formatPKR(owedToConfirm)}</span>.
                          </>
                        ) : (
                          "Nothing more is owed to confirm it."
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {!newest ? (
                        <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">No receipt yet. It may come on WhatsApp instead.</p>
                      ) : newest.contentType === "application/pdf" ? (
                        <a href={`/admin/receipts/${newest.id}`} target="_blank" rel="noreferrer" className={cn(quietPill, "self-start")}>
                          <FileText className="size-4" strokeWidth={1.8} aria-hidden />
                          Open the PDF receipt
                        </a>
                      ) : (
                        <ReceiptImage src={`/admin/receipts/${newest.id}`} alt={`Receipt uploaded ${dateTime(newest.createdAt)}`} />
                      )}
                      <ReceiptLinks newest={newest} older={older} />
                      <AdminReceiptUpload number={order.number} />
                    </CardContent>
                  </Card>
                ) : null}

                <Card>
                  <CardHeader>
                    <CardTitle>Items</CardTitle>
                    <CardAction className="flex flex-wrap justify-end gap-0.5">
                      {editable ? (
                        <EditItems
                          number={order.number}
                          catalog={catalog}
                          lines={order.lines.flatMap((line) =>
                            line.variantId !== null && line.productId !== null ? [{ variantId: line.variantId, productId: line.productId, quantity: line.quantity }] : [],
                          )}
                        />
                      ) : null}
                      {exchangeable ? (
                        <ExchangeDialog
                          number={order.number}
                          catalog={catalog}
                          charge={terms.codDeliveryFee}
                          lines={order.lines.flatMap((line) =>
                            line.variantId !== null && line.productId !== null
                              ? [{ id: line.id, title: line.title, size: line.size, variantId: line.variantId, productId: line.productId }]
                              : [],
                          )}
                        />
                      ) : null}
                      <Button variant="ghost" size="sm" nativeButton={false} render={<a href={`/admin/print/${order.number}?doc=slip`} target="_blank" rel="noreferrer" />}>
                        Packing slip
                      </Button>
                      <Button variant="ghost" size="sm" nativeButton={false} render={<a href={`/admin/print/${order.number}?doc=invoice`} target="_blank" rel="noreferrer" />}>
                        Invoice
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <ul className="flex flex-col gap-3">
                      {order.lines.map((line) => (
                        <li key={line.id} className="flex items-center gap-3">
                          <div className="aspect-4/5 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {line.image ? (
                              <Image src={line.image.src} width={line.image.width} height={line.image.height} alt="" sizes="48px" className="size-full object-cover" />
                            ) : null}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            {line.handle ? (
                              <Link href={`/products/${line.handle}`} target="_blank" className="font-medium text-pretty hover:underline">
                                {line.title}
                              </Link>
                            ) : (
                              <p className="font-medium text-pretty">{line.title}</p>
                            )}
                            <p className="text-muted-foreground">
                              {line.size ? `Size ${line.size}` : "One size"}
                              {line.quantity > 1 ? `, ${line.quantity} pieces` : ""}
                            </p>
                          </div>
                          <p className={cn("tabular-nums", order.exchangeOf !== null && line.unitPrice === 0 && "text-muted-foreground")}>
                            {order.exchangeOf !== null && line.unitPrice === 0 ? "Exchange" : formatPKR(line.unitPrice * line.quantity)}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <dl className="divide-y divide-hairline border-t border-hairline">
                      <Row term="Subtotal" value={formatPKR(order.subtotal)} />
                      {order.discountTotal > 0 ? <Row term={`Discount ${order.discountCode ?? ""}`} value={`−${formatPKR(order.discountTotal)}`} /> : null}
                      <Row term={cod ? "Delivery, cash on delivery" : "Delivery"} value={order.deliveryFee > 0 ? formatPKR(order.deliveryFee) : "Free"} />
                      <Row term="Total" value={formatPKR(order.total)} strong />
                    </dl>
                  </CardContent>
                </Card>

                {links.replaces !== null || links.sent.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Size exchange</CardTitle>
                      {links.replaces !== null && links.returning && !order.returnedAt ? (
                        <CardAction>
                          <ActionDialog
                            action={returnAction}
                            label="It's back"
                            title="Is the old jacket back?"
                            description={`${links.returning.title}, size ${links.returning.size ?? "one size"}, goes back into stock.`}
                            number={order.number}
                            submit="Yes, back in stock"
                            variant="outline"
                          />
                        </CardAction>
                      ) : null}
                    </CardHeader>
                    <CardContent className="flex flex-col gap-1">
                      {links.replaces !== null ? (
                        <>
                          <p>
                            Replaces{" "}
                            <Link href={`/admin/orders/${links.replaces}`} className="font-medium underline-offset-4 hover:underline">
                              #{links.replaces}
                            </Link>
                            {links.returning
                              ? `: size ${links.returning.size ?? "one size"} comes back, size ${order.lines[0]?.size ?? "one size"} goes out.`
                              : "."}
                          </p>
                          {links.returning ? (
                            <p className="text-muted-foreground">
                              {order.returnedAt ? `The old jacket was back in stock on ${dateTime(order.returnedAt)}.` : "The old jacket isn't back yet."}
                            </p>
                          ) : null}
                        </>
                      ) : null}
                      {links.sent.map((exchange) => (
                        <p key={exchange.number}>
                          Exchanged on{" "}
                          <Link href={`/admin/orders/${exchange.number}`} className="font-medium underline-offset-4 hover:underline">
                            #{exchange.number}
                          </Link>
                          <span className="text-muted-foreground">, {STATUS_LABELS[exchange.status].toLowerCase()}</span>
                        </p>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}

                {order.status !== "pending" ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Receipts</CardTitle>
                      <CardDescription>
                        {order.receipts.length === 0 ? "None on this order." : "Screenshots the customer uploaded, or you added."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <ReceiptLinks older={[...order.receipts].reverse()} label="Uploaded" />
                      <AdminReceiptUpload number={order.number} />
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer</CardTitle>
                    <CardAction>
                      <ActionDialog label="Edit" title={`Contact for #${order.number}`} number={order.number} intent="contact" submit="Save" variant="ghost">
                        <Field id={`contact-${order.number}-name`} name="name" label="Name" defaultValue={order.name} required autoComplete="off" />
                        <Field
                          id={`contact-${order.number}-phone`}
                          name="phone"
                          label="Mobile number"
                          defaultValue={order.phone ? localPhone(order.phone) : ""}
                          inputMode="tel"
                          required
                          autoComplete="off"
                        />
                        <Field id={`contact-${order.number}-email`} name="email" label="Email" defaultValue={order.email ?? ""} type="email" autoComplete="off" />
                        <Field id={`contact-${order.number}-address`} name="address1" label="Address" defaultValue={order.address1 ?? ""} autoComplete="off" />
                        <Field id={`contact-${order.number}-city`} name="city" label="City" defaultValue={order.city ?? ""} autoComplete="off" />
                      </ActionDialog>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium">{order.name}</p>
                      {order.customerId !== null ? (
                        <Link href={`/admin/customers/${order.customerId}`} className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                          {history.orders === 0 ? "First order" : `${history.orders} other ${history.orders === 1 ? "order" : "orders"}`}
                        </Link>
                      ) : null}
                    </div>
                    {/* A refusal before is worth a call before shipping cash on delivery again. */}
                    {history.refused > 0 ? (
                      <p className="my-1 flex items-start gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-sm text-primary-foreground">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} aria-hidden />
                        Refused {history.refused === 1 ? "a delivery" : `${history.refused} deliveries`} before
                      </p>
                    ) : null}
                    {order.phone ? <p className="tabular-nums">{localPhone(order.phone)}</p> : null}
                    {order.email ? (
                      <a href={`mailto:${order.email}`} className="text-muted-foreground underline-offset-4 hover:underline">
                        {order.email}
                      </a>
                    ) : null}
                    <p className="text-muted-foreground">
                      {[order.address1, order.city].filter(Boolean).join(", ")}
                    </p>
                    {order.phone ? (
                      <a href={whatsappTo(order.phone, customerMessage(order))} target="_blank" rel="noreferrer" className={cn(quietPill, "mt-3 self-start")}>
                        <MessageCircle className="size-4" strokeWidth={1.8} aria-hidden />
                        WhatsApp {firstName}
                      </a>
                    ) : null}
                  </CardContent>
                </Card>

                {order.trackingNumber ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Shipping</CardTitle>
                      <CardAction>
                        <ActionDialog label="Edit" title={`Shipping for #${order.number}`} number={order.number} intent="shipping" submit="Save" variant="ghost">
                          <div className="grid grid-cols-[1fr_8rem] gap-3">
                            <Field id={`shipping-${order.number}-tracking`} name="trackingNumber" label="Tracking number" defaultValue={order.trackingNumber} required autoComplete="off" />
                            <Field
                              id={`shipping-${order.number}-charge`}
                              name="courierFee"
                              label="Courier charge"
                              defaultValue={order.courierFee ?? ""}
                              inputMode="numeric"
                            />
                          </div>
                        </ActionDialog>
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <dl className="divide-y divide-hairline">
                        <Row term="Tracking number" value={order.trackingNumber} />
                        <Row term="Courier charge" value={order.courierFee === null ? "Not recorded" : formatPKR(order.courierFee)} muted={order.courierFee === null} />
                        {order.shippedAt ? <Row term="Shipped" value={dateTime(order.shippedAt)} /> : null}
                      </dl>
                    </CardContent>
                  </Card>
                ) : null}

                {finished ? null : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Parcel details</CardTitle>
                      <CardDescription>For the courier&apos;s booking form</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <dl className="flex flex-col">
                        {parcelRows.map(([term, shown, copied]) => (
                          <div key={term} className="flex items-center justify-between gap-3 py-1">
                            <dt className="w-28 shrink-0 text-muted-foreground">{term}</dt>
                            <dd className="min-w-0 flex-1 break-words tabular-nums">{shown || "None given"}</dd>
                            {copied ? <CopyButton value={copied} label={`Copy ${term.toLowerCase()}`} /> : null}
                          </div>
                        ))}
                      </dl>
                      <CopyText text={parcelText(order)} label="Copy all for PostEx" />
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent>
                    <NoteForm number={order.number} note={order.note} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Money</CardTitle>
                  <CardDescription>{PAYMENT_LABELS[order.paymentMethod]}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <dl className="divide-y divide-hairline">
                    <Row term="Total" value={formatPKR(order.total)} strong />
                    {cod ? <Row term="Advance to confirm" value={formatPKR(order.advance)} /> : null}
                    <Row term="Received" value={formatPKR(order.paid)} />
                    {cod && order.status === "delivered" && collected > 0 ? <Row term="With the courier" value={formatPKR(collected)} /> : null}
                    {cod && !finished ? <Row term="To collect at the door" value={formatPKR(collected)} /> : null}
                    {order.codTax > 0 ? <Row term="Kept by the courier as tax" value={formatPKR(order.codTax)} /> : null}
                    {!cod && order.paid < order.total ? <Row term="Still due" value={formatPKR(order.total - order.paid)} /> : null}
                  </dl>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Profit</CardTitle>
                  <CardDescription>
                    {profit.costMissing
                      ? "A jacket's cost isn't set, so this leaves it out."
                      : profit.complete
                        ? "Every figure is in."
                        : "Estimated until every figure is in."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="divide-y divide-hairline">
                    <Row term="Order total" value={formatPKR(profit.revenue)} />
                    <Row term="What the jackets cost" value={costsKnown ? `−${formatPKR(profit.cost)}` : "Not set"} muted={!costsKnown} />
                    <Row term="Courier charge" value={order.courierFee === null ? "Not shipped yet" : `−${formatPKR(profit.courier)}`} muted={order.courierFee === null} />
                    {cod ? (
                      order.paidOutAt ? (
                        <Row term="COD tax" value={`−${formatPKR(profit.tax)}`} />
                      ) : collected === 0 && order.status === "delivered" ? (
                        <Row term="COD tax" value="Not recorded, settled before payouts" muted />
                      ) : (
                        <Row term={`COD tax, about ${courier.codTaxPercent}%`} value={`−${formatPKR(profit.tax)}`} muted />
                      )
                    ) : null}
                    <Row term={profit.costMissing ? "Profit before jacket cost" : "Profit"} value={formatPKR(profit.profit)} strong />
                  </dl>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Payments</CardTitle>
                  {cod && order.status === "delivered" && collected > 0 ? (
                    <CardDescription>
                      Expect about {formatPKR(expectedPayout(collected, courier.codTaxPercent))} from the courier.
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {order.payments.length === 0 ? (
                    <p className="text-muted-foreground">None yet.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-hairline">
                      {order.payments.map((payment) => (
                        <li key={payment.id} className="flex items-baseline justify-between gap-3 py-2">
                          <span>
                            <span className="text-muted-foreground tabular-nums">{dateTime(payment.receivedAt)}</span>{" "}
                            {PAYMENT_LABELS[payment.method]}
                            {payment.note ? <span className="text-muted-foreground">, {payment.note.toLowerCase()}</span> : null}
                            {payment.reference ? <span className="text-muted-foreground">, {payment.reference}</span> : null}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            <span className="mr-2 font-medium whitespace-nowrap tabular-nums">{formatPKR(payment.amount)}</span>
                            <ActionDialog
                              label="Edit"
                              title="Correct this payment"
                              description={payment.note === "Courier payout" ? "A different payout moves the difference into what the courier kept as tax." : undefined}
                              number={order.number}
                              intent="payment_edit"
                              hidden={{ paymentId: payment.id }}
                              submit="Save"
                              variant="ghost"
                            >
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                  <label htmlFor={`payment-${payment.id}-method`} className="text-sm font-medium">
                                    How
                                  </label>
                                  <select id={`payment-${payment.id}-method`} name="method" defaultValue={payment.method} className={adminField}>
                                    <option value="bank_transfer">Bank transfer</option>
                                    <option value="cod">Cash on delivery</option>
                                    <option value="cash">Cash</option>
                                  </select>
                                </div>
                                <Field id={`payment-${payment.id}-amount`} name="amount" label="Amount" defaultValue={payment.amount} inputMode="numeric" required />
                                <Field
                                  id={`payment-${payment.id}-date`}
                                  name="receivedAt"
                                  label="Received"
                                  type="date"
                                  defaultValue={todayInKarachi(payment.receivedAt)}
                                  required
                                />
                                <Field id={`payment-${payment.id}-reference`} name="reference" label="Reference" defaultValue={payment.reference ?? ""} autoComplete="off" />
                              </div>
                            </ActionDialog>
                            <ActionDialog
                              label="Remove"
                              title={`Remove this ${formatPKR(payment.amount)} payment?`}
                              description={
                                payment.note === "Courier payout"
                                  ? "The cash goes back to being with the courier, and the tax it kept is cleared."
                                  : "Use this for a payment recorded by mistake."
                              }
                              number={order.number}
                              intent="payment_delete"
                              hidden={{ paymentId: payment.id }}
                              submit="Remove it"
                              dismiss="Keep it"
                              variant="ghost"
                            />
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Disclosure summary="Record a payment" summaryClassName="flex min-h-10 cursor-pointer items-center self-start font-medium" className="flex flex-col">
                    <PaymentForm number={order.number} today={todayInKarachi()} />
                  </Disclosure>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent>
                <ol className="flex flex-col divide-y divide-hairline">
                  {timeline(order).map((event, index) => (
                    <li key={index} className="flex gap-4 py-2.5">
                      <span className="w-32 shrink-0 text-muted-foreground tabular-nums">{dateTime(event.at)}</span>
                      <span>{event.text}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function ReceiptLinks({
  newest,
  older,
  label = "Earlier",
}: {
  newest?: AdminOrder["receipts"][number];
  older: AdminOrder["receipts"];
  label?: string;
}) {
  if (!newest && older.length === 0) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
      {newest && newest.contentType !== "application/pdf" ? (
        <a href={`/admin/receipts/${newest.id}`} target="_blank" rel="noreferrer" className="font-medium underline-offset-4 hover:underline">
          Open full size
        </a>
      ) : null}
      {older.length > 0 ? (
        <span className="text-muted-foreground">
          {label}:{" "}
          {older.map((receipt, index) => (
            <span key={receipt.id}>
              {index > 0 ? ", " : null}
              <a href={`/admin/receipts/${receipt.id}`} target="_blank" rel="noreferrer" className="text-foreground underline-offset-4 hover:underline">
                {dateTime(receipt.createdAt)}
              </a>
            </span>
          ))}
        </span>
      ) : null}
    </p>
  );
}
