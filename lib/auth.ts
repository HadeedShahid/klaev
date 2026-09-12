import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { env } from "@/constants/env.server";

import { safeRedirectPath } from "./redirects";
import { createClient } from "./supabase/server";

const CUSTOMER_LOGIN = "/login";
const ADMIN_LOGIN = "/admin/login";

export type SessionUser = {
  id: string;
  email: string | null;
};

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return null;

  return { id: data.claims.sub, email: data.claims.email ?? null };
});

const adminEmails = env.ADMIN_EMAILS.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && adminEmails.includes(email.toLowerCase()));
}

export async function getCustomer(): Promise<SessionUser | null> {
  return getSessionUser();
}

export async function requireCustomer(): Promise<SessionUser> {
  const customer = await getSessionUser();
  if (!customer) redirect(CUSTOMER_LOGIN);
  return customer;
}

export async function redirectIfSignedIn(next?: string): Promise<void> {
  const customer = await getSessionUser();
  if (customer) redirect(safeRedirectPath(next, "/account"));
}

export async function redirectIfAdmin(next?: string): Promise<void> {
  const admin = await getAdmin();
  if (!admin) return;
  const target = safeRedirectPath(next, "/admin");
  redirect(target.startsWith("/admin") ? target : "/admin");
}

export async function getAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user && isAdminEmail(user.email) ? user : null;
}

export async function requireAdmin(): Promise<SessionUser> {
  const admin = await getAdmin();
  if (!admin) redirect(ADMIN_LOGIN);
  return admin;
}
