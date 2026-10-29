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
| PostEx fees | Paid upfront when a parcel is booked: about PKR 310 for a prepaid (bank transfer) parcel, and about PKR 590 for a COD parcel (delivery plus cash handling). Rates vary with weight and city, so each order's charge starts from a default in Settings and can be changed. When PostEx pays an order's COD cash out, it deducts 4% of the COD amount as tax. Payouts come per order (settled 27 October 2026) |
| Refunds | Not offered, including for defects |
| Exchanges | Size exchanges within 7 days of delivery. The customer pays delivery both ways |
| WhatsApp | +92 323 1483650 |
| Ads | Meta Pixel and Conversions API built in, switched off until ads run |
| Admin login | A password for the one admin, set with `pnpm admin:password`. Clerk was dropped on 26 October 2026: with one admin it added a dependency and nothing else. Staff accounts later |
| Custom jackets | In v1 as a WhatsApp or contact-form enquiry. A jacket designer comes later |

## Stack

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 16 on Cloudflare Workers, deployed with the OpenNext adapter | One codebase for the storefront, admin and API |
| Plan | Workers Paid, $5 a month | The free plan allows 10 ms of CPU per request, which is too little for server rendering |
| Database | D1 (SQLite) with Drizzle ORM | Included in Workers Paid: 25 billion row reads and 50 million row writes a month |
| Images and uploads | R2. Product photos are stored ready-sized as WebP, one copy per width the site asks for, so nothing resizes on request | Product photos and bank transfer receipts |
| Admin login | A password and a signed session cookie, built in | One admin needs nothing more, and nothing extra loads or can break on OpenNext |
| Email | Resend, templates in React Email | Cloudflare's own sending is still in beta. All mail goes through one `sendEmail()` so switching later is a one-file change |
| Scheduled jobs | Cron Triggers | Abandoned checkout reminders, daily summary email, nightly analytics rollups |
| Analytics | Built in: a tiny tracker plus server-side events, stored in D1 | See below |
| Ads tracking | Meta Pixel and Conversions API, off by default | Ready for when ads run. See Ads tracking |
| Session replays (optional) | Microsoft Clarity, loaded late and only on chosen pages | Free. The one analytics feature not worth building |

### Why D1

- Around 15 products and modest order volume. SQLite handles this with room to spare.
- It lives inside Cloudflare: no second bill, no connection pooling, no cold connections.
- Limits to know: 10 GB per database and one write at a time. Neither matters at Klaev's size.

### Admin sign-in

- One password, stored only as a PBKDF2 hash in the `ADMIN_PASSWORD_HASH` Worker secret. `pnpm admin:password` asks for it twice and sets the secret, along with a new `ADMIN_SESSION_SECRET`, which signs everyone out.
- Signing in sets a signed, HTTP-only cookie for `/admin` that lasts 30 days. Every admin page, action and the receipts route checks it.
- Five tries a minute per address, through Cloudflare's rate limiting binding.
- Staff accounts, when they come, need a users table and per-person sessions.

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
| Order tracking | Shopify customer accounts | Track-your-order page (`/track`) using order number and phone. Shows our own status steps (placed, confirmed, packed, shipped, delivered) with where the parcel is (booked, in transit, out for delivery, a failed attempt, coming back), and never names the courier | v1, built |
| Customer accounts | Account menu in the header | Sign in with an emailed code to see past orders. No passwords | Later |
| Journal | Blog with articles, three shown on home | Same URLs, existing posts carried over, new posts written in admin | v1 |
| Pages | About, contact form, policies | Built 27 October 2026 at Shopify's addresses: About, Contact, the jackets size chart (from the products' size guides), and Delivery, Exchanges and refunds, Privacy and Terms, rewritten from Shopify's templates to say what this store actually does. Editable under Content, Pages. Contact messages land in the admin's Messages inbox (email once Resend is set up) | v1, built |
| Exchange policy | Marquee says "30-day returns". FAQ offers exchanges within 7 days and full refunds for defective pieces. Google structured data says 30-day returns | Rewritten everywhere to match the real policy: size exchanges within 7 days of delivery, unworn with tags intact, customer pays delivery both ways, no refunds | v1 |
| Newsletter signup | Only on the password page | Footer signup, stored in D1 | v1 |
| Custom jackets | "Design yours" banner, button not linked yet | "Design yours" opens WhatsApp (+92 323 1483650) with a prefilled message, or the contact form with "Custom jacket" as the subject | v1 |
| Jacket designer | None | Customers design their own jacket on a canvas: hide, lining, hardware, fit | Later |
| Back-in-stock alerts | None | "Email me when it's back" on sold-out sizes | Later |
| Country and language selectors | Shown in the header | Dropped. Pakistan, PKR and English only | Not planned |
| Gift cards | Template exists | Not planned | Not planned |
| SEO | Shopify URLs, sitemap, structured data | Built 28 October 2026. Every address in Shopify's sitemap keeps working. `/sitemap.xml` lists the live store with product photos (`lib/seo.ts`); `robots.txt` opens klaev.com to crawlers and closes every other host, so the workers.dev preview stays out of search. Canonical and Open Graph addresses are always klaev.com. Product (price in PKR, stock, the exchange policy), Breadcrumb, OnlineStore and WebSite data. Search titles for the home and collection pages in `data/search-listings.ts`, rewritten from Shopify's without its "free delivery nationwide". Shopify's other addresses redirect (`lib/shopify-redirects.ts`): products inside a collection, tag filters, its split sitemaps, old order-status and checkout links, `/search` and `/account`. Hidden products and the empty belts collection redirect to what's on sale until they're live again. Link previews and icons (29 October 2026): every shared page shows a picture, the store's own (the three cropped jackets worn, under the wordmark) or the page's first photo at its 1200 wide copy, and the Klaev K replaces Next's icon in browser tabs, on home screens and as the logo in search (`scripts/brand-images.ts`) | v1, built |
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

Lives at `/admin`, behind the admin password. One account for now: yours. Staff accounts come later.

A toned-down Shopify admin, laid out the way Shopify's is so it feels familiar: a sidebar with Home, Orders (Orders, Manual orders, Abandoned checkouts), Products (Products, Collections, Inventory), Customers, Discounts, Content (Journal, FAQ), Analytics, and Settings. Researched against Shopify's admin on 27 October 2026; what was left out, and why, is under "Left out on purpose" below.

### Home (built)

- Sales, orders, cash with the courier and profit for 7, 30 or 90 days, against the period before. A sales chart.
- Needs action: orders to confirm (with receipts in), to ship, out for over 5 days, courier payouts to record. Recent orders. Sizes on their last piece.

### Orders

- **List (built):** tabs for All, To confirm, To ship, Shipped, Payout due, Delivered, Cancelled, with counts; filters beside them for payment method, payment status and the date placed (presets or custom dates), kept by the tabs, paging and export; statuses, payments and the dashboard's changes in colour (amber waits, green ready or paid or up, blue on its way, violet delivered, red lost or down); search by number, name or phone; paging; CSV export of the tab and search on screen; packing slips for everything waiting to ship, one per page. Bulk "mark packed" is left for later.
- **Order page (built):** a stepper (placed, advance in or paid, packed, shipped, delivered, paid out), one Update status menu, and Overview, Payments and History tabs. Confirm records the advance or transfer; shipping takes the tracking number and the courier's upfront charge; the courier's payout records what it kept as tax. The advance, contact details, tracking number, courier charge and payments can all be changed or corrected afterwards, and receipts uploaded from the admin.
- **On the order page (built):**
  - **Edit items** before it ships: change a size or quantity, add or remove an item. Stock moves by the difference; lines keep their price, added ones take today's, and a percentage code is worked out again.
  - **Size exchange** after delivery: a linked exchange order ships the new size at no charge for the jacket, for the delivery charge the customer pays (collected at the door). The old jacket goes back into stock when it arrives ("It's back" on the exchange order). No refunds.
  - **Courier status** while shipped: booked (set on shipping), in transit, out for delivery, delivery attempted, coming back, set by hand from the Update status menu. A parcel that comes back is then marked refused. The customer's order page and the tracking page (`/track`, order number and phone, rate limited) say where it is in their words.
  - **Packing slip and invoice** to print or save as PDF.
  - The customer's other orders, and a warning if they refused a delivery before.
- **Manual orders (built):** sales from WhatsApp, Instagram or in person, entered by hand at the agreed price with any discount and delivery fee. Cash on delivery with its advance, bank transfer, or in person. Money already in confirms it; paid in person is delivered on the spot. Stock is taken, and the customer is matched by phone.
- **Abandoned checkouts (built):** saved once the phone number is typed at checkout, and listed when no order followed within 10 minutes, with the cart and a one-tap WhatsApp follow-up that's noted as sent. An order from the same phone later takes it off the list. Kept for 30 days.

### Products

- **Products:** list with Active, Draft and Archived tabs. The product page holds the title, description sections, photos (uploaded, resized in the browser into the stored WebP widths), price and compare-at (sale) price, cost per item with profit and margin, sizes with SKU and stock, colour, collection, tags, search listing (title, description, a preview), and status. New products can be created and go live without a deploy.
- **Collections:** chosen by hand, with a title, description and order.
- **Inventory:** every size's stock. "Restock" asks how many came in and adds them; a count can be corrected by hand. Each product keeps a history of every change and why: restock, correction, sale, cancelled or refused order, exchange.

### Customers (built)

- List with name, phone, city, segment, orders, total spent and last order. Search by name, phone or email. Tabs for the segments: first-time, repeat, lapsed (no order in 90 days), refused a delivery.
- Customer page: orders, spend, average order and since when; contact details and notes and tags, each editable; WhatsApp. A refused delivery shows as a flag here, and on every later order's page ("Refused a delivery before"), so a risky COD order gets a call first.
- A returning customer is matched by email, or else by phone, however it was typed, so a new email doesn't make a new customer. Orders keep the details they were placed with. Migration 0007 linked past orders that had no customer (Shopify guest checkouts) the same way, making a customer from the latest order where none existed.

### Discounts (built)

- **Codes** typed at checkout: a percentage or fixed amount off the items, or free delivery. Optional minimum order, start and end dates (whole days, Pakistan time), total uses, and one use per customer (by phone). Checkout has a discount code field with Apply; placing the order checks the code again. Cancelled orders give their use back. A code that orders used keeps its name and can only be turned off, not removed. The list shows each code's status (Active, Scheduled, Ended, Used up, Off), uses, and how much it gave off.
- **Sale prices:** a compare-at price on a product shows the old price crossed out across the store.
- Automatic discounts and buy-X-get-Y: later.

### Content (built)

- **Journal:** articles with a title, summary, body, cover photo, publish date (a later date waits until then) and search listing, at `/blogs/blog/<address>`, the Shopify journal's address. The body is plain text: a blank line starts a paragraph, `## ` a heading, `- ` a list. The store has the journal page, each article (with BlogPosting structured data), and a footer link. Not yet: the Shopify articles themselves (the export was deleted after the import, so they need exporting again or copying across), a journal strip on the home page, and a sitemap.
- **FAQ:** the home page questions, edited, reordered, added or removed in the admin. `{advance}`, `{cod_fee}` and `{exchange_days}` show the current terms, so answers never disagree with checkout.

### Analytics (built)

- Overview, Live view, Funnel and Reports, below. Visits are counted from the day the store runs on its own address; until klaev.com points here only order figures fill in.

### Settings

- **Courier (built):** upfront charge per prepaid and per COD parcel, and the tax kept from COD cash.
- **Checkout (built):** the COD delivery fee and the default advance. Product pages, the cart, checkout, the FAQ and new orders use them.
- **Bank account (built):** shown to customers on their order page.
- **Password (built):** changed from Settings, which signs out every other device. `pnpm admin:password` still sets one from the terminal and clears the one set in Settings, so it's the way back in if the password is lost.
- **Store details:** shown read-only. The WhatsApp number, email and Instagram are on every page and in client code, so they change in `lib/store.ts` with a deploy.

### Left out on purpose

- Purchase orders and transfers: stock arrives as a restock, and there is one location.
- Gift cards, refunds, markets and multiple currencies, sales channels, B2B, POS.
- Order tags and staff comments on the timeline (the note covers it), archiving, fraud analysis.
- Barcodes, weights, vendors and smart (rule-based) collections.

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
- **Profit:** revenue minus product cost, the PostEx charge and the 4% COD tax, per order and per month. Replaces the Google Sheet. Each order's PostEx charge starts from the default in Settings (about PKR 590 for COD, PKR 310 for prepaid) and can be edited, since the real charge varies by parcel.
- Every report exports to CSV.

Built 27 October 2026. A tracker of a few lines (`components/site/tracker.tsx`, no library) sends each page view to `/api/e`; carts and orders are recorded by the server actions that make them. A visitor is a random id in a first-party cookie kept a year, a session one kept 30 minutes after the last page. The session's first page records where it came from (a utm_source tag, an ad click id, the Instagram or Facebook in-app browser, or the referrer) and any utm_campaign; Cloudflare supplies the city and country. Crawlers and link previews aren't counted. Not built yet: searches with no results (there's no search yet), and the nightly rollups: the screens read raw events, which is fast at this size; add daily summary tables when visits reach the tens of thousands a month.

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
- Two-factor sign-in for the admin.

## Moving off Shopify

1. Export products, customers, orders (history feeds the reports) and journal posts. Move images to R2.
   Done on 25 October 2026, except journal posts: the catalog, stock, cost prices, 58 customers and orders #1004 to #1021 (with their payments) are in D1, and the photos are in the `klaev-media` R2 bucket. The exports were deleted after the import.
2. Keep every URL, and 301 redirect anything that changes.
3. Run both sites side by side, then point the domain at Cloudflare and cancel Shopify.
4. At cutover, give the `klaev-media` bucket a custom domain (media.klaev.com) and change `MEDIA_URL` in `lib/media.ts`, plus one `UPDATE` of `product_images.src`. Its r2.dev address is rate limited and meant for testing.

## Open questions

None right now.

Settled while building checkout (25 October 2026):
- The bank account shown for transfers and the COD advance is HBL, in the database's settings, not in the code.
- Checkout is one scrolling page with the place-order bar fixed at the bottom, saying what to send now.
- The receipt screenshot is uploaded after the order is placed, from the order page, with WhatsApp as the other way. Receipts are kept in a private R2 bucket.
- The discount code field came once the admin could create codes (27 October 2026).
- An order takes its stock when it is placed. When that sells out a size, every cached page refreshes.
