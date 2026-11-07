"use client";

import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";

import { quietPill } from "@/lib/styles";
import { cn } from "@/lib/utils";

// Every review, in a sheet that slides in like the cart drawer and scrolls inside itself, so the
// product page stays the same height however many reviews there are. A native modal <dialog>: Esc,
// the close button or a tap outside closes it, and focus goes back to the button.
export function AllReviews({ count, children }: { count: number; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          dialog.current?.showModal();
          heading.current?.focus();
        }}
        className={cn(quietPill, "h-11 px-5")}
      >
        Read all {count} reviews
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="reviews-sheet m-0 ml-auto h-dvh max-h-none w-full max-w-lg border-0 bg-background p-0 text-foreground"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-5">
            <h2 ref={heading} id={titleId} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
              {count} reviews
            </h2>
            <button type="button" aria-label="Close" onClick={close} className="-mr-2 flex size-11 items-center justify-center rounded-full transition-colors hover:bg-accent">
              <X className="size-5" strokeWidth={1.6} aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
        </div>
      </dialog>
    </>
  );
}
