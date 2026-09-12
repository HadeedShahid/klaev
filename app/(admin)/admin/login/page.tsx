import type { Metadata } from "next";

import { AuthMessage } from "@/components/auth/auth-message";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

import { signInAsAdmin } from "./actions";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <AuthShell title="Klaev admin">
      <div className="flex flex-col gap-4">
        <AuthMessage error={error} />

        <LoginForm action={signInAsAdmin} next={next} showForgotLink={false} />
      </div>
    </AuthShell>
  );
}
