"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

// A native <details> whose panel slides open and closed. It stays a real <details>, so it works
// before hydration and without JavaScript; with reduced motion it opens instantly. Put the
// `disclosure-chevron` class on the summary's chevron and it turns with the panel (globals.css).
export function Disclosure({
  summary,
  children,
  className,
  summaryClassName,
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  summaryClassName?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const running = useRef<Animation | null>(null);

  function toggle(event: MouseEvent<HTMLElement>) {
    const details = ref.current;
    if (!details || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();

    const from = `${details.offsetHeight}px`;
    const opening = !details.open || details.dataset.closing !== undefined;
    running.current?.cancel();
    details.style.overflow = "hidden";

    let to: string;
    if (opening) {
      delete details.dataset.closing;
      details.open = true;
      to = `${details.offsetHeight}px`;
    } else {
      details.dataset.closing = "";
      to = `${event.currentTarget.offsetHeight}px`;
    }

    const animation = details.animate({ height: [from, to] }, { duration: opening ? 320 : 240, easing: EASE });
    running.current = animation;
    animation.onfinish = () => {
      if (!opening) {
        details.open = false;
        delete details.dataset.closing;
      }
      details.style.overflow = "";
      running.current = null;
    };
  }

  return (
    <details ref={ref} className={cn("group", className)}>
      <summary onClick={toggle} className={summaryClassName}>
        {summary}
      </summary>
      {children}
    </details>
  );
}
