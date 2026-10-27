"use client";

import { BadgePercent, BarChart3, ExternalLink, FileText, Home, LogOut, Package, Settings, ShoppingBag, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/actions/admin";
import { ThemeMenu } from "@/components/admin/admin-theme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type Section = { href: string; label: string; icon: LucideIcon; exact?: boolean; sub?: { href: string; label: string }[] };

// Laid out like Shopify's admin, so it feels familiar: each section, and its pages while you're in it.
const NAV: Section[] = [
  { href: "/admin", label: "Home", icon: Home, exact: true },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ShoppingBag,
    sub: [
      { href: "/admin/orders/new", label: "Create order" },
      { href: "/admin/checkouts", label: "Abandoned checkouts" },
    ],
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: Package,
    sub: [
      { href: "/admin/collections", label: "Collections" },
      { href: "/admin/inventory", label: "Inventory" },
    ],
  },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/discounts", label: "Discounts", icon: BadgePercent },
  {
    href: "/admin/content/journal",
    label: "Content",
    icon: FileText,
    sub: [
      { href: "/admin/content/journal", label: "Journal" },
      { href: "/admin/content/faq", label: "FAQ" },
    ],
  },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const within = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function AdminSidebar({ waiting }: { waiting: number }) {
  const pathname = usePathname();
  return (
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarHeader className="px-4 pt-4 pb-2">
        <Link href="/admin" className="flex items-baseline gap-2.5">
          <span className="text-[0.9375rem] font-semibold tracking-[0.28em] uppercase">Klaev</span>
          <span className="text-sm text-muted-foreground">Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((section) => {
                // One highlight per page: the sub page you're on, or else the section itself.
                const currentSub = (section.sub ?? []).find((page) => within(pathname, page.href))?.href;
                const inSection = section.exact ? pathname === section.href : within(pathname, section.href) || currentSub !== undefined;
                const active = !currentSub && (section.exact ? pathname === section.href : within(pathname, section.href));
                return (
                  <SidebarMenuItem key={section.href}>
                    <SidebarMenuButton isActive={active} render={<Link href={section.href} aria-current={active ? "page" : undefined} />}>
                      <section.icon strokeWidth={1.8} aria-hidden />
                      <span>{section.label}</span>
                    </SidebarMenuButton>
                    {section.href === "/admin/orders" && waiting > 0 ? (
                      <SidebarMenuBadge className="tabular-nums" aria-label={`${waiting} waiting`}>
                        {waiting}
                      </SidebarMenuBadge>
                    ) : null}
                    {section.sub && inSection ? (
                      <SidebarMenuSub>
                        {section.sub.map((page) => {
                          const current = page.href === currentSub;
                          return (
                            <SidebarMenuSubItem key={page.href}>
                              <SidebarMenuSubButton isActive={current} render={<Link href={page.href} aria-current={current ? "page" : undefined} />}>
                                <span>{page.label}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeMenu />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="/" target="_blank" rel="noreferrer" />}>
              <ExternalLink strokeWidth={1.8} aria-hidden />
              <span>View store</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={signOut}>
              <SidebarMenuButton type="submit">
                <LogOut strokeWidth={1.8} aria-hidden />
                <span>Sign out</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
