import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ColourCards } from "@/components/home/colour-cards";
import { Faq } from "@/components/home/faq";
import { Hero } from "@/components/home/hero";
import { StorySection } from "@/components/home/story";
import { ExchangeTerms } from "@/components/site/exchange-terms";
import { JsonLd } from "@/components/site/json-ld";
import { PaymentBreakdown } from "@/components/product/payment-options";
import { HOME_LISTING } from "@/data/search-listings";
import { fillFaq, getFaq } from "@/lib/faq";
import { getCodTerms } from "@/lib/settings";
import { getCollection, getProduct, type Product } from "@/lib/catalog";
import { formatPKR } from "@/lib/money";
import { storeData } from "@/lib/seo";
import { jacketChest } from "@/lib/sizing";
import { whatsappLink } from "@/lib/store";
import { pill } from "@/lib/styles";

export const metadata: Metadata = {
  title: { absolute: HOME_LISTING.title },
  description: HOME_LISTING.description,
  alternates: { canonical: "/" },
};

function priceLabel(products: Product[]) {
  const prices = products.map((product) => product.price);
  const lowest = Math.min(...prices);
  return prices.every((price) => price === lowest) ? formatPKR(lowest) : `From ${formatPKR(lowest)}`;
}

// The landing page tells the cropped jacket's story: what it is, then the four doubts a
// cash-on-delivery buyer has, one section each. Everything here is cached, so it is all static shell.
export default async function HomePage() {
  const [cropped, lambskin, suede, darkBrown, terms, faq] = await Promise.all([
    getCollection("cropped-leather-jackets"),
    getCollection("leather-jackets"),
    getProduct("black-suede-jacket"),
    getProduct("dark-brown-cropped-sheepskin-leather-jacket"),
    getCodTerms(),
    getFaq(),
  ]);
  // The hero wears the black jacket, so black leads the colour cards.
  const croppedItems = [...(cropped?.items ?? [])].sort(
    (a, b) => Number(b.handle === "black-cropped-leather-jacket") - Number(a.handle === "black-cropped-leather-jacket"),
  );
  const sizeRows = croppedItems.find((product) => product.sizeGuide?.kind === "garment")?.sizeGuide;
  const sideView = darkBrown?.images[4];
  const closeUp = darkBrown?.images[9];
  const croppedPrice = Math.min(...croppedItems.map((product) => product.price));
  // The hero shows each colour worn, from the side and at the collar: the same shot positions in every
  // cropped jacket's photos. The swatch is cut from the flat-lay, the first photo.
  const heroColours = croppedItems.flatMap((product) => {
    const photos = [product.images[1], product.images[4], product.images[9]].filter((photo) => photo !== undefined);
    const swatch = product.images[0];
    if (photos.length === 0 || !swatch) return [];
    return [{ handle: product.handle, name: product.colour ?? product.title, title: product.title, swatch, photos }];
  });

  return (
    <div className="pb-8">
      <JsonLd data={storeData()} />
      <Hero price={priceLabel(croppedItems)} colours={heroColours} />
      <ColourCards products={croppedItems} />

      <StorySection
        id="cut"
        title="Cut to the waist."
        imageFit="portrait"
        image={sideView ? { ...sideView, alt: "Dark brown cropped jacket from the side, finishing at the waistband" } : undefined}
      >
        <p>
          Shorter than a standard leather jacket, it finishes at the trouser waistband. A pointed collar, a clean front
          zip, two welt pockets, snap-tab cuffs.
        </p>
      </StorySection>

      <StorySection
        id="leather"
        title="Real leather, up close."
        image={closeUp ? { ...closeUp, alt: "Close up of the collar and grain of the dark brown sheepskin" } : undefined}
      >
        <p>
          A-grade full-grain sheepskin with its natural grain intact. Not bonded leather, and not a coating made to look
          like grain. Each jacket varies a little, the way real leather does.
        </p>
      </StorySection>

      <StorySection id="fit" title="Sized by chest.">
        <p>Measured on the jacket, as a full chest. Compare it with a jacket you already own.</p>
        {sizeRows?.kind === "garment" ? (
          <table className="w-full max-w-sm overflow-hidden rounded-2xl bg-muted text-left text-base tabular-nums">
            <thead className="text-sm text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 pt-4 pb-2 font-normal">
                  Size
                </th>
                <th scope="col" className="px-5 pt-4 pb-2 text-right font-normal">
                  Jacket chest
                </th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              {sizeRows.rows.map((row) => (
                <tr key={row.size} className="border-t border-hairline">
                  <th scope="row" className="px-5 py-3 font-medium">
                    {row.size}
                  </th>
                  <td className="px-5 py-3 text-right">{jacketChest(row.chestFlat)} in</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </StorySection>

      <StorySection id="pay" title="How you pay.">
        <p>For a {formatPKR(croppedPrice)} cropped jacket:</p>
        <div className="flex w-full max-w-md flex-col gap-3">
          <PaymentBreakdown subtotal={croppedPrice} terms={terms} className="text-[0.9375rem]" />
          <ExchangeTerms />
        </div>
      </StorySection>

      <section aria-label="More jackets" className="mx-auto grid max-w-6xl gap-3 px-5 pt-20 md:grid-cols-2 md:px-8 md:pt-28">
        {lambskin ? (
          <LineTile
            title="Lambskin leather jackets."
            line="Soft from day one, and it ages into its own patina."
            price={priceLabel(lambskin.items)}
            action={{ label: "Shop lambskin", href: "/collections/leather-jackets" }}
            image={lambskin.items[0]?.images[0]}
          />
        ) : null}
        {suede ? (
          <LineTile
            title="Goatskin suede jacket."
            line="Matte and velvety, with more character than smooth leather."
            price={formatPKR(suede.price)}
            action={{ label: "Shop suede", href: `/products/${suede.handle}` }}
            image={suede.images[0]}
          />
        ) : null}
      </section>

      <section
        aria-labelledby="custom-title"
        className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-5 pt-20 text-center md:pt-28"
      >
        <h2 id="custom-title" className="text-[2rem] leading-[1.1] font-semibold tracking-tight md:text-5xl">
          Made to measure.
        </h2>
        <p className="text-lg text-balance text-muted-foreground">
          Pick your hide, lining, hardware and fit. One piece, cut to your measurements, not a size chart.
        </p>
        <a href={whatsappLink("Hi Klaev, I'd like a custom leather jacket made to my measurements.")} className={pill}>
          Design yours on WhatsApp
        </a>
      </section>

      <Faq items={fillFaq(faq, terms)} />
    </div>
  );
}

function LineTile({
  title,
  line,
  price,
  action,
  image,
}: {
  title: string;
  line: string;
  price: string;
  action: { label: string; href: string };
  image?: { src: string; width: number; height: number };
}) {
  return (
    <div className="flex flex-col items-center gap-3 overflow-hidden rounded-2xl bg-muted px-5 pt-10 text-center">
      <h2 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-balance">{title}</h2>
      <p className="text-balance text-muted-foreground">{line}</p>
      <p className="font-medium tabular-nums">{price}</p>
      <Link href={action.href} prefetch className={`${pill} mt-1`}>
        {action.label}
      </Link>
      {image ? (
        <Image
          src={image.src}
          width={image.width}
          height={image.height}
          alt=""
          sizes="(min-width: 768px) 50vw, 100vw"
          className="mt-6 mb-5 aspect-5/4 w-full rounded-xl object-cover"
        />
      ) : null}
    </div>
  );
}
