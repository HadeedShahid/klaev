import type { ReactNode } from "react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

// The top of every admin page: the sidebar toggle, the page's title, and its controls on the right.
export function PageHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-hairline px-4 py-2 md:px-6">
      <SidebarTrigger className="-ml-1.5" />
      {/* base-nova stretches a vertical separator with data-vertical; this keeps it a 16px rule on the title's centre line. */}
      <Separator orientation="vertical" className="data-vertical:h-4 data-vertical:self-center" />
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </header>
  );
}
