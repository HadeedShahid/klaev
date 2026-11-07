---
version: 1
slug: "app-storefront-products-handle-page-tsx"
primary_target: "app/(storefront)/products/[handle]/page.tsx"
related_targets: []
---

# Product page (`/products/[handle]`)

**Mode:** Persuade. **Who:** a shopper in Pakistan on a phone, usually arriving straight from Instagram, Google or a WhatsApp link, deciding on a PKR 15,000 to 19,000 jacket or a PKR 2,500 belt. **Action:** add to cart, then checkout. **Proof on hand:** real product photos (up to 12 per jacket), real FAQ copy (sizing by chest, real leather against bonded, care, COD), the real exchange policy. **Constraints:** 390px first, minimal client JavaScript, many sizes sold out.

## Direction contract

THESIS: The category standard, executed with Apple Store clarity. One product, one calm column, choices made step by step, with the price and what you pay when always in view. It refuses the Shopify theme's cramped gallery-and-buy-box with badges and marquees.

OWN-WORLD: White ground, soft grey panels, near-black ink, one grey for secondary text. Black pill for the primary action. The leather photography supplies all the colour. Geist Sans throughout, large tight headings, tabular numerals for money. Rounded panels, hairlines only inside lists, no decorative shadows.

STORY: The visitor sees the jacket full width, reads the name and price at once, picks a size by chest measurement, sees exactly what cash on delivery costs (total, PKR 2,000 advance, amount on delivery) or that bank transfer delivers free, adds to cart, and finds leather, fit, care and exchanges in plain panels below.

FIRST VIEWPORT: 390 by 844. Slim glass top bar, 48px: Shop left, wordmark centred, cart right. Full-width 4:5 photo, swiped sideways, with a thin position indicator. Under it, the product name and the price. A sticky bottom bar with the price and the primary action is visible from first paint, and it says "Choose a size" until one is chosen.

FORM: canon, chosen by the user, quality bar the Apple Store. Seed key 4dd00c55. Signature interaction: the size step. Each size is a card naming its chest range, sold-out sizes stay visible but disabled, and choosing one turns the sticky bar into "Add to cart" with the size named.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Reviews extension (3 November 2026)

An extension inside this contract, not a new direction. Approved by the user from `.impeccable/mocks/reviews/board.png`: frame 1 (a quiet rating beside the price, and the fit verdict opposite "Size") and frame 2 ("In their words" after the details: the fit scale, then review cards swiped sideways, photos leading). Their words on seeing it: "The thing that is below the pricing on the landing page, you can build out the rest." Their answers before it: photos lead when a buyer sends one, though most send words, and WhatsApp screenshots back those up; stars stay quiet, Ink only. DESIGN.md: Stars, Review Card, Reviews (product page).

Changed the same day at the user's request: no fit at all ("You can just remove how it fits, you know, true to the size and all that. I just need simple, very simple reviews"), so the fit scale, the size step's fit verdict and the form's fit question are gone; every card carries a "Verified buyer" badge ("so each review like has an extra layer of authenticity"); and the page shows at most six reviews with the rest in a sheet, because the user didn't want the page to keep growing. An auto-scrolling row was considered and refused: nothing on the store moves unless the shopper moves it.
