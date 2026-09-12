"use server";

import { redirect } from "next/navigation";
import * as v from "valibot";

import { isAdminEmail } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/redirects";
import {
  LoginSchema,
  type ActionResult,
  type LoginInput,
} from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/server";

export async function signInAsAdmin(
  input: LoginInput,
  next?: string,
): Promise<ActionResult> {
  const parsed = v.safeParse(LoginSchema, input);
  if (!parsed.success) {
    return { error: "Enter your email address and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.output);

  if (error) {
    return { error: "That email and password do not match." };
  }

  if (!isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return { error: "That account cannot access the admin panel." };
  }

  const requested = safeRedirectPath(next, "/admin");
  redirect(requested.startsWith("/admin") ? requested : "/admin");
}

export async function signOutAdmin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
