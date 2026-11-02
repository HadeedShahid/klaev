import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// shadcn's Alert in the store's materials: a Panel Grey block at the xl radius, an icon in the left
// column and the words beside it. No role of its own: the caller says whether it's news (status) or
// a problem (alert), so a live region isn't announced twice. By the Red Line Rule an error keeps the
// grey panel and only its words turn red.
const alertVariants = cva(
  "grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-xl bg-muted px-4 py-3 text-[0.9375rem] has-[>svg]:grid-cols-[1.125rem_1fr] has-[>svg]:gap-x-2.5 [&>svg]:size-[1.125rem] [&>svg]:translate-y-px",
  {
    variants: {
      variant: {
        default: "text-foreground",
        error: "text-destructive [&>svg]:text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-title" className={cn("col-start-2 font-medium text-pretty", className)} {...props} />;
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("col-start-2 text-muted-foreground text-pretty", className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle };
