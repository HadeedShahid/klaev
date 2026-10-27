"use client";

import { Button } from "@/components/ui/button";

// On screen only: what's about to print, and the button that prints it.
export function PrintBar({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-hairline bg-background px-4 py-3 print:hidden">
      <p className="text-sm text-muted-foreground">{label}</p>
      <Button type="button" onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}
