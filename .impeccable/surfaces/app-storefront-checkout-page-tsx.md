---
version: 1
slug: "app-storefront-checkout-page-tsx"
primary_target: "app/(storefront)/checkout/page.tsx"
related_targets: ["app/(storefront)/orders/[token]/page.tsx"]
---

# Checkout (`/checkout`) and order page (`/orders/[token]`)

**Mode:** Operate. **Who:** a shopper in Pakistan on a phone, one or two jackets in the cart, often typing with one thumb on a slow connection. **Task:** give contact and delivery details, choose cash on delivery or bank transfer, place the order, then send the advance or the full amount and prove it. **Frequency:** once per order; most buyers are first-timers. **States:** empty cart, field errors, a size that sold out while they typed, placing, placed; on the order page: waiting for payment, receipt uploading, receipt received, upload failed. **Confirmed answers (25 Oct 2026):** one scrolling page with the place-order bar fixed at the bottom; the receipt is uploaded after placing, from the order page, with WhatsApp to 0323 1483650 as the other way. No discount field until the admin has codes. **Constraints:** 390px first, minimal client JavaScript, the bank details come from the database, never the code.

## Direction contract

THESIS: The counter writing your receipt. One calm column where every rupee is stated before the button: what you send now, what you pay at the door. It refuses Shopify's two-column checkout, its folded order summary that hides the total, and an order page that leaves people asking what to send and where.

OWN-WORLD: The store's world unchanged: white ground, Panel Grey panels at 2xl radius, Ink text and the black pill, Quiet Grey as the only secondary voice, hairlines ruling lists, Geist with tabular money. Fields are 48px tall at xl radius with an Outline Grey border and the Ink focus outline. The payment choice reuses the size-card language: whole-card radios that take an Ink outline when chosen. Signal Red only for a field's error line.

STORY: The shopper sees their jackets with size and price, types name, mobile and email with the right phone keyboards, picks a city and writes the address, chooses how to pay and watches the breakdown change, then places the order. The order page opens on the order number and one instruction: send this amount to this account. The account number copies with one tap, then the screenshot uploads there or goes on WhatsApp.

FIRST VIEWPORT: 390 by 844. Header. "Checkout" at title size, then the order lines (48px thumbnail, name, size, price), then "Contact" and its first fields. Fixed bottom bar from first paint: what to send now in semibold with the total beneath, and the "Place order" pill. Order page: "Order #1022 is in." title, a Lead line naming the amount to send, then the Panel Grey account panel (bank, title, number with a Copy button, amount), then "Upload screenshot" as the pill with "Send it on WhatsApp" as the quiet link.

FORM: Shaped directly as an extension of the canon world (seed key 4dd00c55); no concept roll, since docs/scope.md fixes the structure. Signature interaction: choosing the payment rewrites the bottom bar and the breakdown at once ("PKR 2,000 to confirm" or "PKR 17,999 by bank transfer"). Motion: the bar's figure crossfades, copy confirms in place.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
