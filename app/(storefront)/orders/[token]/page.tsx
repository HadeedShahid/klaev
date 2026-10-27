import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { OrderLines } from "@/components/checkout/order-lines";
import { CopyButton } from "@/components/orders/copy-button";
import { ReceiptUpload } from "@/components/orders/receipt-upload";
import { CartCountSync } from "@/components/site/cart-link";
import { getDb } from "@/lib/db";
import { formatPKR } from "@/lib/money";
import { getOrderByToken } from "@/lib/orders";
import { statusLine } from "@/lib/order-status";
import { formatPhone } from "@/lib/phone";
import { getBankAccount, type BankAccount } from "@/lib/settings";
import { STORE, whatsappLink } from "@/lib/store";

// The link is the customer's key to the order, so the page is never cached or indexed.
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: PageProps<"/orders/[token]">) {
  await connection();
  const { token } = await params;
  const db = await getDb();
  const [order, bank] = await Promise.all([getOrderByToken(db, token), getBankAccount()]);
  if (!order) notFound();

  const cod = order.paymentMethod === "cod";
  const sendNow = cod ? order.advance : order.total;
  const waiting = order.status === "pending";
  const received = order.receipts.length > 0;
  const whatsappHref = whatsappLink(`Hi Klaev, here is the payment screenshot for order #${order.number}.`);

  const payment = (
    <section aria-labelledby="send-to" className="flex flex-col gap-4">
      <h2 id="send-to" className="text-xl font-semibold tracking-tight">
        {received ? "Paid to" : "Where to send it"}
      </h2>
      {bank ? (
        <AccountPanel bank={bank} amount={sendNow} />
      ) : (
        <p className="rounded-2xl bg-muted p-4 text-sm">We send the account details on WhatsApp.</p>
      )}
      {received ? null : (
        <p className="text-sm text-muted-foreground">
          Then send us the screenshot of the transfer, here or on WhatsApp. We confirm your order on WhatsApp once
          it&apos;s in.
        </p>
      )}
      <ReceiptUpload token={token} received={received} whatsappHref={whatsappHref} />
    </section>
  );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-10 px-5 pt-8 pb-16 md:px-8">
      <CartCountSync count={0} />

      <div className="flex flex-col gap-3">
        <h1 className="text-[2rem] leading-tight font-semibold tracking-tight text-balance">Order #{order.number} is in.</h1>
        {waiting && received ? (
          <div data-testid="order-lead" className="flex flex-col gap-1 text-lg text-muted-foreground text-pretty">
            <p className="font-medium text-foreground">Receipt received.</p>
            <p>We check it against the account and confirm your order on WhatsApp.</p>
          </div>
        ) : waiting ? (
          <div data-testid="order-lead" className="flex flex-col gap-1 text-lg text-muted-foreground text-pretty">
            <p className="font-medium text-foreground">Send {formatPKR(sendNow)} to confirm it.</p>
            <p>
              {cod
                ? `The rest, ${formatPKR(order.total - order.advance)}, is paid in cash when it arrives.`
                : "Delivery is free."}
            </p>
          </div>
        ) : (
          <div data-testid="order-lead" className="flex flex-col gap-1 text-lg text-muted-foreground text-balance">
            <p>{statusLine(order)}</p>
            {order.status === "shipped" && order.trackingNumber ? (
              <p className="text-sm">
                Tracking number <span className="font-medium text-foreground tabular-nums">{order.trackingNumber}</span>
              </p>
            ) : null}
          </div>
        )}
      </div>

      {waiting && !received ? payment : null}

      <section aria-labelledby="your-order" className="flex flex-col gap-4">
        <h2 id="your-order" className="text-xl font-semibold tracking-tight">
          Your order
        </h2>
        <OrderLines
          lines={order.lines.map((line) => ({
            key: String(line.id),
            title: line.title,
            size: line.size,
            quantity: line.quantity,
            lineTotal: line.unitPrice * line.quantity,
            image: line.image,
          }))}
        />
        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm tabular-nums">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="text-right">{formatPKR(order.subtotal)}</dd>
          {order.discountTotal > 0 ? (
            <>
              <dt className="text-muted-foreground">Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
              <dd className="text-right">−{formatPKR(order.discountTotal)}</dd>
            </>
          ) : null}
          <dt className="text-muted-foreground">Delivery{cod ? ", cash on delivery" : ", bank transfer"}</dt>
          <dd className="text-right">{order.deliveryFee > 0 ? formatPKR(order.deliveryFee) : "Free"}</dd>
          <dt className="font-medium">Total</dt>
          <dd className="text-right font-medium">{formatPKR(order.total)}</dd>
          {cod ? (
            <>
              <dt className="text-muted-foreground">Advance, sent to confirm</dt>
              <dd className="text-right">{formatPKR(order.advance)}</dd>
              <dt className="text-muted-foreground">Paid on delivery, in cash</dt>
              <dd className="text-right">{formatPKR(order.total - order.advance)}</dd>
            </>
          ) : null}
        </dl>
      </section>

      {waiting && received ? payment : null}

      <section aria-labelledby="delivering-to" className="flex flex-col gap-2">
        <h2 id="delivering-to" className="text-xl font-semibold tracking-tight">
          Delivering to
        </h2>
        <address className="text-[0.9375rem] leading-relaxed not-italic">
          {order.name}
          <br />
          {order.address1}
          {order.city ? (
            <>
              <br />
              {order.city}
            </>
          ) : null}
          {order.phone ? (
            <>
              <br />
              <span className="tabular-nums">{formatPhone(order.phone)}</span>
            </>
          ) : null}
        </address>
      </section>

      <p className="text-sm text-muted-foreground">
        Questions about this order? WhatsApp us on{" "}
        <a href={whatsappHref} className="text-foreground underline underline-offset-[0.2em] hover:no-underline">
          {STORE.whatsappDisplay}
        </a>
        . Keep this page&apos;s link: it&apos;s how you come back to your order.
      </p>
    </div>
  );
}

function AccountPanel({ bank, amount }: { bank: BankAccount; amount: number }) {
  return (
    <dl className="divide-y divide-hairline rounded-2xl bg-muted px-4 text-[0.9375rem]">
      <Row term="Amount">
        <span className="font-semibold tabular-nums">{formatPKR(amount)}</span>
      </Row>
      <Row term="Bank">{bank.bank}</Row>
      <Row term="Account title">{bank.accountTitle}</Row>
      <Row term="Account number">
        <span className="flex items-center gap-2">
          <span className="font-medium tracking-wide tabular-nums">{bank.accountNumber}</span>
          <CopyButton value={bank.accountNumber} label="Copy account number" />
        </span>
      </Row>
      {bank.iban ? (
        <Row term="IBAN">
          <span className="flex items-center gap-2">
            <span className="font-medium tabular-nums break-all">{bank.iban}</span>
            <CopyButton value={bank.iban} label="Copy IBAN" />
          </span>
        </Row>
      ) : null}
    </dl>
  );
}

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-3">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
