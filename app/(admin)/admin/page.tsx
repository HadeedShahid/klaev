import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import Text from "@/components/ui/text";
import { requireAdmin } from "@/lib/auth";

import { signOutAdmin } from "./login/actions";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <Text as="h1" className="text-2xl font-semibold tracking-tight">
          Dashboard
        </Text>

        <Text as="p" className="text-sm text-muted-foreground">
          Signed in as {admin.email}. Products and orders will be managed here.
        </Text>
      </div>

      <form action={signOutAdmin}>
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
