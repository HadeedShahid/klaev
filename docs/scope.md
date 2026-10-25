# Klaev store scope

Draft, 24 October 2026, updated with the first round of answers. Nothing here is built yet. Edit this file as decisions change.

Klaev sells premium leather jackets and belts in Pakistan. This repo replaces the Shopify store with a Next.js site that runs entirely on Cloudflare. Customers pay cash on delivery (COD) or by bank transfer. There is no card payment gateway.

## Decisions so far

| Topic | Decision |
|---|---|
| Checkout contact | Name, phone and email are all required |
| COD advance | PKR 2,000 by default on every COD order, editable per order. Shown in the checkout breakdown with where to send it |
| Advance destination | Your bank account, the same one shown for bank transfers. You'll give the details when checkout is built |
| COD delivery fee | PKR 900, added at checkout. Free with bank transfer |
| Courier | PostEx, with no API integration. Tracking numbers are entered by hand. Named only inside the admin, never on the storefront or in customer emails |
| PostEx fees | About PKR 1,100 per COD parcel and PKR 310 per prepaid (bank transfer) parcel. Klaev pays the 310 because bank transfer delivery is free to the customer |
| Refunds | Not offered, including for defects |
| Exchanges | Size exchanges within 7 days of delivery. The customer pays delivery both ways |
| WhatsApp | +92 323 1483650 |
| Ads | Meta Pixel and Conversions API built in, switched off until ads run |
| Admin login | Clerk. One account for now: yours. Staff accounts later |
| Custom jackets | In v1 as a WhatsApp or contact-form enquiry. A jacket designer comes later |

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 16 on Cloudflare Workers, deployed with the OpenNext adapter | One codebase for the storefront, admin and API |
| Plan | Workers Paid, $5 a month | The free plan allows 10 ms of CPU per request, which is too little for server rendering |
| Database | D1 (SQLite) with Drizzle ORM | Included in Workers Paid: 25 billion row reads and 50 million row writes a month |
| Images and uploads | R2. Product photos are stored ready-sized as WebP, one copy per width the site asks for, so nothing resizes on request | Product photos and bank transfer receipts |
| Admin login | Clerk, free plan | Prebuilt sign-in and user management, and ready for customer accounts later |
| Email | Resend, templates in React Email | Cloudflare's own sending is still in beta. All mail goes through one `sendEmail()` so switching later is a one-file change |
| Scheduled jobs | Cron Triggers | Abandoned checkout reminders, daily summary email, nightly analytics rollups |
| Analytics | Built in: a tiny tracker plus server-side events, stored in D1 | See below |
| Ads tracking | Meta Pixel and Conversions API, off by default | Ready for when ads run. See Ads tracking |
| Session replays (optional) | Microsoft Clarity, loaded late and only on chosen pages | Free. The one analytics feature not worth building |

### Why D1

- Around 15 products and modest order volume. SQLite handles this with room to spare.
- It lives inside Cloudflare: no second bill, no connection pooling, no cold connections.
- Limits to know: 10 GB per database and one write at a time. Neither matters at Klaev's size.

### Clerk

- Runs only on `/admin`. Storefront pages never load Clerk, so it adds nothing to what shoppers download.
- The free plan covers 50,000 monthly users, sign-in by emailed code and Google, and up to 3 dashboard seats.
- What the free plan leaves out: two-factor sign-in (Pro, $25 a month) and removing the "Secured by Clerk" badge from its sign-in screens. Sessions last a fixed 7 days.
- Users live in Clerk, not D1. Orders and logs store the Clerk user ID.
- Earlier Clerk problems on OpenNext are fixed. One thing to check on the first deploy: Next 16 runs Clerk's request check in `proxy.ts`, and OpenNext still has open bugs about bundle size there.

### Why build analytics in

- Every store action (add to cart, checkout, order) already runs through our server, so recording it ships no JavaScript to the phone.
- Page views come from a script under 1 KB that sends a beacon to our own API. Same-domain tracking is rarely blocked.
- Cloudflare attaches the visitor's country and city to every request, so "visitors and sales by city" costs nothing.
- Every number sits in one admin next to the orders, instead of in a separate tool.
- Session replays and heatmaps are the exception. Clarity does those for free if we ever need them.

## Storefront

What the Shopify theme has today, and what the new site does.

| Area | On Shopify today | New site | When |
|---|---|---|---|
| Home | Editorial hero, collections grid (cropped, leather, suede jackets), featured products, marquee of store promises, custom jacket banner, journal preview, FAQ | Same sections | v1 |
| Announcement bar | "Nationwide Free Delivery on Bank Transfers" | Same, text editable in admin | v1 |
| Collections | Header, editorial intro, product grid, filters, FAQ | Same, with filters for size, colour and price, plus sorting | v1 |
| Product page | Gallery, price, size and colour picker, quantity, add to cart, model info ("Model is 5'6" and wears size Small"), details accordion, FAQ, recommendations | Same, plus a size guide, low-stock notice and delivery estimate | v1 |
| Cart | Slide-out drawer | Same, and the cart survives a closed tab | v1 |
| Search | Predictive search in the header, results page with filters | Same, using SQLite full-text search in D1 | v1 |
| Checkout | Shopify checkout with COD and bank transfer | Our own one-page checkout (see below) | v1 |
| Order tracking | Shopify customer accounts | Track-your-order page using order number and phone. Shows our own status steps and never names the courier | v1 |
| Customer accounts | Account menu in the header | Sign in with an emailed code to see past orders. No passwords | Later |
| Journal | Blog with articles, three shown on home | Same URLs, existing posts carried over, new posts written in admin | v1 |
| Pages | About, contact form, policies | Same, plus a WhatsApp link on the contact page and in the footer. Contact messages are emailed to you and kept in an admin inbox | v1 |
| Exchange policy | Marquee says "30-day returns". FAQ offers exchanges within 7 days and full refunds for defective pieces. Google structured data says 30-day returns | Rewritten everywhere to match the real policy: size exchanges within 7 days of delivery, unworn with tags intact, customer pays delivery both ways, no refunds | v1 |
| Newsletter signup | Only on the password page | Footer signup, stored in D1 | v1 |
| Custom jackets | "Design yours" banner, button not linked yet | "Design yours" opens WhatsApp (+92 323 1483650) with a prefilled message, or the contact form with "Custom jacket" as the subject | v1 |
| Jacket designer | None | Customers design their own jacket on a canvas: hide, lining, hardware, fit | Later |
| Back-in-stock alerts | None | "Email me when it's back" on sold-out sizes | Later |
| Country and language selectors | Shown in the header | Dropped. Pakistan, PKR and English only | Not planned |
| Gift cards | Template exists | Not planned | Not planned |
| SEO | Shopify URLs, sitemap, structured data | Keep `/products/`, `/collections/`, `/pages/`, `/blogs/` URLs. Sitemap, robots.txt, Product, Breadcrumb and Organization structured data. 301 redirect anything that moves | v1 |
| 404 page | With product suggestions | Same | v1 |

## Checkout and order flow

One page, built for phones:

1. **Contact:** name, phone and email, all required. Having both means we can always reach the customer, and both improve ad matching later.
2. **Delivery:** city from a list of Pakistan cities, and the full address.
3. **Payment:** COD or bank transfer.
   - **Bank transfer** delivers free, as promised on Shopify today. It shows the account details and lets the customer upload a receipt screenshot, then or later from their order link.
   - **COD** adds a PKR 900 delivery fee, and the breakdown spells out the advance:

     | | |
     |---|---|
     | Subtotal | PKR 17,100 |
     | Delivery (cash on delivery) | PKR 900 |
     | **Total** | **PKR 18,000** |
     | Send now to confirm your order | PKR 2,000 |
     | Pay on delivery | PKR 16,000 |

     The account details for the advance and the receipt upload sit right under it.
4. **Discount code** field.
5. **Place order:** confirmation page and confirmation email.

**Order status:** Pending confirmation → Confirmed → Packed → Shipped → Delivered. Side exits: Cancelled, Refused at delivery (returned to origin). Size exchanges are their own linked order (see Exchanges).

**Payment status** is tracked separately: Unpaid, Advance received, Paid in full.

**Money is a ledger.** Every payment on an order is its own row: advance, bank transfer, COD collected by PostEx, PostEx remittance. Balance due is the order total minus the ledger. This is what Shopify could never show.

**COD advance.** Every COD order starts with a PKR 2,000 advance recorded against it, and PostEx collects the rest at the door. Confirming the order marks the advance as received. When a customer bargains the advance down, edit it on the order page and the cash to collect updates straight away:

| | Order total | Advance | PostEx collects |
|---|---|---|---|
| Default | PKR 18,000 | PKR 2,000 | PKR 16,000 |
| You edit the advance | PKR 18,000 | PKR 1,000 | PKR 17,000 |

The order total never changes, only the split between advance and cash on delivery. The PKR 2,000 default lives in Settings.

**Exchanges.** No refunds. Size exchanges are accepted within 7 days of delivery, unworn with tags intact. An exchange starts from the original order: pick the new size, the returned piece goes back into stock when it arrives, and the replacement ships as a linked order. The customer pays delivery both ways. The exchange delivery fee is a setting.

## Admin

Lives at `/admin`, with sign-in through Clerk. One account for now: yours. Staff accounts come later.

### Home

- Today at a glance: sales, orders, visitors, conversion rate, each compared with the same day last week.
- To-do counts: orders to confirm, orders to ship, bank transfers to verify, COD cash still with the courier, low-stock variants.
- Latest orders.

### Orders

- List with filters: status, payment method, payment status, city, date. Search by order number, name or phone.
- Order page: items, customer, address, notes, payment ledger, balance due, and a timeline of every change and who made it.
- Actions: confirm (with a one-tap WhatsApp message to the customer), edit the advance, mark packed, add the PostEx tracking number, mark delivered, cancel, record a payment, start a size exchange, edit items before shipping, print packing slip and invoice.
- **Manual orders:** enter sales from Instagram or WhatsApp DMs so every sale is in one place.
- **Abandoned checkouts:** everyone who entered a phone or email and didn't finish, with a one-tap WhatsApp follow-up.
- CSV export.

### Products

- Products with size and colour variants, SKU (`BELT-{STYLE}-{COLOR}` pattern), price, compare-at price, **cost price**, stock per variant, images, description, SEO title and description, draft or active.
- Collections, chosen by hand.
- Stock history: every change and why (sale, return, manual adjustment).
- Low-stock threshold per variant.

### Customers

- List: name, phone, email, city, order count, total spent, last order.
- Customer page: order history, notes, tags, and a flag for refused deliveries (COD risk).
- Segments: new, repeat, lapsed (no order in a set number of days), refused delivery.

### Discounts

- Codes: percentage off, fixed PKR off, free delivery. Minimum order, usage limits, start and end dates, one use per customer.
- Automatic discounts: later.

### Content

- Editable in admin: announcement bar, FAQ, policy pages, journal posts, featured products on home.
- The home page layout itself stays in code.

### Settings

- Store details, bank account shown at checkout, COD delivery fee (PKR 900), default COD advance (PKR 2,000), exchange delivery fee, PostEx fees per parcel, WhatsApp number (+92 323 1483650), Meta Pixel on or off, email sender.

## Analytics screens

### Overview

Pick a date range, compared with the previous period.

- Totals: sales (PKR), orders, average order value, visitors, sessions, conversion rate, returning customer rate.
- Charts: sales over time, visitors over time.
- Top products by revenue and by units.
- Sales and visitors by city.
- Traffic sources: Instagram, Facebook, TikTok, Google, WhatsApp, direct, and tagged campaigns (UTM).
- Devices: phone, tablet, desktop.

### Live view

Refreshes every few seconds:

- Visitors right now and the page each one is on.
- Active carts and checkouts in progress.
- Orders placed today as they arrive.
- Visitors by city.

### Funnel

Visited → viewed a product → added to cart → started checkout → placed order → confirmed → delivered.

Each step shows its count and the drop-off. The last two steps matter most for COD: an order isn't a sale until it's delivered and paid.

### Reports

- **Sales:** by day, week and month, by product and variant, by collection, by city, by payment method, by discount code.
- **Customers:** new against returning, repeat purchase rate, time between orders, lapsed customers (churn), and monthly cohorts (of people who first bought in a month, how many came back).
- **Behaviour:** top landing pages, exit pages, products viewed often but rarely bought, searches with no results.
- **Operations:** cancellation rate, refused-delivery rate by city, average days to deliver, COD cash pending with the courier.
- **Profit:** revenue minus product cost and PostEx fees, per order and per month. Replaces the Google Sheet. Each order's PostEx fee starts from the default in Settings (about PKR 1,100 for COD, PKR 310 for prepaid) and can be edited, since the real charge varies by parcel.
- Every report exports to CSV.

Raw events are stored as they happen and rolled up nightly into daily summary tables, so the screens stay fast as data grows.

## Ads tracking (built, switched off)

Meta Pixel and Meta's Conversions API are wired in but stay off until you run ads. While off, nothing loads and nothing is sent. Turning them on takes one switch in Settings, plus the pixel ID and access token.

| Store action | Meta event |
|---|---|
| Any page | PageView |
| Product page | ViewContent |
| Search | Search |
| Add to cart | AddToCart |
| Checkout opened | InitiateCheckout |
| Payment method chosen | AddPaymentInfo |
| Order placed | Purchase, with the value in PKR and the SKUs |
| WhatsApp button or contact form | Contact |
| Custom jacket enquiry or newsletter signup | Lead |

The browser pixel script is about 114 KB compressed. So when ads are on, events go to Meta from our server through the Conversions API, which ships no JavaScript, and the browser pixel loads only after the page has finished. Each server event carries the customer's email and phone, hashed, which helps Meta match buyers to ads.

## Emails

To customers:

| Email | Sent when |
|---|---|
| Order received | Order placed. Says what to send and where: the full amount for bank transfer, or the PKR 2,000 advance for COD, with the account details and a link to upload the receipt |
| Order confirmed | You confirm the order |
| Payment received | A payment is recorded (advance or full) |
| Shipped | Tracking number added. Links to our own tracking page and never names the courier |
| Delivered | Marked delivered |
| Cancelled | Order cancelled |
| Exchange started | You start a size exchange. Explains how to send the piece back and the delivery fee |
| Finish your order | One hour after an abandoned checkout that has an email, sent once |
| How is it fitting? | Seven days after delivery, asking for a review |

To you:

| Email | Sent when |
|---|---|
| New order | Every order |
| Receipt uploaded | A customer uploads a bank transfer receipt |
| Low stock | A variant drops below its threshold |
| Daily summary | Every morning: yesterday's sales, orders, visitors and open to-dos |

Many customers in Pakistan don't read email, so confirming by WhatsApp is a one-tap action in the admin (a prefilled `wa.me` link, no API cost). Automated WhatsApp or SMS comes later.

## What Shopify couldn't do

- A payment ledger per order covering advance, COD and bank transfer, with balance due.
- An editable advance per COD order, with the cash to collect recalculated on the spot.
- Size exchanges linked to the original order, with stock returned automatically.
- Profit per order and per month.
- A confirmation step before shipping to catch fake COD orders, and flags on customers who refused delivery.
- Refused-delivery rates by city.
- Bank transfer receipt uploads.
- Manual orders for Instagram and WhatsApp sales.

## Not in v1

- Card payments or any payment gateway.
- Refunds. Not offered.
- The jacket designer canvas.
- Customer accounts (the order tracking page covers v1).
- Gift cards, multiple currencies or languages.
- A reviews widget, until there are real reviews.
- Automated WhatsApp or SMS (one-tap manual messages first).
- A PostEx integration. Book parcels in the PostEx portal and enter the tracking number on the order. The customer's tracking page shows the statuses you set.
- Staff accounts.
- Two-factor sign-in for the admin. It needs Clerk Pro.

## Moving off Shopify

1. Export products, customers, orders (history feeds the reports) and journal posts. Move images to R2.
   Done on 25 October 2026, except journal posts: the catalog, stock, cost prices, 58 customers and orders #1004 to #1021 (with their payments) are in D1, and the photos are in the `klaev-media` R2 bucket. The exports were deleted after the import.
2. Keep every URL, and 301 redirect anything that changes.
3. Run both sites side by side, then point the domain at Cloudflare and cancel Shopify.
4. At cutover, give the `klaev-media` bucket a custom domain (media.klaev.com) and change `MEDIA_URL` in `lib/media.ts`, plus one `UPDATE` of `product_images.src`. Its r2.dev address is rate limited and meant for testing.

## Open questions

None right now.

To ask when building checkout: the bank account details shown for bank transfers and the COD advance.
