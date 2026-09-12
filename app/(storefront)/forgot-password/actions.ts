"use server";

import { redirect } from "next/navigation";
import * as v from "valibot";

import { env } from "@/constants/env.server";
import {
  EmailSchema,
  type ActionResult,
  type EmailInput,
} from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/server";

async function sendResetLink(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });
  return error;
}

export async function requestPasswordReset(
  input: EmailInput,
): Promise<ActionResult> {
  const parsed = v.safeParse(EmailSchema, input);
  if (!parsed.success) return { error: "Enter a valid email address." };

  const error = await sendResetLink(parsed.output.email);

  if (error?.code === "over_email_send_rate_limit") {
    return { error: "Too many emails just now. Try again in a few minutes." };
  }

  redirect(`/forgot-password?sent=${encodeURIComponent(parsed.output.email)}`);
}

export async function resendPasswordReset(formData: FormData) {
  const parsed = v.safeParse(EmailSchema, { email: formData.get("email") });
  if (!parsed.success) redirect("/forgot-password");

  await sendResetLink(parsed.output.email);
}
