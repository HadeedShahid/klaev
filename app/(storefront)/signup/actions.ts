"use server";

import { redirect } from "next/navigation";
import * as v from "valibot";

import { env } from "@/constants/env.server";
import {
  EmailSchema,
  SignupSchema,
  type ActionResult,
  type SignupInput,
} from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/server";

const confirmedDestination = `${env.NEXT_PUBLIC_SITE_URL}/account`;

export async function signUp(input: SignupInput): Promise<ActionResult> {
  const parsed = v.safeParse(SignupSchema, input);
  if (!parsed.success) {
    return {
      error:
        "Enter a valid email address and a password of at least 8 characters, one number.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.output.email,
    password: parsed.output.password,
    options: {
      emailRedirectTo: confirmedDestination,
      data: { full_name: parsed.output.fullName },
    },
  });

  if (error) {
    return {
      error:
        error.code === "over_email_send_rate_limit"
          ? "Too many emails just now. Try again in a few minutes."
          : "Could not create that account. Try a different email address.",
    };
  }

  redirect(`/signup?sent=${encodeURIComponent(parsed.output.email)}`);
}

export async function resendConfirmation(formData: FormData) {
  const parsed = v.safeParse(EmailSchema, { email: formData.get("email") });
  if (!parsed.success) redirect("/signup");

  const supabase = await createClient();
  await supabase.auth.resend({
    type: "signup",
    email: parsed.output.email,
    options: { emailRedirectTo: confirmedDestination },
  });
}
