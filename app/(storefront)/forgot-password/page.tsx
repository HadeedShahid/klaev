import type { Metadata } from "next";

import { AltAction, AuthShell } from "@/components/auth/auth-shell";
import { EmailForm } from "@/components/auth/email-form";
import { ResendNotice } from "@/components/auth/resend-notice";
import { Button } from "@/components/ui/button";

import { requestPasswordReset, resendPasswordReset } from "./actions";

export const metadata: Metadata = {
  title: "Forgot your password?",
  robots: { index: false },
};

function text(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<"/forgot-password">) {
  const params = await searchParams;
  const sentTo = text(params.sent);

  if (sentTo) {
    return (
      <AuthShell
        mark="✓"
        title="Check your email."
        description={`We sent a reset link to ${sentTo}. It expires in 30 minutes.`}
      >
        <div className="flex flex-col gap-6 pt-1">
          <div className="flex flex-col gap-4">
            <Button href="mailto:" size="cta">
              Open mail app
            </Button>

            <ResendNotice email={sentTo} action={resendPasswordReset} />
          </div>

          <AltAction
            text="Wrong address?"
            href="/forgot-password"
            label="Use another email"
          />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      description="Enter the email on your account and we will send a reset link."
      image="buckle detail, vertical"
    >
      <div className="flex flex-col gap-6">
        <EmailForm
          action={requestPasswordReset}
          submitLabel="Send reset link"
          id="forgot-password"
          defaultEmail={text(params.email)}
        />

        <AltAction
          text="Remembered it?"
          href="/login"
          label="Back to log in"
        />
      </div>
    </AuthShell>
  );
}
