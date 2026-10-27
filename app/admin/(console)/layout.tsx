import { cookies } from "next/headers";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/admin/auth";
import { orderCounts } from "@/lib/admin/orders";
import { getDb } from "@/lib/db";

// Every signed-in admin page: the sidebar, and the page as a Paper sheet inset on Panel Grey.
// Each page still checks the session itself; this check only keeps the counts from rendering
// for anyone signed out.
export default async function ConsoleLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const [counts, store] = await Promise.all([getDb().then(orderCounts), cookies()]);
  return (
    <SidebarProvider defaultOpen={store.get("sidebar_state")?.value !== "false"}>
      <AdminSidebar waiting={counts.to_confirm + counts.to_ship} />
      <SidebarInset className="min-w-0 md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:ring-1 md:peer-data-[variant=inset]:ring-sidebar-border">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
