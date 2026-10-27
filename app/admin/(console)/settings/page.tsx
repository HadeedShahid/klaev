import type { Metadata } from "next";

import { bankAccountAction, codTermsAction, passwordAction } from "@/app/actions/admin-settings";
import { CourierForm } from "@/components/admin/courier-form";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MIN_PASSWORD_LENGTH, requireAdmin } from "@/lib/admin/auth";
import { getCourierSettings } from "@/lib/admin/courier";
import { getDb } from "@/lib/db";
import { getBankAccount, getCodTerms } from "@/lib/settings";
import { STORE } from "@/lib/store";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const db = await getDb();
  const [courier, terms, bank] = await Promise.all([getCourierSettings(db), getCodTerms(db), getBankAccount(db)]);
  return (
    <>
      <PageHeader title="Settings" />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
            <CardDescription>
              What cash on delivery costs the customer. Product pages, the cart, checkout and the FAQ show these, and new orders use them. Bank transfers
              deliver free.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm
              action={codTermsAction}
              columns={2}
              fields={[
                { name: "codDeliveryFee", label: "Cash on delivery fee, PKR", inputMode: "numeric", defaultValue: terms.codDeliveryFee, hint: "Added to COD orders." },
                { name: "codAdvance", label: "Advance to confirm, PKR", inputMode: "numeric", defaultValue: terms.codAdvance, hint: "Sent before a COD order ships. Each order's can change." },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank account</CardTitle>
            <CardDescription>Where bank transfers and COD advances go. Customers see it on their order page once they order.</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm
              action={bankAccountAction}
              columns={2}
              fields={[
                { name: "bank", label: "Bank", defaultValue: bank?.bank },
                { name: "accountTitle", label: "Account title", defaultValue: bank?.accountTitle },
                { name: "accountNumber", label: "Account number", inputMode: "numeric", defaultValue: bank?.accountNumber },
                { name: "iban", label: "IBAN", defaultValue: bank?.iban, hint: "Optional." },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Courier</CardTitle>
            <CardDescription>
              What PostEx charges upfront per parcel, and the tax it keeps from COD cash. Each shipment starts from these, and you can change any one when you
              ship it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CourierForm settings={courier} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Changing it signs out every other device. If it&apos;s ever lost, `pnpm admin:password` sets a new one.</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm
              action={passwordAction}
              submit="Change password"
              fields={[
                { name: "current", label: "Current password", type: "password", autoComplete: "current-password" },
                { name: "next", label: "New password", type: "password", autoComplete: "new-password", hint: `At least ${MIN_PASSWORD_LENGTH} characters.` },
                { name: "again", label: "New password again", type: "password", autoComplete: "new-password" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Store details</CardTitle>
            <CardDescription>On every page and in every WhatsApp link. They change with the code, in lib/store.ts.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
              <dt className="text-muted-foreground">WhatsApp</dt>
              <dd className="tabular-nums">{STORE.whatsappDisplay}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{STORE.email}</dd>
              <dt className="text-muted-foreground">Instagram</dt>
              <dd>@{STORE.instagram}</dd>
              <dt className="text-muted-foreground">Delivery time</dt>
              <dd>{STORE.deliveryDays} days</dd>
              <dt className="text-muted-foreground">Exchanges</dt>
              <dd>Within {STORE.exchangeDays} days of delivery</dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
