import type { Metadata } from "next";

import { AuthMessage } from "@/components/auth/auth-message";
import {
  AltAction,
  AuthShell,
  GuestBar,
  OrDivider,
} from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { ResendNotice } from "@/components/auth/resend-notice";
import { SignupForm } from "@/components/auth/signup-form";
import { Button } from "@/components/ui/button";

import { redirectIfSignedIn } from "@/lib/auth";

import { resendConfirmation, signUp } from "./actions";
import { signInWithGoogle } from "../login/actions";

export const metadata: Metadata = {
  title: "Create your account",
  robots: { index: false },
};

function text(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const params = await searchParams;
  const sentTo = text(params.sent);

  await redirectIfSignedIn();

  if (sentTo) {
    return (
      <AuthShell
        mark="✓"
        title="Check your email."
        description={`We sent a confirmation link to ${sentTo}. Open it to finish creating your account.`}
      >
        <div className="flex flex-col gap-6 pt-1">
          <div className="flex flex-col gap-4">
            <Button href="mailto:" size="cta">
              Open mail app
            </Button>

            <ResendNotice email={sentTo} action={resendConfirmation} />
          </div>

          <AltAction text="Already confirmed?" href="/login" label="Log in" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account."
      description="Order faster, track deliveries, and keep your sizes on file."
      image="leather macro, vertical, warm light"
      footer={<GuestBar />}
    >
      <div className="flex flex-col gap-4 pt-3">
        <AuthMessage error={text(params.error)} />
        <GoogleButton action={signInWithGoogle} />
        <OrDivider />
      </div>

      <div className="flex flex-col gap-6">
        <SignupForm action={signUp} defaultEmail={text(params.email)} />

        <AltAction
          text="Already have an account?"
          href="/login"
          label="Log in"
        />
      </div>
    </AuthShell>
  );
}
