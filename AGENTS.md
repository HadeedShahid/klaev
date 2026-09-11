<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Klaev

Storefront for **Klaev** (klaev.com), a premium leather goods brand from Pakistan: leather belts, lambskin leather jackets, and a goatskin suede jacket. Klaev is a subsidiary of Metro Textile Sourcing, a family leather-sourcing business.

The site used to run on Shopify. The store closed in September 2026 because it cost more than it earned. This repo rebuilds it as a Next.js e-commerce site that runs on free tiers, keeps the brand online, and can grow into a full store again.

## Constraints

- **Cost:** everything stays on free tiers until sales justify paying. Ask before adding any paid service or anything that needs a card on file.
- **Market:** Pakistan only. Prices are in PKR. Shipping, delivery and audience references are all Pakistan-specific.
- **Hosting:** Vercel Hobby for now. Vercel's fair-use terms limit Hobby to non-commercial use, and taking payments on the site counts as commercial. Decide before checkout goes live: either move to Vercel Pro or to a host whose free tier allows commercial use.
- **Payments:** not decided yet. Stripe isn't available to businesses in Pakistan. Cash on delivery is the likely first method, with a local gateway later.
- **Catalog:** small, around 15 products. The Shopify SKU pattern was `BELT-{STYLE}-{COLOR}`, for example `BELT-STC-BK`.

## Stack

| Layer | Choice | Status |
|---|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript | installed |
| Styling | Tailwind CSS v4 | installed |
| Components | shadcn/ui, `base-nova` style: Base UI primitives, Lucide icons, Geist | installed |
| Class merging | `cn` package (shadcn's replacement for clsx + tailwind-merge), re-exported from `@/lib/utils` | installed |
| Database | Supabase Postgres | planned |
| ORM | Drizzle ORM 0.45 + drizzle-kit | planned |
| Auth, file storage | Supabase Auth via `@supabase/ssr`, Supabase Storage | planned |
| Mutations | Server Actions via next-safe-action | planned |
| Validation, forms | Zod 4, React Hook Form | planned |
| Env vars | `@t3-oss/env-nextjs` | planned |

Package manager: npm.

## Architecture rules

- Use Server Components by default. Add `"use client"` only where the component needs interactivity.
- Mutations go through Server Actions built with next-safe-action, so input validation and the auth check happen in one place for every action. Use Route Handlers only for webhooks and other external callers. Don't add tRPC.
- **Data access:** use Drizzle, and only in server code. supabase-js is for auth and storage, never for querying app tables.
- Drizzle connects as the table owner, which bypasses Row Level Security (RLS), so authorization lives in server code. Still enable RLS on every table, with no policies: Supabase exposes `public` tables through its REST API, and the publishable key ends up in the browser.
- Connect Drizzle through Supabase's transaction pooler (port 6543) with `prepare: false`, because the pooler doesn't support prepared statements.
- Session refresh and route gating go in `proxy.ts`. Next.js 16 renamed `middleware.ts` to `proxy.ts`.
- Store money as integer PKR. Never use floats for prices.

## Styling

- The theme tokens in `app/globals.css` come from shadcn. Add components with `npx shadcn@latest add <name>` instead of writing them by hand.
- For shadcn work, follow the project's `shadcn` skill (`.agents/skills/shadcn`, published by shadcn). Where it disagrees with the Vercel plugin's `vercel-plugin:shadcn`, ignore the plugin. The plugin assumes Radix and tells you to hardcode font names, and both are wrong for this repo.
- Fonts load through `next/font` in `app/layout.tsx`. Geist is exposed as `--font-geist-sans`, and `globals.css` maps that to `--font-sans`. Keep the two names in sync. If `--font-sans` ever points at itself, Geist silently stops loading.

## SEO carried over from Shopify

The Shopify store had SEO work that should carry over to the new site. The full record is in the [Klaev SEO Dossier](https://claude.ai/code/artifact/cd5b18ae-ccc0-4ead-8a92-bb2f3b5eda68).

- Keep Shopify's URL shapes (`/products/[handle]`, `/collections/[handle]`, `/pages/[handle]`), or 301-redirect old paths to their new ones, so pages Google already indexed keep working.
- Target locale is `en-PK`: `<html lang="en-PK">`, `og:locale` `en_PK`, hreflang `en-pk` plus `x-default`.
- Structured data that shipped before: BreadcrumbList, WebSite with SearchAction, Organization with `logo` and `sameAs` (Instagram, Facebook, TikTok). Add Product schema on product pages.
- Don't show review widgets or AggregateRating until there are real reviews.
- Belt searches are the easiest to rank for. On jacket searches, Klaev competes with established sellers that have thousands of reviews.

## Copy and brand

All user-facing copy follows the Klaev brand voice. The full guide is the `klaev-brand` skill, so load it before writing copy. These rules apply to everything that ships:

- No em dashes or en dashes. Use periods, commas or colons.
- Currency is always PKR, and the market is always Pakistan.
- Write "made in Pakistan", not "made in Lahore".
- No references to footwear, and never "made in Italy" or "made in Portugal".
- Keep the voice minimal and confident, with short sentences. No luxury clichés, hype or urgency.
