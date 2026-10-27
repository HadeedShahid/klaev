// The black pill: the one primary action style, shared by links and buttons.
export const pill =
  "inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-[0.9375rem] font-medium text-primary-foreground transition-[background-color,transform] hover:bg-primary/85 active:scale-[0.98]";

// The admin works at a denser size: fields at 40px, and the quiet pill (Panel Grey, Ink label,
// Press Grey on hover) for secondary actions. Its primary actions use the shadcn Button.
export const quietPill =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-muted px-4 text-sm font-medium whitespace-nowrap text-foreground transition-[background-color,transform] hover:bg-accent active:scale-[0.98] disabled:pointer-events-none disabled:text-muted-foreground";
export const adminField =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm transition-colors placeholder:text-muted-foreground";
