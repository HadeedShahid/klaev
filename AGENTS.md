<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Klaev

Storefront and admin for Klaev, a premium leather jacket and belt brand selling across Pakistan. It replaces the Shopify store. Read `PRODUCT.md` for who it serves and the brand rules, and `docs/scope.md` for every feature and decision.

## Working rules

- **Test first.** Write the failing test, then the code. Every user workflow has a Playwright end-to-end test, and the whole suite runs on every change before the work counts as done: `pnpm test:e2e`. Pure logic (money, cart maths, formatting) gets Vitest unit tests: `pnpm test`. Async Server Components are covered by e2e, not Vitest.
- **Mobile first.** Nearly all traffic is phones. Tests run on an iPhone (WebKit) and a Pixel (Chromium) profile. Design and check at 390px first; desktop is the enhancement.
- **Next.js 16 as documented, not as remembered.** Read the guide in `node_modules/next/dist/docs/` before using an API. Server Components by default; `"use client"` only where interaction needs it, as small and as deep in the tree as possible.
- **Cache Components and Partial Prefetching are OFF for now (since 25 October 2026).** On Cloudflare Workers, OpenNext 1.20.13 hangs or truncates Cache Components pages: [#1464](https://github.com/opennextjs/opennextjs-cloudflare/issues/1464) (cross-request `"use cache"` dedupe hangs), [#1349](https://github.com/opennextjs/opennextjs-cloudflare/issues/1349) (pages from build-seeded cache never finish), [#1328](https://github.com/opennextjs/opennextjs-cloudflare/issues/1328) (cross-request I/O). Until those are fixed the app uses the previous caching model:
  - Pages are static: `generateStaticParams` with `dynamicParams = false`, so unknown handles are real 404s. Nothing in a shared layout reads cookies or headers; the header's cart count is a client component reading the `klaev_cart_count` cookie.
  - Only the cart page renders per request.
  - Code still follows the Cache Components shape (URL reads inside `<Suspense>`) so switching back is small.
- **Switching Cache Components back on**, once those issues are fixed in a release: set `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`; remove `dynamicParams` from the product and collection pages; put `"use cache"` with `cacheLife("days")` and `cacheTag` back on the `lib/catalog.ts` functions; un-skip the `instant()` tests in `e2e/navigation.spec.ts` and `e2e/home.spec.ts`; then prove it with `pnpm cf:preview` and `BASE_URL=http://localhost:8787 pnpm test:e2e` before deploying.
- **Cloudflare:** `pnpm cf:preview` builds with OpenNext and runs the Worker locally on port 8787; `pnpm cf:deploy` deploys it. (Not `pnpm deploy`, which is a pnpm built-in.) The incremental cache is the read-only static assets cache (`open-next.config.ts`).
- **With Cache Components on, Next.js keeps up to 3 visited pages mounted but hidden.** Write code and tests that survive it either way. In tests, prefer `getByRole`, and add `.filter({ visible: true })` to `getByTestId` and `getByText`, or they match the hidden page too. IDs must be unique per page (`useId`, or include the handle). Clear one-off messages like "Added to cart" in a `useLayoutEffect` cleanup.
- **Product photos load through `lib/image-loader.ts`.** The Shopify CDN resizes and serves WebP. The built-in optimizer timed out on the 5 MB PNGs. When photos move to R2, change the loader, not the components.
- **Cart cookies are `Secure` except on localhost** (`lib/cart.ts`), because WebKit drops Secure cookies over `http://localhost`, where the dev server and the local Cloudflare preview run.
- **Subagents only for real work.** Use them for complex or genuinely parallel tasks. Never for a text change, a small edit or a quick lookup.
- **Package manager:** pnpm.

## Design

- UI work goes through the Impeccable skill. Each surface's direction contract lives in `.impeccable/surfaces/`. Read it before touching that surface.
- Direction: the category standard, executed at Apple Store craft. Don't reuse the Shopify theme's look (`../klaev-shopify`).
- Components: shadcn/ui on Base UI (`base-nova`), Lucide icons, Tailwind CSS v4. Add components with `pnpm dlx shadcn@latest add <name>` and edit them in `components/ui`.
- Font: Geist Sans, through `next/font`.

## Content and data

- Money is integer PKR. Never floats.
- Copy follows the brand rules in `PRODUCT.md`: no em or en dashes, PKR only, Pakistan only, no hype or luxury clichés.
- The courier (PostEx) is never named on the storefront or in customer emails.
- Until Cloudflare D1 is wired in, the catalog comes from `data/catalog.json`, a snapshot of the live Shopify products. Read it only through `lib/catalog.ts` so the swap to D1 touches one file.
