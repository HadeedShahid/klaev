import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

// shadcn's Spinner. On its own it announces itself; inside a button, BusyLabel speaks for it.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return <Loader2Icon role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />;
}

export { Spinner };
