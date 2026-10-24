import Image from "next/image";
import type { ReactNode } from "react";

import type { ProductImage } from "@/lib/catalog";
import { cn } from "@/lib/utils";

// One doubt answered per screen: a headline, a few plain sentences, and the proof beneath.
export function StorySection({
  id,
  title,
  children,
  image,
  imageFit = "wide",
}: {
  id: string;
  title: string;
  children: ReactNode;
  image?: ProductImage;
  // "portrait" keeps the whole 4:5 photo on wide screens, for photos whose proof sits at the edges.
  imageFit?: "wide" | "portrait";
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 pt-16 md:px-8 md:pt-28"
    >
      <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
        <h2
          id={`${id}-title`}
          className="text-[2rem] leading-[1.1] font-semibold tracking-tight text-balance md:text-5xl"
        >
          {title}
        </h2>
        <div className="flex flex-col items-center gap-4 text-lg text-balance text-muted-foreground">{children}</div>
      </div>
      {image ? (
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt={image.alt}
          sizes="(min-width: 1152px) 1088px, 100vw"
          className={cn(
            "aspect-4/5 w-full rounded-2xl bg-muted object-cover",
            imageFit === "wide" ? "md:aspect-16/10 md:object-[50%_30%]" : "md:max-w-xl",
          )}
        />
      ) : null}
    </section>
  );
}
