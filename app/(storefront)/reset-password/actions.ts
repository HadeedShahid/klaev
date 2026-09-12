"use server";

import { redirect } from "next/navigation";
import * as v from "valibot";

import { requireCustomer } from "@/lib/auth";
import {
  NewPasswordSchema,
  type ActionResult,
  type NewPasswordInput,
} from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(
  input: NewPasswordInput,
): Promise<ActionResult> {
  await requireCustomer();

  const parsed = v.safeParse(NewPasswordSchema, input);
  if (!parsed.success) {
    return { error: "At least 8 characters, one number." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.output.password,
  });

  if (error) {
    return {
      error:
        "Could not update your password. Request a new link and try again.",
    };
  }

  redirect("/account");
}
