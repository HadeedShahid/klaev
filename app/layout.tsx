import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Klaev", template: "%s | Klaev" },
  description: "Leather jackets and belts in real, full-grain leather. Made in Pakistan, delivered across Pakistan.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The admin's theme script may add "dark" before React hydrates (app/admin/layout.tsx).
    <html lang="en-PK" data-scroll-behavior="smooth" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
