import type { Metadata, Viewport } from "next";

import { AdminTheme } from "@/components/admin/admin-theme";
import { THEME_SCRIPT } from "@/lib/admin-theme";

// The admin never appears in search, and every page's title says which part of it you're in.
export const metadata: Metadata = {
  title: { template: "%s · Klaev admin", default: "Klaev admin" },
  robots: { index: false, follow: false },
};

// The browser's own chrome follows the system's light or dark, as the admin does by default.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div data-admin className="flex min-h-dvh flex-col bg-background">
      {/* Runs as the page is read, before anything below it paints, so a dark admin never flashes white. */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <AdminTheme />
      {children}
    </div>
  );
}
