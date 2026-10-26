"use client";

import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { preload } from "react-dom";


type Photo = { src: string; width: number; height: number };

export type HeroColour = {
  handle: string;
  name: string;
  title: string;
  swatch: Photo;
  // Worn from the front, the side profile that shows the waist-length cut, and the collar.
  photos: Photo[];
};

const MAIN_SIZES = "(min-width: 768px) 66vw, 100vw";

// The hero's photos with a colour picker. Choosing a colour swaps every photo for that jacket's;
// tapping a photo opens the jacket. Phones show the main photo alone; from tablets up the main
// photo and two details run the width of the page as one mosaic.
export function HeroPhotos({ colours }: { colours: HeroColour[] }) {
  const [chosen, setChosen] = useState(0);
  const labelId = useId();
  const colour = colours[chosen];

  // Fetch a colour's main photo as soon as the shopper reaches for its swatch.
  function warm(index: number) {
    const photo = colours[index]?.photos[0];
    if (!photo) return;
    const { props } = getImageProps({ ...photo, alt: "", sizes: MAIN_SIZES });
    preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes });
  }

  const alts = [
    `${colour.name} cropped leather jacket, worn, on a grey studio ground`,
    `${colour.name} cropped leather jacket from the side, ending at the waist`,
    `Collar and zip of the ${colour.name.toLowerCase()} cropped leather jacket`,
  ];

  const picker = (
    <div className="glass flex items-center gap-1 rounded-full border border-foreground/8 p-1 pr-4">
      <span id={labelId} className="sr-only">
        Colour
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="flex items-center">
        {colours.map((option, index) => (
          <label
            key={option.handle}
            onPointerEnter={() => warm(index)}
            onTouchStart={() => warm(index)}
            className="relative flex size-11 cursor-pointer items-center justify-center rounded-full has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
          >
            <input
              type="radio"
              name="hero-colour"
              value={option.handle}
              checked={index === chosen}
              onChange={() => setChosen(index)}
              onFocus={() => warm(index)}
              className="peer absolute inset-0 cursor-pointer appearance-none rounded-full opacity-0"
            />
            <span className="sr-only">{option.name}</span>
            {/* The swatch is the leather itself: the flat-lay photo, enlarged five times onto the
                left chest panel, so black, brown and burgundy read apart even at 32px. It lets taps
                through to the radio beneath. A slightly soft copy is plenty for leather at 32px. */}
            <span className="pointer-events-none size-8 overflow-hidden rounded-full ring-1 ring-foreground/10 ring-offset-2 ring-offset-transparent transition-shadow peer-checked:ring-2 peer-checked:ring-foreground">
              <Image
                {...option.swatch}
                alt=""
                sizes="128px"
                className="size-full origin-[37%_40%] scale-500 object-cover"
              />
            </span>
          </label>
        ))}
      </div>
      <span aria-hidden className="min-w-[4.75rem] pl-1 text-sm font-medium">
        {colour.name}
      </span>
    </div>
  );

  const [main, ...details] = colour.photos;

  return (
    <div className="md:mx-auto md:grid md:h-[min(78vh,52rem)] md:w-full md:max-w-6xl md:grid-cols-[2fr_1fr] md:grid-rows-2 md:gap-2 md:px-8">
      {/* The picker floats on the main photo, beside its link rather than inside it, so choosing a
          colour never opens the jacket. */}
      <div className="relative overflow-hidden bg-muted md:row-span-2 md:rounded-2xl">
        <Link
          key={colour.handle}
          href={`/products/${colour.handle}`}
          data-testid="hero-main"
          className="block h-full animate-in fade-in duration-500 motion-reduce:animate-none"
        >
          <Image
            {...main}
            alt={alts[0]}
            sizes={MAIN_SIZES}
            loading="eager"
            fetchPriority={chosen === 0 ? "high" : undefined}
            // On wide screens the frame is shorter than the photo. Every main photo puts the hem 75% of
            // the way down, so the crop sits low enough to keep the hem clear above the picker.
            className="block aspect-4/5 w-full object-cover object-top md:aspect-auto md:h-full md:object-[50%_60%]"
          />
        </Link>
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center md:bottom-6">
          <div className="pointer-events-auto">{picker}</div>
        </div>
      </div>
      {details.map((photo, index) => (
        <Link
          key={`${colour.handle}-${photo.src}`}
          href={`/products/${colour.handle}`}
          className="hidden overflow-hidden rounded-2xl bg-muted animate-in fade-in duration-500 motion-reduce:animate-none md:block"
        >
          <Image {...photo} alt={alts[index + 1] ?? colour.title} sizes="33vw" className="block h-full w-full object-cover" />
        </Link>
      ))}
    </div>
  );
}