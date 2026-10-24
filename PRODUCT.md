# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Chosen by the user:

- Next.js 16 App Router with Cache Components (partial prerendering), React 19, TypeScript.
- shadcn/ui on Base UI, Nova preset, Lucide icons, Tailwind CSS v4.
- Geist Sans.
- Hosting and data on Cloudflare: Workers through the OpenNext adapter, D1, R2. Clerk for admin sign-in. Resend for email. Cloudflare comes later; the design phase runs on fixtures.
- Test-driven: Playwright end-to-end tests cover every workflow and run on every change, with Vitest for units.

## Users

**Shoppers in Pakistan, almost all on phones.** Desktop traffic is negligible. They arrive from Instagram, Google search ("leather jacket Pakistan"), and links shared on WhatsApp or by word of mouth, so many land directly on a product or collection page rather than the home page. The menswear line ("Men's Cropped Leather Jackets") suggests mostly men. They pay cash on delivery with an advance, or by bank transfer, and they have seen plenty of shops sell bonded leather as "genuine", so trust is earned, not assumed.

**The owner**, who runs orders, payments, stock and analytics through the admin. One account for now.

## Product Purpose

Klaev sells premium leather jackets and belts across Pakistan. This site replaces the Shopify store with a custom one that costs less to run and does what Shopify could not: track an advance plus cash-on-delivery payment per order, show profit, and put Shopify-grade analytics inside the store's own admin.

Success: shoppers on phones go from an Instagram or Google link to a confirmed order without friction, and the owner runs the business from the admin instead of a spreadsheet.

## Positioning

Real leather in a market full of bonded scraps sold as "genuine leather". Klaev's leather is cut from solid hides, never bonded: full-grain sheepskin and lambskin for jackets, goatskin suede, and single-piece cow leather for belts. It is made in Pakistan and is part of Metro Textile Sourcing, a family leather-sourcing business. The current site says Klaev sources from Pakistani tanneries that also supply international luxury brands.

## Operating Context

- Market: Pakistan only. Prices in PKR. Delivery nationwide, most orders arrive in 2 to 5 days.
- Payments: cash on delivery (PKR 900 delivery fee, PKR 2,000 advance by default sent to the owner's bank account) or bank transfer (free delivery). No card gateway.
- Orders are confirmed with the customer on WhatsApp (+92 323 1483650) before shipping.
- Courier: PostEx, booked by hand. Never named on the storefront or in customer emails.
- Exchanges: size exchanges within 7 days of delivery, unworn with tags intact, customer pays delivery both ways. No refunds.
- Custom jackets are made to order. For now an enquiry goes to WhatsApp or the contact form. A jacket designer is planned later.
- Full feature scope: `docs/scope.md`.

## Capabilities and Constraints

Current catalog (from the live Shopify store, October 2026):

| Line | Products | Price | Sizes |
|---|---|---|---|
| Cropped sheepskin leather jackets (lead line) | Black, Dark Brown, Burgundy | PKR 17,999 | S, M, L, XL |
| Lambskin leather jackets | Black, Oxblood | PKR 14,999 | M, L, XL |
| Goatskin suede jacket | Black | PKR 18,999 | M, L, XL |
| Leather belts | Black Stitched, Black Studded, Brown Textured, Maroon Stitched, Brown Dotted, Twin Shade | PKR 2,500 | One size |

- Jackets lead the store. Belts are secondary.
- Stock is low and per size: many sizes sell out. Sold-out states must be designed, not an afterthought.
- Keep Shopify's URL shapes (`/products/`, `/collections/`, `/pages/`, `/blogs/`) for SEO.
- Performance comes first. Mobile first, server-rendered first, minimal client JavaScript. Any feature's weight on a phone is weighed before it is built.

## Brand Commitments

- Name: Klaev. Seasonal label: SS·26.
- Voice: minimal, editorial, quietly confident. Short sentences, sometimes fragments. Trusts the reader. "Quiet objects, loud intent." is approved hero copy.
- Never: em dashes or en dashes; luxury clichés ("elevate your style", "timeless elegance"); hype or urgency; footwear references; "made in Italy" or "made in Portugal"; any currency but PKR.
- Write "made in Pakistan", not "made in Lahore".
- Eyebrow format: `[Collection] / SS·26`. Stats as numbered labels: `01`, `02`, `03`.
- Brand palette direction from the brand: black, white and grey, with the leather supplying the colour.
- Do not copy the Shopify theme's look. It reads as Shopify. The new site needs its own custom elements.
- Visual direction (chosen 2026-10-24 in the Impeccable direction round): the category standard, a clean premium store, executed at full craft with no irony and no smuggled quirk. Quality bar: the Apple Store's buy flow (calm, exact, step-by-step choices, price always visible). Klaev's own elements are functional, not decorative: the advance and on-delivery breakdown, sizing by chest measurement, and plainly stated exchange terms.
- The user rejects: loud streetwear and urgency, anything that reads as a generic template, and dark, moody "leather brand" styling.
- Social: Instagram @getklaev. Email: business.klaev@gmail.com.

## Evidence on Hand

- Product photography for all 12 products on the Shopify CDN (up to 12 images per cropped jacket). Reference shoots in `../klaev-shopify/images/references/` (cropped jackets in chocolate brown and burgundy, the primary model).
- AI-generated campaign imagery in `../klaev-shopify/images/generated/` and hero images in `../klaev-shopify/assets/` (`Hero-section.webp`, `Hero-section-desktop.webp`).
- Real FAQ copy on sizing, leather quality and care in the Shopify product templates.
- No customer reviews, ratings or testimonials exist. Do not show ratings or invent quotes.
- No press or certifications.

## Product Principles

1. Built for the phone in a hand. If it is not excellent at 390px, it is not done.
2. Earn trust with specifics: the hide, the cut, the real price, the real policy. Never with hype.
3. Say less. Every element and every word has to earn its place.
4. Speed is a feature. Nothing ships that slows the first view on a mid-range Android phone.
5. Honest states: sold out, advance required, delivery fee, exchange rules, all stated plainly before checkout.

## Accessibility & Inclusion

WCAG 2.2 AA as the floor. Large touch targets for one-handed use, readable on bright outdoor screens, and usable on slow mobile connections.
