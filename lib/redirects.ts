import { SITE_URL } from "@/constants/env.client";

export function safeRedirectPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;

  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const target = new URL(value);
    if (target.origin === new URL(SITE_URL).origin) {
      return `${target.pathname}${target.search}`;
    }
  } catch {
    return fallback;
  }

  return fallback;
}
