"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

import type { ProductImage } from "@/lib/catalog";
import imageLoader from "@/lib/image-loader";
import { cn } from "@/lib/utils";

const roundButton =
  "flex size-12 items-center justify-center rounded-full bg-muted transition-[background-color,opacity] hover:bg-accent disabled:pointer-events-none disabled:opacity-30";

// The full-screen photo viewer. Any photo in the gallery (the element with `targetId`) opens it at
// that photo. A native modal <dialog>: it takes focus, Esc closes it, and focus goes back to the
// photo that opened it. It opens on its (unseen) title rather than the close button, so a tap
// doesn't greet the shopper with a focus ring. Phones swipe; wide screens get arrows, arrow keys
// and thumbnails.
export function GalleryViewer({ targetId, title, images }: { targetId: string; title: string; images: ProductImage[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [start, setStart] = useState(0);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const titleId = useId();

  useEffect(() => {
    const gallery = document.getElementById(targetId);
    if (!gallery) return;
    function onClick(event: MouseEvent) {
      const button = (event.target as Element).closest<HTMLElement>("[data-open-photo]");
      if (!button) return;
      trigger.current = button;
      const index = Number(button.dataset.openPhoto);
      setStart(index);
      setCurrent(index);
      setOpen(true);
    }
    gallery.addEventListener("click", onClick);
    return () => gallery.removeEventListener("click", onClick);
  }, [targetId]);

  // Show the modal and place the track on the chosen photo before the first frame paints.
  useLayoutEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    heading.current?.focus();
    const list = track.current;
    if (list) list.scrollLeft = list.clientWidth * start;
  }, [open, start]);

  function onScroll() {
    const list = track.current;
    if (!list) return;
    setCurrent(Math.min(images.length - 1, Math.max(0, Math.round(list.scrollLeft / list.clientWidth))));
  }

  function go(index: number) {
    const list = track.current;
    if (!list) return;
    const target = Math.min(images.length - 1, Math.max(0, index));
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ left: list.clientWidth * target, behavior: smooth ? "smooth" : "auto" });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") go(current + 1);
    if (event.key === "ArrowLeft") go(current - 1);
  }

  function onClose() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onKeyDown={onKeyDown}
      className="viewer m-0 h-dvh max-h-none w-full max-w-none border-0 bg-background p-0 text-foreground"
    >
      {open ? (
        <div className="flex h-full flex-col">
          <h2 ref={heading} id={titleId} tabIndex={-1} className="sr-only outline-none">
            Photos of {title}
          </h2>
          <div className="flex h-14 shrink-0 items-center justify-between px-5 md:h-16 md:px-8">
            <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
              {current + 1} of {images.length}
            </p>
            <button
              type="button"
              aria-label="Close photos"
              onClick={() => dialog.current?.close()}
              className="-mr-2 flex size-11 items-center justify-center rounded-full transition-colors hover:bg-accent"
            >
              <X className="size-5" strokeWidth={1.6} aria-hidden />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            <ul
              ref={track}
              aria-label="Photos"
              onScroll={onScroll}
              className="scrollbar-none flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
            >
              {images.map((image, index) => (
                <li
                  key={image.src}
                  // The smaller copy the gallery already loaded fills in until the sharp one arrives.
                  style={{ backgroundImage: `url(${imageLoader({ src: image.src, width: 640 })})` }}
                  className="flex h-full w-full shrink-0 snap-center snap-always bg-contain bg-center bg-no-repeat bg-origin-content md:px-24"
                >
                  <Image
                    src={image.src}
                    width={image.width}
                    height={image.height}
                    alt={image.alt}
                    sizes="100vw"
                    loading={index === start ? "eager" : "lazy"}
                    className="h-full w-full object-contain"
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              aria-label="Previous photo"
              disabled={current === 0}
              onClick={() => go(current - 1)}
              className={cn(roundButton, "absolute top-1/2 left-6 hidden -translate-y-1/2 md:flex")}
            >
              <ChevronLeft className="size-5" strokeWidth={1.6} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              disabled={current === images.length - 1}
              onClick={() => go(current + 1)}
              className={cn(roundButton, "absolute top-1/2 right-6 hidden -translate-y-1/2 md:flex")}
            >
              <ChevronRight className="size-5" strokeWidth={1.6} aria-hidden />
            </button>
          </div>

          <div aria-hidden className="flex shrink-0 gap-0.5 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden">
            {images.map((image, index) => (
              <span
                key={image.src}
                className={cn("h-0.5 flex-1 transition-colors duration-300", index === current ? "bg-foreground" : "bg-foreground/30")}
              />
            ))}
          </div>
          <div className="hidden shrink-0 justify-center gap-2 px-8 pt-4 pb-6 md:flex">
            {images.map((image, index) => (
              <button
                key={image.src}
                type="button"
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === current ? "true" : undefined}
                onClick={() => go(index)}
                className="overflow-hidden rounded-lg bg-muted ring-offset-2 transition-shadow aria-current:ring-2 aria-current:ring-foreground"
              >
                <Image src={image.src} width={image.width} height={image.height} alt="" sizes="48px" className="aspect-4/5 w-12 object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
