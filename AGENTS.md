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
  - Pages are static and never expire: the product and collection pages list the live handles in `generateStaticParams` with `dynamicParams = false`, so any other handle (and every draft) is a real 404. A page Next didn't list at build counts as stale after 1 second, so don't return `[]` there. Until the admin can revalidate, a new product needs a deploy before its page exists.
  - Deploys don't upload the built pages (below). Each page renders on the Worker from D1 on its first visit after a deploy, and OpenNext keeps it in the `klaev-cache` R2 bucket. So the live site always shows the real database, whatever the build read.
  - Nothing in a shared layout reads cookies or headers; the header's cart count is a client component reading the `klaev_cart_count` cookie. Only the cart page renders per request.
  - Pages check their handle before anything streams, outside any `<Suspense>`, so unknown and draft handles answer with a real 404 status; inside a boundary the 200 has already gone out.
- **Switching Cache Components back on**, once those issues are fixed in a release: set `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`; give the product and collection pages' `generateStaticParams` at least one param (an empty list is a build error with Cache Components) and move their URL reads back inside `<Suspense>`; put `"use cache"` with `cacheLife("days")` and `cacheTag` back on the `lib/catalog.ts` functions; un-skip the `instant()` tests in `e2e/navigation.spec.ts` and `e2e/home.spec.ts`; then prove it with `pnpm cf:preview` and `BASE_URL=http://localhost:8787 pnpm test:e2e` before deploying.
- **Cloudflare:** `pnpm cf:preview` builds with OpenNext and runs the Worker locally on port 8787 against the local database; `pnpm cf:deploy` deploys it. (Not `pnpm deploy`, which is a pnpm built-in.) The incremental cache is R2 (`open-next.config.ts`); a lifecycle rule on `klaev-cache` expires cached pages after 30 days, so old builds' copies don't pile up and the next visit simply renders again.
- **Builds read the local database, and deploys don't upload what they built.** `next build` renders pages from the local D1 (`pnpm db:setup` first), with one build worker (`experimental.cpus` in `next.config.ts`) because Wrangler's local database fails at random when several processes open it. `pnpm cf:deploy` then runs `wrangler deploy` itself (with `OPEN_NEXT_DEPLOY=true`, as OpenNext does) instead of `opennextjs-cloudflare deploy`, which first uploads the built pages to R2 through a remote Wrangler connection that kept timing out. Skipping that upload is also what keeps local data off the live site. Don't point builds at the remote database: the same remote connection took minutes and timed out.
- **With Cache Components on, Next.js keeps up to 3 visited pages mounted but hidden.** Write code and tests that survive it either way. In tests, prefer `getByRole`, and add `.filter({ visible: true })` to `getByTestId` and `getByText`, or they match the hidden page too. IDs must be unique per page (`useId`, or include the handle). Clear one-off messages like "Added to cart" in a `useLayoutEffect` cleanup.
- **Product photos load through `lib/image-loader.ts`.** They live in the `klaev-media` R2 bucket as WebP, stored at full size and at each width in `lib/media.ts`, which is also the only set of widths `next.config.ts` lets next/image ask for. The loader maps a width to its stored copy, so nothing resizes on request (the built-in optimizer timed out on 5 MB originals). A new width means new copies of every photo.
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
- **The database is Cloudflare D1** (binding `DB`), through Drizzle. The schema is `lib/db/schema.ts`; change it, then `pnpm db:generate` writes a migration into `drizzle/`, and `pnpm db:migrate` (local) or `pnpm db:migrate:remote` applies it. Get the database with `getDb()` from `lib/db`. The storefront reads the catalog only through `lib/catalog.ts`.
- **Local database:** `pnpm db:setup` applies the migrations and loads `data/catalog.json`, the catalog seed for development and CI. Run it once after cloning, and again to reset the catalog. The real database is the truth for the live catalog; never run the seed against it again. In development, Next runs `generateStaticParams` in a separate process with its own copy of the local database, so catalog reads get a few tries there (`lib/db/retry.ts`). Writes must not be retried that way.
- **Stock** is units free to sell, per variant. `costPrice` is what Klaev paid; it never reaches the storefront or the public repository.
- **Customer data never enters git.** The repository is public. Shopify exports and anything made from them go in `data/private/`, which git ignores. The Shopify import (`scripts/import-shopify.ts`, `pnpm db:import` locally) has run once on the real database; its tests use made-up rows.
- Unit tests that need a database use `createTestDb()` from `lib/db/test-db.ts`: an in-memory D1 from Wrangler with every migration applied.
