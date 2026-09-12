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

## Performance comes first

Performance is the top priority for this site. Aim for top-tier scores, and never trade performance away for a feature.

- **Review every feature for performance before building it.** Before writing code, tell the user what the feature costs: JavaScript shipped to the browser, extra network requests, third-party scripts, layout shift, and whether it stops a page from being server-rendered. Then decide together whether it's worth building. If the cost can't be justified, find a lighter approach or leave the feature out.
- **Mobile first.** Design, build and test for phones first. Desktop is the enhancement.
- **Server-rendered first.** Pages render on the server. Client components are rare: use one only when an interaction can't work without it, and keep it small and as far down the component tree as possible.

## Dev tools

- **next-devtools MCP** (configured in `.mcp.json`): with `npm run dev` running, use `nextjs_index` to find the dev server and `nextjs_call` to read its errors, routes and logs. Check it when debugging, and after every change before calling the work done.

## Stack

| Layer | Choice | Status |
|---|---|---|
| Framework | Next.js 16 App Router, React 19, TypeScript | installed |
| Styling | Tailwind CSS v4 | installed |
| Components | shadcn/ui, `base-nova` style: Base UI primitives, Lucide icons, Geist | installed |
| Class merging | `cn` package (shadcn's replacement for clsx + tailwind-merge), re-exported from `@/lib/utils` | installed |
| Database | Supabase Postgres, project `klaev` (ref `qbncuwubzrhnbvhfmbrh`, `ap-south-1` Mumbai, free plan) | project created |
| ORM | Drizzle ORM 0.45 + drizzle-kit, `postgres` driver | installed |
| Auth | Supabase Auth via `@supabase/ssr`. Customers: email and password, plus Google. Admin: email and password only | installed |
| File storage | Supabase Storage | planned |
| Mutations | Server Actions, validating input with Zod on the server. next-safe-action only when the admin panel needs client-side forms | in use |
| Validation | Valibot for anything a form touches (shared by client and server). Zod 4 for server-only env validation | installed |
| Forms | Formisch + Valibot with shadcn's `Field` components, submitting to Server Actions | installed |
| Env vars | `constants/env.server.ts` (Zod, server-only) and `constants/env.client.ts` (public values, no Zod) | installed |

Package manager: npm.

## Architecture rules

- Use Server Components by default. Add `"use client"` only where the component needs interactivity.
- Mutations go through Server Actions. Every action validates its input with Zod and re-checks the session itself, close to the data. Use Route Handlers only for webhooks, emailed links and OAuth returns. Don't add tRPC.
- **Data access:** use Drizzle, and only in server code. supabase-js is for auth and storage, never for querying app tables.
- Drizzle connects as the table owner, which bypasses Row Level Security (RLS), so authorization lives in server code. Still enable RLS on every table, with no policies: Supabase exposes `public` tables through its REST API, and the publishable key ends up in the browser.
- Connect Drizzle through Supabase's transaction pooler (port 6543) with `prepare: false`, because the pooler doesn't support prepared statements.
- Session refresh and route gating go in `proxy.ts`. Next.js 16 renamed `middleware.ts` to `proxy.ts`.
- Store money as integer PKR. Never use floats for prices.

## Auth

The site is two apps in one repo. `app/(storefront)` and `app/(admin)` each have their own root layout, so they share no layout, CSS or JavaScript. URLs are unaffected by the group names.

- **Customers** sign in at `/login` with email and password or Google, sign up at `/signup`, and land on `/account`. Email confirmation is required before the first sign-in.
- **Admins** sign in at `/admin/login` with email and password only. No Google, and it never creates accounts.
- **A session is never admin access.** Customers hold the same kind of session. Admin rights come only from `ADMIN_EMAILS`, checked on every admin request in `lib/auth.ts`.
- **Checking the session:** `getSessionUser()` in `lib/auth.ts` calls `getClaims()`, which verifies the token locally against the project's public keys, so it costs no network call. React's `cache()` keeps it to one check per request. Use `requireCustomer()` and `requireAdmin()`, which redirect when there's no access.
- **`proxy.ts` runs only on `/account`, `/admin` and `/reset-password`.** Public pages never touch it. It refreshes sessions and redirects logged-out visitors, but it's an optimistic check only, never the sole protection. Never widen the matcher to public routes.
- **Use the shadcn components in `components/ui` everywhere,** including auth pages. Don't hand-write styled `<input>` or `<button>` markup: a component that changes later should change everywhere at once. Base UI marks several of them `"use client"`, and that small amount of JavaScript is an accepted trade for consistency. No wrapper or re-export layer around `components/ui`, since we own that source and can edit it directly.
- **Forms use Formisch with Valibot,** following shadcn's Formisch guide, with `Field`, `FieldLabel` and `FieldError` from `components/ui/field`. Each form's schema lives in `lib/schemas/` and is used by both the client form and the Server Action, which re-validates it. Measured at about 3 KB gzipped, against 17 to 42 KB for React Hook Form or TanStack Form with Zod.
- **Actions return `{ error }` for failures and redirect on success.** Field-level errors come from the form; page-level messages (an expired email link, for example) still arrive as `?error=` or `?notice=` and render through `components/auth/auth-message.tsx`.
- **Emailed links land on `/auth/confirm`** (signup confirmation and password reset), **Google returns to `/auth/callback`**. Both validate where they send people next with `safeRedirectPath()` in `lib/redirects.ts`. Never redirect to a target from a URL or an email without it.
- **Login messages never reveal whether an address has an account.**

**Supabase Auth is the decision, not Better Auth.** Better Auth was considered for one real reason: it keeps users in our own Postgres, so customers and orders join normally, and its config lives in code rather than a dashboard. It was set aside because the trigger for raising it, Supabase's email rate limit, is an email-delivery problem that Better Auth doesn't solve either: it sends no email at all and needs the same provider wired in. Revisit it on its actual merit, owning the user table, and preferably before checkout exists rather than after.

### Supabase dashboard settings this depends on

- **Custom SMTP is required before launch.** Supabase's built-in sender allows roughly two emails an hour and is not meant for production: signup confirmation and password reset both fail with `over_email_send_rate_limit` once that's used up. Point Supabase at Resend, whose free tier fits the cost constraint. The actions surface that specific error so people are told to wait rather than to try another address.

- Email templates for **Confirm signup** and **Reset password** must point at `/auth/confirm` with `token_hash`, not the default `{{ .ConfirmationURL }}`, which uses a browser-only flow that can't set a cookie on the server.
- Site URL and redirect URLs must list both the local address and klaev.com.
- Google sign-in needs the provider enabled with credentials from Google Cloud. Those live in Supabase, never in this repo.

## Database

- Import the client as `db` from `@/db`. It's marked `server-only`.
- The schema lives in `db/schema/`, one file per area (`products.ts`, `collections.ts`). Shared columns are in `columns.ts`, and every relation is in `relations.ts` so table files never import each other in a loop.
- `db/schema/index.ts` re-exports everything, because `drizzle()` and drizzle-kit need the whole schema as one object. App code imports tables from their own file, like `@/db/schema/products`. A new area file must be added to the index.
- Columns are camelCase in TypeScript and snake_case in Postgres. `casing: "snake_case"` is set in both `db/index.ts` and `drizzle.config.ts`, so keep them matching.
- Every table ends with `.enableRLS()`.
- To change the schema: edit the file in `db/schema/`, run `npm run db:generate -- --name <change>`, read the generated SQL in `db/migrations/`, then run `npm run db:migrate`. Commit the migration files. Don't use `drizzle-kit push`.
- Migrations connect through the session pooler (port 5432). `drizzle.config.ts` builds that URL from `DATABASE_URL`.

## Code organization

- **Constants** live in `constants/`, one file per topic. Import from the specific file, like `@/constants/site`. Don't add index files that re-export them.
- **Index (barrel) files** are only for cases where a library needs everything as one object, like `db/schema/index.ts`. Everywhere else, import from the specific file. Barrels slow builds, and when one re-exports server-only or heavy code, a single import pulls all of it in.
- **Env vars:** server code imports `env` from `@/constants/env.server`, which is server-only and validates every var with Zod when first imported. Client code imports from `@/constants/env.client`, which reads each `process.env.NEXT_PUBLIC_*` by its full literal name so Next.js can inline the value. Don't read `process.env` anywhere else, except in `drizzle.config.ts`, which runs outside Next.
- **Adding an env var:** put it in `.env` (git-ignored), `.env.example`, and the schema in `env.server.ts`. Public vars also go in `env.client.ts`.
- **Never import Zod or server-only modules into client components.** Measured in a client bundle, Zod 4 adds roughly 25 to 30 KB gzipped, and far more if its locale files get pulled in. Valibot covers the same ground for about 3 KB, so anything a form touches is defined in Valibot under `lib/schemas/` and shared by the client form and the Server Action.

## Form fields

Field components live in `components/form/`, one file per input type. They are not auth-specific: checkout will use the same ones.

- **`field-shell.tsx` owns what every field shares**: the label, the control, and the one slot underneath holding either the hint or the error. It passes `{ id, invalid, describedBy }` into its children so the control wires up its own aria attributes, and it renders shadcn's `Field`, `FieldLabel`, `FieldError` and `FieldDescription`.
- **A field type is a thin wrapper.** Take the shell's props, render the control inside the children function. `text-field.tsx` is the reference; `PasswordField` shows how a variant adds a single affordance.
- **To add a type** (select, radio, checkbox, textarea): create `components/form/<type>-field.tsx`, wrap the matching shadcn control in `FieldShell`, and keep prop names identical so swapping a field type in a form is a one-line change. Controls that aren't native inputs take `value` and a change handler instead of `inputProps`, because Formisch updates them through `setInput` rather than DOM events.
- **`orientation="horizontal"`** for checkboxes and switches, where the label sits beside the control. **`hideLabel`** only where the design uses the placeholder as the label, which is the auth screens.

## Styling

- The theme tokens in `app/globals.css` come from shadcn. Add components with `npx shadcn@latest add <name>` instead of writing them by hand.
- `Button` takes an optional `href`. Given one it renders a Next `Link` with the same styles, so a link keeps link semantics instead of `role="button"`. Never hand-style a link to look like a button.
- Comments are for things the code can't say: constraints, gotchas, and security intent. Don't narrate what the code already shows.
- **No arbitrary values, and no new theme tokens.** Never write `text-[13px]` or `h-[54px]`. Use Tailwind's own classes: v4 generates any multiple of the 4px spacing scale, so `gap-4.5` is 18px and `h-13.5` is 54px. For font sizes, use the closest stock size rather than registering a custom one, so the handoff's 34px is `text-4xl` and its 13px is `text-sm`. Theming comes later as one pass.
- **Lay pages out with `gap` and padding, not margins.** Group elements in a flex or grid container and let the container space them. Margins are for small one-off nudges, never the structure of a page.
- **Text renders through `components/ui/text.tsx`.** It's deliberately plain: a `span` by default, `as` for `h1`, `p` and the rest, and every style passed as `className`. Don't add variants to it.

### Design system, from the Klaev handoff

- **Colour is not themed yet, on purpose.** `globals.css` keeps shadcn's stock neutral tokens. The Klaev palette from the handoff (ink #1d1d1f, body #6e6e73, muted #86868b, border #d2d2d7, hairline #ececee, grey surface #f5f5f7) gets applied in one pass later, once the pages exist. Until then build with the stock tokens (`foreground`, `muted-foreground`, `border`) and never hardcode a hex, so that pass is a token swap and nothing more. The brand is black, white and grey with no accent: the leather supplies the colour.
- **Radius says what a thing does.** Full pill for anything that commits or navigates (CTAs, the Google button, chips). 12px (`rounded-lg`) for anything holding a value (inputs, size pickers). 14 to 18px for images and product cards. Don't flatten these into one radius.
- **Sizes:** input 54px, primary CTA 52px (`size="cta"`), Google button 50px (`size="social"`). Mobile side padding 28px on auth, 24px on store pages. Desktop 48px.
- **No shadows anywhere in the UI.** The shadows in the design files are artboard presentation only.
- **Auth layout:** mobile is the base; from 1024px the screen splits into a 400px form column and a full-bleed image, which is why `AuthShell` uses `breakout`.
- **Forms validate on submit, then re-validate on input** once an error is showing. Nothing is checked while someone is still filling the form, and leaving a field never triggers anything. This overrides the handoff, which asks for blur validation: Formisch's blur mode validates the whole form, so leaving the password field flagged an email the person hadn't typed yet.
- **The CTA is always enabled** and shows a spinner while submitting. It's a `type="button"` that validates first and only calls `submit(form)` when the form passes, so an invalid attempt never becomes a real form submission. That keeps the browser from offering to save a password on a failed try.
- **Inputs use the placeholder as their label and nothing floats above the value.** The handoff specifies a floating caption; it was dropped on purpose. Inputs keep an `aria-label` so they still have an accessible name.
- Typography substitutes Geist for the handoff's Helvetica Neue, which the handoff explicitly allows.
- For shadcn work, follow the project's `shadcn` skill (`.agents/skills/shadcn`, published by shadcn). Where it disagrees with the Vercel plugin's `vercel-plugin:shadcn`, ignore the plugin. The plugin assumes Radix and tells you to hardcode font names, and both are wrong for this repo.
- Fonts load through `next/font`, in each root layout (`app/(storefront)/layout.tsx` and `app/(admin)/layout.tsx`). The `@theme inline` block in `globals.css` names the families literally, as `"Geist", "Geist Fallback"`. Change the font in a layout and those names have to change with it, or the page silently falls back to the system font.

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
