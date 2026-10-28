// The store's own pages and policies as they start out, until edited in the admin (lib/pages.ts).
// Shopify had a contact form, an About link that led nowhere, a size chart with no chart, a
// Shipping link that led nowhere, and its stock policy templates (one promising 30-day returns).
// These say what the store actually does. The body format is the journal's (lib/journal-body.ts):
// a blank line between paragraphs, "## " for a heading, "- " for a list item, [words](/link) for a
// link. {advance}, {cod_fee}, {exchange_days}, {delivery_days}, {whatsapp} and {email} show the
// current terms and contact details.
export type PageKind = "page" | "policy";
export type PageDefault = { handle: string; kind: PageKind; title: string; description: string; body: string };

const ADDRESS = "Office 2, First Floor, Ahad Plaza, 14L Gulberg 3, Lahore 54660, Pakistan";
// When these policies were written; an edit in the admin shows its own date instead.
export const POLICIES_WRITTEN = new Date("2026-10-27T12:00:00+05:00");

export const PAGE_DEFAULTS: PageDefault[] = [
  {
    handle: "about",
    kind: "page",
    title: "About Klaev",
    description: "Leather jackets and belts cut from real leather, made in Pakistan and sold plainly.",
    body: `Klaev makes jackets and belts from real leather, in Pakistan, for people in Pakistan.

Real leather is the point. Much of what is sold here as "genuine leather" is bonded leather: scraps glued and pressed into a sheet. Ours is cut from whole hides. Full-grain sheepskin and lambskin for the jackets, goatskin suede, and single-piece cow leather for the belts.

## Where it comes from
Pakistan is one of the world's largest leather producers. Klaev is part of Metro Textile Sourcing, a family leather-sourcing business, and buys directly from Pakistani tanneries that also supply international luxury brands.

A small team of craftsmen makes each jacket, in small batches, with every seam finished by hand.

## How we sell
Prices are in PKR, and what you pay is set out before you order. Pay cash on delivery with a {advance} advance, or by bank transfer with free delivery. We confirm every order on WhatsApp before it ships, and if a size doesn't fit, you can exchange it within {exchange_days} days of delivery.

Questions? [WhatsApp us](https://wa.me/923231483650) or use the [contact form](/pages/contact).`,
  },
  {
    handle: "shipping-policy",
    kind: "policy",
    title: "Delivery",
    description: "Delivery across Pakistan: what it costs, how long it takes, and how to track it.",
    body: `We deliver anywhere in Pakistan. Most orders arrive in {delivery_days} days.

## What it costs
- Bank transfer: delivery is free.
- Cash on delivery: {cod_fee} delivery. Send a {advance} advance to confirm the order, then pay the rest to the rider in cash.

## Before it ships
We confirm every order on WhatsApp once the advance or the transfer is in. An order ships after it's confirmed.

## Tracking
When your order ships, we send you its tracking number. You can also follow it on the [tracking page](/track) with your order number and mobile number.

## If it can't be delivered
If the rider can't deliver it, we message you on WhatsApp to arrange another try. A parcel that can't be delivered comes back to us.`,
  },
  {
    handle: "refund-policy",
    kind: "policy",
    title: "Exchanges and refunds",
    description: "Size exchanges within {exchange_days} days of delivery. No refunds.",
    body: `Size exchanges within {exchange_days} days of delivery. No refunds.

## Exchanging a size
- Message us on [WhatsApp](https://wa.me/923231483650) within {exchange_days} days of delivery, with your order number and the size you want.
- The jacket must be unworn, with its tags on.
- You cover delivery both ways: sending it back to us, and the new size to you.

## Refunds
We don't offer refunds. If a size doesn't fit, exchange it.

## If something is wrong
If your order arrives damaged, or isn't what you ordered, message us on WhatsApp the day it arrives, with your order number and a photo.`,
  },
  {
    handle: "privacy-policy",
    kind: "policy",
    title: "Privacy policy",
    description: "What Klaev collects when you visit or order, why, and who sees it.",
    body: `This policy explains what Klaev collects when you visit klaev.com or order from us, why we collect it, and who sees it.

## What we collect
- When you order: your name, mobile number, email, city and delivery address, what you ordered, how you pay, and any payment screenshot you upload.
- When you start checkout: what you have typed, once your mobile number is in, and what is in your cart, so we can follow up if the order isn't placed.
- When you contact us: your name, contact details and message.
- When you browse: the pages you visit, the site or app that sent you, your type of device, and the city and country your connection comes from. A random number in a cookie tells one visit from the next. It holds nothing about you.

We never see or store card details. We don't take card payments.

## Why
To deliver your order, confirm it and keep you updated. To follow up on a checkout you didn't finish. To answer your messages. And to see which pages and products people use, so we can improve the store.

## Who sees it
- Our courier gets your name, mobile number, delivery address and the cash to collect.
- Cloudflare hosts the store and keeps its data.
- WhatsApp carries the messages we send you.

We don't sell your information, and we don't share it for anyone else's advertising.

## How long we keep it
- Orders, for as long as we need them for our accounts.
- Unfinished checkouts, for 30 days.
- Pages viewed, for 12 months.
- Messages, for 12 months after we have answered them.

## Your choices
You can ask to see, correct or delete what we hold about you, on WhatsApp ({whatsapp}) or by email ({email}). You can also block cookies in your browser; the store still works.

## Contact
Klaev, ${ADDRESS}. WhatsApp {whatsapp}. Email {email}.

If this policy changes, this page will say so, with a new date.`,
  },
  {
    handle: "terms-of-service",
    kind: "policy",
    title: "Terms of service",
    description: "The terms for buying from Klaev: orders, payment, delivery and exchanges.",
    body: `These terms cover buying from Klaev at klaev.com. Placing an order means you accept them, along with our [delivery](/policies/shipping-policy), [exchanges and refunds](/policies/refund-policy) and [privacy](/policies/privacy-policy) policies.

## Who we are
Klaev, ${ADDRESS}. WhatsApp {whatsapp}. Email {email}.

## Orders
Placing an order is an offer to buy. It's accepted once we confirm it on WhatsApp, after the advance or the bank transfer is in. We may decline or cancel an order, for example when an item has sold out or the details can't be confirmed, and we tell you when we do. If we cancel an order you have paid for, we return what you paid.

## Prices and payment
Prices are in PKR. Cash on delivery adds {cod_fee} delivery and needs a {advance} advance to confirm the order; the rest is paid to the rider in cash. Bank transfer is paid in full before the order ships, and delivery is free. A discount code applies only to the order it was entered on.

## Delivery
Most orders arrive in {delivery_days} days. Delivery times are estimates, not promises. See the [delivery policy](/policies/shipping-policy).

## Exchanges and refunds
Size exchanges within {exchange_days} days of delivery, unworn with tags on. No refunds. See [exchanges and refunds](/policies/refund-policy).

## The products
Leather is natural. Its grain, marks and shade vary from piece to piece, and from the photos. Sizes are given by chest measurement; check the [size chart](/pages/jackets-size-chart) before you order.

## Changes
We may update these terms. The version on this page when you order is the one that applies.

## Law
These terms are governed by the laws of Pakistan. Nothing in them takes away rights you have under that law.`,
  },
];
