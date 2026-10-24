# Klaev

The store for [Klaev](https://klaev.com): leather jackets and belts in real leather, made in Pakistan and sold across Pakistan. It replaces the Shopify store with a Next.js 16 app that will run on Cloudflare.

- `PRODUCT.md`: who the store serves, the brand rules, the catalog.
- `docs/scope.md`: every feature and business decision (payments, delivery, admin, analytics).
- `DESIGN.md`: the visual system.
- `AGENTS.md`: how to work on this codebase (test first, mobile first, Next.js 16 rules).

## Run it

```bash
pnpm install
pnpm dev
```

The site runs at http://localhost:3000. The catalog is a snapshot of the Shopify products in `data/catalog.json` until the Cloudflare D1 database is connected.

## Check it

```bash
pnpm typecheck   # route types, then TypeScript
pnpm lint
pnpm test        # unit tests (Vitest)
pnpm test:e2e    # end-to-end tests on an iPhone and an Android profile (Playwright)
```

The first end-to-end run needs the browsers: `pnpm exec playwright install chromium webkit`. GitHub Actions runs all of these on every push to `main` and on every pull request.
