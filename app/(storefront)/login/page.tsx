import type { Metadata } from "next";

import { AuthMessage } from "@/components/auth/auth-message";
import {
  AltAction,
  AuthShell,
  GuestBar,
  OrDivider,
} from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "@/components/auth/login-form";

import { redirectIfSignedIn } from "@/lib/auth";

import { signInWithGoogle, signInWithPassword } from "./actions";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false },
};

function text(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = text(params.next);

  await redirectIfSignedIn(next);

  return (
    <AuthShell
      title="Welcome back."
      description="Log in to your Klaev account."
      image="belt on body, vertical crop"
      footer={<GuestBar />}
    >
      <div className="flex flex-col gap-4 pt-3">
        <AuthMessage error={text(params.error)} notice={text(params.notice)} />
        <GoogleButton action={signInWithGoogle} next={next} />
        <OrDivider />
      </div>

      <div className="flex flex-col gap-6">
        <LoginForm
          action={signInWithPassword}
          next={next}
          defaultEmail={text(params.email)}
        />

        <AltAction
          text="New to Klaev?"
          href="/signup"
          label="Create an account"
        />
      </div>
    </AuthShell>
  );
}
