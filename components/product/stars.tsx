import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

// Lucide's star, solid: Ink when it counts, Outline Grey when it doesn't. Stars carry no colour of
// their own, like everything else on the store.
export function Star({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-3.5 shrink-0", filled ? "fill-foreground" : "fill-border", className)}>
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    </svg>
  );
}

// A rating as five stars, rounded to the nearest whole one. Read out as "4.7 out of 5 stars".
export function Stars({ rating, className, starClassName }: { rating: number; className?: string; starClassName?: string }) {
  const whole = Math.round(rating);
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className={cn("inline-flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star key={value} filled={value <= whole} className={starClassName} />
      ))}
    </span>
  );
}

// Every review comes from a delivered order, so every card says so: a white pill on the card's grey,
// Ink like everything else.
export function VerifiedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-medium">
      <BadgeCheck className="size-3.5" strokeWidth={2} aria-hidden />
      Verified buyer
    </span>
  );
}
