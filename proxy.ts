import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/constants/env.client";

const CUSTOMER_LOGIN = "/login";
const ADMIN_LOGIN = "/admin/login";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const loginPath = isAdminRoute ? ADMIN_LOGIN : CUSTOMER_LOGIN;

  if (!isSignedIn && pathname !== loginPath) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.search = "";
    url.searchParams.set("next", pathname);

    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/reset-password"],
};
