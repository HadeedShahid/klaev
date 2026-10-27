import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { eq } from "drizzle-orm";

import { getDb } from "../db";
import { settings } from "../db/schema";
import { isLocalRequest } from "../request";
import { hashPassword, verifyPassword } from "./password";
import { SESSION_SECONDS, signSession, verifySession } from "./session";

const COOKIE = "klaev_admin";
// The cookie only travels to admin pages, which is also where every admin action posts.
const COOKIE_PATH = "/admin";

// Set with `pnpm admin:password` (locally, in .dev.vars). Read loosely because Wrangler only
// types them when a .dev.vars file exists.
async function env() {
  const { env } = await getCloudflareContext({ async: true });
  return env as CloudflareEnv & Partial<Record<"ADMIN_PASSWORD_HASH" | "ADMIN_SESSION_SECRET", string>>;
}

const now = () => Math.floor(Date.now() / 1000);

// A password changed in the admin is kept (hashed) in the settings table, with when it changed,
// which is the version sessions are signed under. Without one, the password is the one
// `pnpm admin:password` set, at version 0; that command also clears this, to recover a lost password.
const PASSWORD_KEY = "admin_password";
type StoredPassword = { hash: string; changedAt: number };

const storedPassword = cache(async (): Promise<StoredPassword | null> => {
  const row = await (await getDb()).query.settings.findFirst({ where: eq(settings.key, PASSWORD_KEY) });
  const value = row?.value as Partial<StoredPassword> | undefined;
  return typeof value?.hash === "string" && Number.isSafeInteger(value.changedAt) ? (value as StoredPassword) : null;
});

// Whether this request carries a valid admin session, checked once per render.
export const isAdmin = cache(async () => {
  const { ADMIN_SESSION_SECRET } = await env();
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return false;
  return verifySession(ADMIN_SESSION_SECRET, token, now(), (await storedPassword())?.changedAt ?? 0);
});

// Every admin page, server action and route calls this before anything else. Not a layout:
// layouts don't run again on navigation, so a check there would not cover each page.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

// Five tries a minute from one address (the ADMIN_SIGN_IN_LIMITER binding in wrangler.jsonc).
// Cloudflare sets cf-connecting-ip on every request that reaches the live Worker; only local
// servers go without it, and there the limit would only trip the test runs.
export async function allowSignInAttempt() {
  const address = (await headers()).get("cf-connecting-ip");
  if (!address) return true;
  const { ADMIN_SIGN_IN_LIMITER } = await env();
  const { success } = await ADMIN_SIGN_IN_LIMITER.limit({ key: `sign-in:${address}` });
  return success;
}

export async function checkPassword(password: string) {
  const stored = await storedPassword();
  if (stored) return verifyPassword(password, stored.hash);
  const { ADMIN_PASSWORD_HASH } = await env();
  return verifyPassword(password, ADMIN_PASSWORD_HASH);
}

export const MIN_PASSWORD_LENGTH = 12;

// A new password from Settings. Every other session ends; this one is signed again so it carries on.
export async function changePassword(current: string, next: string, again: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!(await checkPassword(current))) return { ok: false, message: "The current password isn't right." };
  if (next.length < MIN_PASSWORD_LENGTH) return { ok: false, message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };
  if (next !== again) return { ok: false, message: "The two new passwords don't match." };
  const value: StoredPassword = { hash: await hashPassword(next), changedAt: now() };
  await (await getDb())
    .insert(settings)
    .values({ key: PASSWORD_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
  await startSession(value.changedAt);
  return { ok: true };
}

export async function startSession(version?: number) {
  const { ADMIN_SESSION_SECRET } = await env();
  if (!ADMIN_SESSION_SECRET) throw new Error("ADMIN_SESSION_SECRET is not set");
  const token = await signSession(ADMIN_SESSION_SECRET, now() + SESSION_SECONDS, version ?? (await storedPassword())?.changedAt ?? 0);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: !(await isLocalRequest()),
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: SESSION_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete({ name: COOKIE, path: COOKIE_PATH });
}
