import type { Metadata } from "next";

import { AltAction, AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { requireCustomer } from "@/lib/auth";

import { updatePassword } from "./actions";

export const metadata: Metadata = {
  title: "Set a new password",
  robots: { index: false },
};

export default async function ResetPasswordPage() {
  await requireCustomer();

  return (
    <AuthShell
      title="Set a new password."
      description="Choose something you have not used on Klaev before."
    >
      <div className="flex flex-col gap-6">
        <NewPasswordForm action={updatePassword} />

        <AltAction
          text="Changed your mind?"
          href="/login"
          label="Back to log in"
        />
      </div>
    </AuthShell>
  );
}
