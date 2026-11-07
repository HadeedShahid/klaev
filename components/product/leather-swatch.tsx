import Image from "next/image";

import type { Photo } from "@/lib/reviews";
import { cn } from "@/lib/utils";

// The leather itself as a dot: the flat-lay photo enlarged five times onto the left chest panel, as
// in the home page's colour picker, so black, brown and burgundy read apart at 32px.
export function LeatherSwatch({ photo, className }: { photo: Photo; className?: string }) {
  return (
    <span aria-hidden className={cn("size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/10", className)}>
      <Image src={photo.src} width={photo.width} height={photo.height} alt="" sizes="128px" className="size-full origin-[37%_40%] scale-500 object-cover" />
    </span>
  );
}
