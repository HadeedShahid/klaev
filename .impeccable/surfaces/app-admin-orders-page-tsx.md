---
version: 1
slug: "app-admin-orders-page-tsx"
primary_target: "app/admin/orders/page.tsx"
related_targets: ["app/admin/(console)/page.tsx","app/admin/(console)/orders/page.tsx","app/admin/(console)/orders/[number]/page.tsx","app/admin/(console)/stock/page.tsx","app/admin/(console)/settings/page.tsx","app/admin/login/page.tsx"]
---

# Admin: dashboard, orders, stock, settings (`/admin`)

**Mode:** Operate. **Who:** the owner, on a laptop, daily, 5 to 20 orders a day. **Task:** see how the business is doing at a glance; check receipts and confirm; move each order through packed, shipped, delivered and the courier's payout from one status control; record payments; keep stock and courier rates true. **Money truth:** the courier is paid upfront per parcel (about PKR 310 prepaid, 590 COD), pays each COD order's cash out separately, and keeps 4% of the COD amount as tax. **Constraints:** one admin, password sign-in; integer PKR; the courier is named here and nowhere on the storefront; the storefront's visual world (DESIGN.md) holds.

## Direction contract

THESIS: A real operations console in the shadcn dashboard canon the owner pinned (sidebar, KPI cards, chart, data table, tabs), replacing the single-scroll queue that read as elongated and scattered its actions.

OWN-WORLD: Klaev's palette and Geist on the shadcn dashboard frame: Panel Grey inset sidebar holding a Paper work sheet with a hairline edge, no shadows; Ink for the one primary action and for figures; badges in the five status colours by DESIGN.md's Colour Means State Rule (the owner asked for colour on 29 October 2026; before that, never hue). Signature move: the split money bar, carried into the order header and table, with the courier's 4% made visible.

STORY: Open the dashboard, read sales, orders, cash with the courier and profit against the last period, see what needs action; jump to a tab of orders; open one, read its stepper, move it on with the one Update status control.

FIRST VIEWPORT: 1440 by 900. Sidebar left (KLAEV, Dashboard, Orders with count, Stock, Settings; View store and Sign out at the foot). Work sheet: header with title and period tabs; four KPI cards in a row; sales chart card beside a Needs action card; recent orders below.

FORM: user-pinned shadcn dashboard canon (no roll); supersedes the stage-sections form, seed key 729e2132.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
