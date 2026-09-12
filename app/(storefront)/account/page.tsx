import type { Metadata } from "next";

import { AuthMessage } from "@/components/auth/auth-message";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";
import { requireCustomer } from "@/lib/auth";

import { signOut } from "./actions";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export default async function AccountPage({
  searchParams,
}: PageProps<"/account">) {
  const customer = await requireCustomer();
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : undefined;

  return (
    <AuthShell title="Your account">
      <div className="flex flex-col gap-6">
        <AuthMessage notice={notice} />

        <div className="flex flex-col gap-1">
          <Text className="text-sm text-muted-foreground">
            Signed in as
          </Text>
          <Text>{customer.email}</Text>
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline" size="cta">
            Sign out
          </Button>
        </form>
      </div>
    </AuthShell>
  );
}
