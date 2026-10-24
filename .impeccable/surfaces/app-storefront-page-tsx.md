---
version: 1
slug: "app-storefront-page-tsx"
primary_target: "app/(storefront)/page.tsx"
related_targets: ["app/(storefront)/collections/[handle]/page.tsx"]
---

# Landing page (`/`)

**Mode:** Persuade. **Who:** a shopper on a phone who already knows the name, usually from the Instagram bio, a brand search or a shared link, deciding whether to trust an online leather jacket at PKR 15,000 to 19,000. **Action:** open a cropped jacket (the lead line), or shop a line. **Proof on hand:** the campaign photo of the black cropped jacket, the product photos (model shots and leather close-ups), the real size chart, the real payment and exchange terms, the FAQ copy from Shopify corrected to the real policies. **Constraints:** belts are hidden until launch; 390px first; minimal client JavaScript; inherits DESIGN.md.

## Direction contract

THESIS: An Apple-style product story for the cropped jacket. It names the line, shows it, lets ready buyers tap a colour at once, then answers the four doubts that stop a cash-on-delivery buyer, one per screen. It refuses a product grid with a banner on top.

OWN-WORLD: DESIGN.md, unchanged. White ground, grey panels, near-black ink, one grey voice, black pills, Geist, tabular money, no shadows. The photography carries the colour.

STORY: The visitor reads "Cropped leather jackets." with the price, sees the jacket worn, can tap Black, Dark Brown or Burgundy straight away, then learns the cut, sees the leather up close, finds their size by chest, and sees exactly what they pay and when. Lambskin, suede and made-to-order jackets follow, then the FAQ.

FIRST VIEWPORT: 390 by 844. Slim top bar. Headline "Cropped leather jackets." and one supporting line, then "From PKR 17,999", then the black "Shop cropped" pill beside a quiet "See the colours" link. The campaign photo begins below and runs past the fold.

FORM: The Story Scroll, third on the ranked list of seven, dealt as the lead. Seed key db4c7dfb. Steer from the user: the three cropped colours as tappable cards right under the hero, before the story. Signature moment: tapping a colour card morphs its photo into the product page.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
