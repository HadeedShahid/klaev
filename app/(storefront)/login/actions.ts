"use server";

import { redirect } from "next/navigation";
import * as v from "valibot";

import { env } from "@/constants/env.server";
import { safeRedirectPath } from "@/lib/redirects";
import {
  LoginSchema,
  type ActionResult,
  type LoginInput,
} from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(
  input: LoginInput,
  next?: string,
): Promise<ActionResult> {
  const parsed = v.safeParse(LoginSchema, input);
  if (!parsed.success) {
    return { error: "Enter your email address and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.output);

  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirm your email address first. Check your inbox for the link."
          : "We could not find an account with that email and password.",
    };
  }

  redirect(safeRedirectPath(next, "/account"));
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeRedirectPath(String(formData.get("next") ?? ""), "/account");
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent("Could not start Google sign in. Please try again.")}`,
    );
  }

  redirect(data.url);
}
