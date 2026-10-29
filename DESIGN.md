---
name: Klaev
description: Real leather, sold plainly. A clean premium store where the photography carries the colour.
colors:
  ink: "oklch(0.218 0.004 286)"
  paper: "oklch(1 0 0)"
  paper-on-ink: "oklch(0.99 0 0)"
  panel-grey: "oklch(0.97 0.0016 286)"
  quiet-grey: "oklch(0.52 0.008 286)"
  press-grey: "oklch(0.95 0.002 286)"
  selected-grey: "oklch(0.93 0.003 286)"
  outline-grey: "oklch(0.87 0.0056 286)"
  hairline: "oklch(0.925 0.003 286)"
  signal-red: "oklch(0.55 0.2 27)"
typography:
  hero:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  price:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "tnum"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  lead:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.56
  body-reading:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.5
  small:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  caption:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
  wordmark:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    letterSpacing: "0.28em"
  admin-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
  admin-page-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  admin-card-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
  admin-figure:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    fontFeature: "tnum"
  admin-wordmark:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    letterSpacing: "0.28em"
  article:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.625
  article-heading:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
rounded:
  md: "0.6rem"
  lg: "0.75rem"
  xl: "1.05rem"
  2xl: "1.35rem"
  full: "9999px"
spacing:
  hairgap: "8px"
  inner: "12px"
  panel: "16px"
  gutter: "20px"
  gutter-wide: "32px"
  block: "32px"
  section: "64px"
  section-wide: "112px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "oklch(0.218 0.004 286 / 0.85)"
  button-primary-disabled:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.quiet-grey}"
  button-icon:
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "44px"
  button-icon-hover:
    backgroundColor: "{colors.press-grey}"
  size-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
    height: "64px"
  size-card-disabled:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.quiet-grey}"
  panel:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  disclosure-row:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    height: "56px"
  product-card-image:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.2xl}"
  hero-image:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.2xl}"
    width: "100%"
  hero-colour-picker:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    padding: "4px 16px 4px 4px"
  hero-swatch:
    rounded: "{rounded.full}"
    size: "32px"
  colour-card-image:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.xl}"
  story-image:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.2xl}"
  line-tile:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "40px 20px 0"
  line-tile-image:
    rounded: "{rounded.xl}"
  header:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    height: "48px"
  header-wide:
    height: "52px"
  header-shop-hover:
    backgroundColor: "{colors.press-grey}"
    rounded: "{rounded.full}"
  breadcrumbs:
    textColor: "{colors.quiet-grey}"
    typography: "{typography.small}"
  cart-drawer:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    width: "28rem"
  cart-drawer-thumb:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.xl}"
    width: "64px"
  photo-viewer:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    width: "100%"
  viewer-arrow:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: "48px"
  viewer-arrow-hover:
    backgroundColor: "{colors.press-grey}"
  viewer-thumb:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.lg}"
    width: "48px"
  cart-count:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    height: "18px"
  button-pill-quiet:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-pill-quiet-hover:
    backgroundColor: "{colors.press-grey}"
  text-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "48px"
  text-field-multiline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
    height: "96px"
  choice-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
    height: "64px"
  account-panel:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "0 16px"
  account-row:
    height: "56px"
    padding: "12px 0"
  order-line-thumb:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.lg}"
    width: "48px"
  checkout-bar:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: "12px 20px"
  admin-sidebar:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    width: "16rem"
  admin-sidebar-item:
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "8px"
    height: "32px"
  admin-sidebar-item-active:
    backgroundColor: "{colors.selected-grey}"
    textColor: "{colors.ink}"
  admin-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  admin-page-header:
    textColor: "{colors.ink}"
    typography: "{typography.admin-page-title}"
    padding: "8px 24px"
    height: "56px"
  admin-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.xl}"
    padding: "16px"
  button-admin-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-on-ink}"
    typography: "{typography.small}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-admin-primary-hover:
    backgroundColor: "oklch(0.218 0.004 286 / 0.8)"
  button-admin-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-admin-outline-hover:
    backgroundColor: "{colors.panel-grey}"
  button-admin-quiet:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  button-admin-quiet-hover:
    backgroundColor: "{colors.press-grey}"
  admin-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.xl}"
    padding: "0 12px"
    height: "40px"
  admin-search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.xl}"
    padding: "0 12px 0 36px"
    height: "36px"
    width: "18rem"
  segmented-control:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.quiet-grey}"
    typography: "{typography.small}"
    rounded: "{rounded.lg}"
    padding: "2px"
  segmented-control-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
  status-tab:
    textColor: "{colors.quiet-grey}"
    typography: "{typography.small}"
    rounded: "{rounded.lg}"
    padding: "6px 12px"
  status-tab-active:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
  status-tab-count:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: "0 6px"
  status-tab-count-active:
    backgroundColor: "{colors.paper}"
  badge-needs-you:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-on-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  badge-moving:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  badge-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    height: "20px"
  badge-outline-over:
    textColor: "{colors.quiet-grey}"
  data-table-head:
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    padding: "0 8px"
    height: "40px"
  data-table-row-hover:
    backgroundColor: "oklch(0.97 0.0016 286 / 0.5)"
  action-row:
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 8px"
  action-row-hover:
    backgroundColor: "{colors.panel-grey}"
  action-row-zero:
    textColor: "{colors.quiet-grey}"
  trend-chart:
    height: "256px"
    width: "100%"
  share-bar:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.full}"
    height: "6px"
  share-bar-fill:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.full}"
  funnel-bar:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.full}"
    height: "10px"
  report-table-head:
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    height: "40px"
  message-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.xl}"
    padding: "16px 24px"
  money-bar:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.full}"
    height: "6px"
  money-bar-summary:
    height: "8px"
  money-bar-received:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.full}"
  money-bar-tax-estimate:
    backgroundColor: "oklch(0.52 0.008 286 / 0.3)"
  money-bar-tax-recorded:
    backgroundColor: "{colors.quiet-grey}"
  stepper-step-done:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    size: "24px"
  stepper-step-waiting:
    rounded: "{rounded.full}"
    size: "24px"
  admin-menu:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.lg}"
    padding: "4px"
    width: "16rem"
  admin-dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.xl}"
    padding: "16px"
    width: "24rem"
  admin-dialog-footer:
    backgroundColor: "oklch(0.97 0.0016 286 / 0.5)"
    padding: "16px"
  receipt-image:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.2xl}"
  button-pill-outline:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "48px"
  button-pill-outline-hover:
    backgroundColor: "{colors.panel-grey}"
  applied-code-row:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
    height: "48px"
  track-step-done:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.full}"
    size: "24px"
  track-step-waiting:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.full}"
    size: "24px"
  article-column:
    textColor: "{colors.ink}"
    typography: "{typography.article}"
    width: "42rem"
  store-page-column:
    textColor: "{colors.ink}"
    typography: "{typography.article}"
    width: "42rem"
  subject-chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "44px"
  sent-panel:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "24px"
  journal-cover:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.2xl}"
  journal-list-cover:
    backgroundColor: "{colors.panel-grey}"
    rounded: "{rounded.xl}"
    width: "240px"
  admin-sidebar-subitem:
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.md}"
    padding: "0 8px"
    height: "28px"
  admin-sidebar-subitem-active:
    backgroundColor: "{colors.selected-grey}"
  button-admin-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "28px"
  button-admin-ghost-hover:
    backgroundColor: "{colors.panel-grey}"
  row-actions-trigger:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    size: "28px"
  row-actions-trigger-hover:
    backgroundColor: "{colors.panel-grey}"
  admin-attention-strip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-on-ink}"
    typography: "{typography.small}"
    rounded: "{rounded.lg}"
    padding: "6px 10px"
  admin-choice-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.xl}"
    padding: "10px 12px"
  admin-repeater-item:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.xl}"
    padding: "12px"
  admin-tag:
    backgroundColor: "{colors.panel-grey}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  print-document:
    backgroundColor: "#ffffff"
    textColor: "#000000"
    typography: "{typography.small}"
    width: "180mm"
---

# Design System: Klaev

## Overview

**Creative North Star: "The Quiet Counter"**

Klaev is the category standard executed at Apple Store craft: a white room with a well lit counter, where one product is laid out, its price is stated once and clearly, and every choice is made in order. The system is deliberately colourless. White ground, soft grey panels and near-black ink are the whole palette; the leather photography supplies every warm tone on the screen, so nothing in the interface competes with the hide.

Density is calm and single-column on the phone (390px first). Content stacks in one column with generous 32px gaps between blocks; on wide screens the same column sits beside the photos as a sticky buy column. Form is soft and rounded: pill actions, rounded selection cards, rounded grey panels, with hairlines used to rule lists and to seat fixed chrome. Depth is flat, with exactly two pieces of frosted glass: the header and the hero's colour picker, both of which float over photography. Motion is functional only: the product photo morphs from its card into the product page, accordions slide open as their chevrons turn, the cart drawer slides in, buttons settle under the finger.

The admin at /admin is the same counter seen from behind it, built in the shadcn dashboard canon the owner pinned: a Panel Grey inset sidebar holding the work as one Paper sheet, KPI cards, trend charts, data tables and tabs, all in Klaev's palette and Geist with no hue added. Its signature is the money bar, which draws every order's money as one split bar, so what came in, the cash still at the door and the courier's tax share read at a glance.

The interface earns trust with exact information rather than decoration. Money is always tabular, sizes are named by chest measurement, and payment is broken into what you send now and what you pay on delivery. The user rejected loud streetwear urgency, generic template looks, and dark, moody "leather brand" styling; the white ground is the answer to all three.

**Key Characteristics:**
- White ground, grey panels, near-black ink; the photography is the only colour.
- One typeface, Geist Sans, with large tight semibold headings and tabular numerals for money.
- Black pill for the one primary action per view.
- Rounded panels and selection cards; hairlines rule lists and seat fixed bars.
- No shadows. Depth comes from grey panels against white; glass is reserved for the header and the hero colour picker.
- Motion serves navigation and state, never ornament.
- The admin is an operations console in the same materials: Panel Grey sidebar, Paper sheet, ringed cards, badges in Ink, Panel Grey and outline, one black primary per view.

## Colors

A neutral, faintly cool grey family (hue 286, near-zero chroma) around a pure white ground; the leather supplies the colour.

### Primary
- **Ink** (oklch 0.218 0.004 286): all text, the primary pill action, the selected size outline, the selected hero swatch ring, the active gallery segment, the cart count, focus rings and text selection. At reduced strength it draws the glass edges (8%: the header rule and the colour picker's outline), the resting swatch ring (10%) and the cart drawer's dimmer over the page (30%). It is the only "accent" in the system.

### Neutral
- **Paper** (oklch 1 0 0): page ground, sticky buy bar, size cards at rest, the cart drawer and the photo viewer (whose backdrop is solid Paper too). At 78% behind a blur it is the glass of the header and the hero colour picker.
- **Paper on Ink** (oklch 0.99 0 0): label colour on the black pill.
- **Panel Grey** (oklch 0.97 0.0016 286): payment panel, size guide, empty cart, footer ground, photo placeholder behind every image, the photo viewer's round arrow buttons, disabled size cards and disabled pill.
- **Quiet Grey** (oklch 0.52 0.008 286): the one secondary text colour: taglines, measurements, payment row labels, reading copy in details, breadcrumb links.
- **Press Grey** (oklch 0.95 0.002 286): hover wash behind round icon buttons (cart, remove, close, viewer arrows) and the bubble behind the header's Shop link on hover.
- **Outline Grey** (oklch 0.87 0.0056 286): resting outline of size cards; header rule of the size table.
- **Hairline** (oklch 0.925 0.003 286): dividers between list rows (payment options, details accordion, cart lines, size table rows), the rules under the cart drawer's title and above its totals, above the sticky buy bar, above the phone breadcrumbs and above the footer. The glass header is seated by Ink at 8% instead, which reads the same on white and holds over a photo.

### Tertiary
- **Signal Red** (oklch 0.55 0.2 27): validation and failure messages only: the size prompt error, a checkout field's error line, the payment choice error, a failed receipt upload. Always a line of text, never a border, fill or icon. Never decorative.

### In the admin
The admin adds no hue, and one grey.
- **Selected Grey** (oklch 0.93 0.003 286): the sidebar's current place and its hover wash. One step darker than Press Grey, because Press Grey barely reads on the Panel Grey sidebar.

Panel Grey grounds the sidebar around the Paper work sheet, fills the "moving" badges, the period and status tab tracks, the Needs action hover, the money bar's open track and the tracks of Analytics' share and funnel bars. Ink fills the one primary button, the "needs you" badges, the refusal warning on an order's Customer card, done steps in the stepper, the trend line, the measure in a share or funnel bar and the received share of the money bar. Outline Grey draws outline badges, waiting steps and the dialog footer's rule; Hairline rings the work sheet and rules the page header, table rows and lists. Quiet Grey draws the money bar's door hatching (at 60%), the courier's estimated tax (at 30%) and its recorded tax (solid). Signal Red keeps its one job: the error line under an action.

**Chart tokens.** Chart One is Ink, Chart Two Quiet Grey, Chart Three Outline Grey. Every trend chart (sales, visitors) uses Chart One alone; the other two are the only colours a second or third series may take.

**Sidebar tokens.** The sidebar's ground is Panel Grey; its text, primary and focus ring are Ink; text on its primary is Paper on Ink; its accent is Selected Grey; its border is Hairline.

**The Ink Is Attention Rule.** State in the admin is drawn without hue, in three tones: Ink, Panel Grey and outline. Ink is spent on a state only when it waits on the owner: an order to confirm, a receipt in, a delivery attempted, a parcel coming back, a customer who has refused a delivery (their badge, and the warning on their next order). What is moving takes Panel Grey; what is elsewhere or over takes the outline, its label in Quiet Grey once it is finished. Beyond state, Ink fills only the one primary button, the figures and the measure in a chart or bar. A label that only sorts (a message's subject) is an outline badge, not Ink.

### The admin at night
The admin has a dark theme; the storefront never does. It follows the computer's light or dark setting unless the owner picks Light or Dark under Appearance at the sidebar's foot (kept in that browser). A script at the top of every admin page sets it before the first paint, so a dark admin never flashes white, and leaving the admin for the store hands the page back light.

Dark is the same cool near-neutral family (hue 286) with the steps turned over, so every rule above holds by token:
- **Night Ground** (oklch 0.145 0.003 286): the sidebar and the field around the work sheet. The darkest step, so the sheet reads as lifted.
- **Night Sheet** (oklch 0.185 0.004 286): the work sheet and cards (Paper's place).
- **Night Lift** (oklch 0.215 0.004 286): menus, dialogs and popovers, one step above the sheet.
- **Night Panel** (oklch 0.245 0.004 286): Panel Grey's place (moving badges, tab tracks, quiet pills); **Night Selected** (0.255) for the sidebar's current place; **Night Press** (0.285) for hover; **Night Hairline** (0.275) and **Night Outline** (0.38) for rules and outlines.
- **Night Ink** (oklch 0.955 0.002 286): text, figures, the one primary button and the "needs you" badges. Ink's job is unchanged; only its tone inverts, so the primary is a light pill with Night Sheet text.
- **Night Quiet** (oklch 0.71 0.008 286): secondary text, at least 6:1 on every night surface. **Night Red** (oklch 0.7 0.18 25) keeps the error line's one job.
- Charts run Night Ink, Night Quiet and Night Outline. Overlays behind dialogs and the phone sidebar deepen from Ink at 10% to black at 50%. Native controls (selects, date fields, scrollbars) follow through `color-scheme: dark`.

**The Grey Measure Rule.** A share or a step in the admin (where visits come from, devices, the funnel) is a full-round Ink bar on a Panel Grey track, as wide as its percent. No series takes a hue, and length alone carries the comparison.

**The Night Inversion Rule.** Dark mode is a token swap, never a second design: no hue, no glow, no new surface. A colour written into a component instead of a token is the one thing that breaks it. The printed document is the exception on purpose: it stays white paper, shown on a dark screen as a sheet on the desk.

### In print
Printed documents leave the screen palette behind: black text on white paper, no fills. Secondary text (contact line, dates, SKUs, the terms) is one grey, Tailwind's neutral 600; rules are black (under the document's head, under the table head, above the total) or neutral 300 (between rows, around a note, above the terms).

### Named Rules
**The Leather Is the Colour Rule.** The interface carries no hue. Warmth on screen comes from the product photographs alone; no brand tint, gradient or coloured badge is added. Even a colour swatch is cut from the leather photo, never painted.

**The One Grey Voice Rule.** Secondary text uses Quiet Grey and nothing else. Hierarchy below that comes from size and weight, not from more greys.

**The Red Line Rule.** Red belongs to the error line alone. An invalid field keeps its Outline Grey border and white ground; the Small Signal Red line beneath it says what to fix, and the first invalid field takes focus.

## Typography

**Display Font:** Geist Sans (via next/font, with system-ui fallback)
**Body Font:** Geist Sans
**Label/Mono Font:** Geist Sans, with tabular numerals for all money and measurements

**Character:** One neo-grotesque throughout, set large and tight for names and plain for everything else. Clarity over personality; the voice comes from the words.

### Hierarchy
- **Hero** (600, 2.5rem rising to 3.75rem at 768px, line-height 1.05, tracking -0.025em, balanced wrap): the landing page headline only, one per page.
- **Title** (600, 2rem rising to 3rem at 768px, line-height 1.1, tracking -0.025em, balanced wrap): landing story section headlines ("Cut to the waist.", "Made to measure."). The same 2rem size, weight and tracking is the page title on the collection, cart, checkout, order and not-found pages, which hold at 2rem on desktop and set line-height 1.25 (the order title balances its wrap).
- **Display** (600, 1.75rem rising to 2.25rem at 768px, line-height 1.15, tracking -0.025em, balanced wrap): the product name. Landing sub-section headings (the colour cards row, the FAQ, the line tiles) use the same size at line-height 1.25; the line tiles hold at 1.75rem.
- **Headline** (600, 1.25rem, tracking -0.025em): section headings such as "More from Klaev" and collection names; the checkout section legends ("Contact", "Delivery", "How you pay") and the order page sections ("Where to send it", "Your order", "Delivering to"); the cart drawer's "Cart" title.
- **Price** (500, 1.25rem, tabular): the product price directly under the name. The sticky bar repeats it at 0.875rem semibold.
- **Body** (400, 1rem, 1.5): default text and taglines.
- **Lead** (400, 1.125rem, Quiet Grey, balanced wrap): the supporting line under a Hero or Title; the hero line rises to 1.25rem at 768px. On the order page the Lead is two lines: a first line in 500 Ink stating the one thing to know, then the explanation in Quiet Grey.
- **Body Reading** (400, 0.9375rem, line-height 1.625, Quiet Grey): product description and accordion content.
- **Label** (500, 0.9375rem): step labels ("Size", "How you pay"), field labels, primary pill text, product card and order line titles, accordion summaries (at 1rem).
- **Small** (400 or 500, 0.875rem): payment rows, assurances, nav, breadcrumbs, the colour picker's name, the photo viewer's counter, size guide.
- **Caption** (400, 0.75rem, Quiet Grey): chest measurement in size cards, "to confirm" line, delivery fee notes.
- **Wordmark** (600, 1.0625rem, tracking 0.28em, uppercase): the KLAEV wordmark in header (centred) and footer only; in the admin, smaller at the head of the sidebar (see below).
- **Article** (400, 1.0625rem, line-height 1.625, Ink): a journal article's body, in Read mode. It is the one long-reading size; unlike Body Reading it stays Ink, because the article is the page's whole job. Paragraphs wrap pretty.
- **Article Heading** (600, 1.5rem, tracking -0.025em, balanced): a section heading inside an article.

Journal titles (the index's "Journal" and an article's title) take the Title (2rem rising to 3rem at 768px, line-height 1.25); on the index each article's name is a Headline. Store pages (About, Contact, the size chart, the policies) take the same Title over an optional Lead, and their bodies are Article text. Codes are data, not headings: a discount code is set in 500 with tracking opened to 0.025em, like an account number, in the uppercase it is stored in.

### Admin (working density)
The admin keeps Geist and the storefront's weights; Small (0.875rem) is its body: tables, cards, forms, menus.
- **Admin Page Title** (600, 1rem): the page header's title ("Dashboard", "Orders", an order's number). It stays small because the sidebar and the header already frame the page.
- **Admin Card Title** (500, 1rem, line-height 1.375): each card's title ("Sales", "Needs action", "Items"), its description beneath in Small Quiet Grey. Dialog titles take the same.
- **Admin Figure** (600, 1.5rem, tabular): the KPI figure. An order's total in its summary card is one step down (600, 1.25rem, tabular); a Needs action count is 600 at 1.125rem, tabular, dropping to 400 at zero.
- **Admin Title** (600, 1.5rem, tracking -0.025em): "Sign in to the admin" on the sign-in page only.
- **Admin Wordmark** (600, 0.9375rem, tracking 0.28em, uppercase): KLAEV at the head of the sidebar, with "Admin" in Small Quiet Grey beside it on one baseline. The sign-in page sets the storefront Wordmark size above its title.
- **Labels and notes:** table heads and field labels in Small 500; dates, cities, hints, legends and badges in Caption (0.75rem), badges at 500.
- **Customer figures:** on a customer's page, Orders, Spent, Average order and Customer since are 600 at 1.125rem, tabular, each over a Caption Quiet Grey label.

### Print
A printed document is Small (0.875rem) at line-height 1.625. Column heads, the Ship to and Payment labels and SKUs are Caption (0.75rem); the KLAEV wordmark and the document's name ("Packing slip", "Invoice") are 600 at the Wordmark size (17px), the wordmark keeping its 0.28em tracking; the slip's "Collect PKR …" line is 600 at the Label size (15px). Names, the Total and the balance are 600. Every figure is tabular.

### Named Rules
**The Tabular Money Rule.** Every PKR amount, size measurement and count is set with tabular numerals so columns of money align.

**The Wordmark Is the Only Spaced Caps Rule.** Wide letterspaced uppercase belongs to the KLAEV wordmark. Headings, labels and buttons stay in sentence case.

**The Ramp Holds Rule.** Every text size is a step of the ramp: 0.6875rem (the cart count alone), 0.75, 0.875, 0.9375, 1, 1.0625, 1.125, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 3 and 3.75rem. The admin works in 0.75, 0.875, 1, 1.125, 1.25 and 1.5rem; print uses the same steps in pixels. A size between steps is drift, not a new step.

## Layout

Mobile first at 390px. Content sits inside a 20px side gutter (32px from 768px) and a 72rem maximum width; the cart narrows to 48rem. On phones the product page is one column: a full-bleed photo strip that swipes sideways with snap, then name and price, then the step-by-step blocks separated by 32px. The photo height is capped at the smaller of 125vw and the viewport minus 17rem so the name and price share the first screen.

From 768px breadcrumbs lead the product and collection pages, top left, 24px below the header, and the product page becomes a 7:5 grid with a 40px gap: photos in a two-column grid of 4:5 rounded tiles on the left, the buy column sticky at 80px from the top on the right. Product grids are two columns on phones (12px column gap, 32px row gap) and four from 768px (20px column gap).

Rhythm: 8px inside grids, 12px between a label and its control, 16px inside panels, 32px between blocks, 64px before a new page section. On phones the product and collection pages close on their breadcrumbs, which sit directly on the footer rule. The fixed buy bar respects the safe-area inset; the room it covers is held by the footer, not the page (below).

The landing page is a single centred column of sections. Text blocks are centred and capped narrower than the photos (42rem for headline and copy, 48rem for the hero text, 48rem for the FAQ); photos run to the 72rem container. Sections open with 64px of top space on phones and 112px from 768px (the colour cards row 48px and 64px, the line tiles 80px and 112px). Inside a section, headline and copy sit 12px apart and the photo or proof 24px below. The hero's main photo is the one full-bleed image outside the product gallery, on phones only; from 768px the hero becomes a mosaic inside the 72rem container (see Landing Hero). The two line tiles stack on phones and sit side by side from 768px with a 12px gap.

The checkout and order pages are one 36rem column (20px gutter, 32px from 768px), 32px below the header. Checkout groups its fields in sections 40px apart, 16px between fields inside a section, 6px between a label, its control and its hint or error line. The order page separates its sections by 40px. Checkout keeps 64px of bottom padding at every width; on phones the footer holds the fixed checkout bar's room, and from 768px the bar joins the column.

The sticky header (48px on phones, 52px from 768px) sets a 4.5rem scroll padding at the top of the document, and any phone page carrying a fixed bottom bar (Add to cart, Place order, each marked `data-fixed-bar`) sets 7rem of scroll padding at the bottom, so a field focused by keyboard or by script never lands under the header or the bar. The same mark gives the footer a 7rem reserve below its last line, so such a page ends on the footer rather than on an empty strip above it. In-page links (the hero's "See the colours") scroll smoothly unless reduced motion is asked for.

The admin is a sidebar and a sheet. From 768px a 16rem Panel Grey sidebar holds the left edge and the page sits beside it as a Paper sheet inset 8px from the top, right and bottom (flush against the sidebar). The sidebar is offcanvas: the header's toggle slides it away and the sheet takes the width, keeping an 8px inset on its left too; the choice is remembered. Below 768px the sidebar is an 18rem sheet over the page, opened by the same toggle, and the work sheet runs edge to edge.

Every console page opens on its page header: at least 56px tall, 16px side padding (24px from 768px), ruled by a Hairline beneath. Left to right: the sidebar toggle, a 16px vertical rule centred on the title, the title, then the page's controls pushed right (the period control, the search, the Update status menu); on a narrow screen the controls wrap under the title. The header does not stick, so pages carrying the admin mark drop the storefront's top scroll padding to zero.

Below the header each page is one column with 16px padding (24px from 768px) and 16px between blocks. There is no maximum width: the sheet is the container. The dashboard is four KPI cards (one column on phones, two from 640px, four from 1280px), then two rows split 2:1 from 1280px, Sales beside Needs action and Recent orders beside Running low. Orders is the status tabs, the table card and the pager. An order is its summary card, then its tabs: Overview splits into a main column and a 24rem side column from 1024px (Receipt and Items; Customer, Parcel details and Note), Payments into two columns (Money beside Profit, then Payments across both). Stock is an intro line capped at 65ch above one card of products. Settings is a column of cards, one per concern (Checkout, Bank account, Courier, Password, Store details). Discounts and Abandoned checkouts open on an intro line in Small Quiet Grey capped at 70ch above one table card. Customers is the header search (18rem, 36px), the segment tabs, the table card and a pager at 50. A customer's page is a card of four figures (two columns on phones, four from 768px, split by Hairline rules), then a main column and a 22rem side column from 1024px: Orders beside Contact and Notes, the side column first on phones because a call is usually why you came. Create order splits the same way, Items and Payment beside Customer, Note and the Create order button. A journal article's editor splits into a main column and a 20rem side column from 1024px (the article and its search listing; Status, Cover photo and Delete article). A page's editor splits the same way, the page's words beside a 20rem Search engine listing card. Messages is the Waiting and Handled tabs above a column of message cards 12px apart; Pages is an intro line capped at 70ch above one table card.

Analytics works in the dashboard's grid. The overview is six KPI cards (one column on phones, two from 640px, three from 1280px), then pairs side by side from 1280px: the Sales and Visitors trend charts, then Where visits come from beside Top products, then By city beside a stacked Devices and Campaigns, split 2:1. A note on Panel Grey (xl radius, 12px by 16px, Small Quiet Grey) leads the page while no visits are counted. Live view is four KPI cards (two from 640px, four from 1280px), then On the store now beside Today's orders and Cities now, 2:1. Funnel is one card. Reports is its tabs, then report cards two to a row from 1280px, a table with more than five columns spanning both. Pages below a section (an order, a customer, an article, a page, Create order) lead their header title with a back link: the section's name in Quiet Grey behind a 16px ChevronLeft, turning Ink on hover.

The journal index is a 48rem column, an article and a store page (/pages/..., /policies/...) a 42rem column, and /track a 36rem column, each in the 20px gutter (32px from 768px) with 64px below. The index and /track start 32px below the header (the index 48px from 768px); an article and a store page start 24px below (40px from 768px) and stack their parts 32px apart. On the size chart page each line's chart is a section 40px from the next. An article's breadcrumbs drop their own padding so the trail lines up with the column's edge, top left from 768px and closing the article on phones.

Print pages are a column at most 180mm wide, 40px of padding above and below on screen and none on paper, one order per printed page. Above it, on screen only, a sticky print bar ruled by Hairline names what is about to print in Small Quiet Grey and holds the Ink "Print" button.

Touch targets are at least 44px (icon buttons, nav, size guide summary); the primary pill is 48px on phones and 56px when full width on desktop; size cards are at least 64px tall. The admin works denser where a mouse is the usual pointer: quiet pills, fields and the Record a payment summary at 40px, table heads at 40px, the pager's quiet pills and the header search at 36px, the primary and outline buttons and the sidebar's items at 32px. The copy buttons in the parcel details stay 44px.

## Elevation & Depth

Flat, with two sanctioned pieces of glass. No surface in the system casts a shadow. Depth is tonal: Panel Grey blocks sit on white Paper, and the fixed buy and checkout bars are separated from scrolling content by a single hairline and a solid white ground. Selection is shown by outline weight, not lift. Overlays stay flat too: the cart drawer is solid Paper over the page dimmed by Ink at 30%, and the photo viewer is solid Paper edge to edge.

The exception is glass, and only on the two pieces that float over photography: the sticky header and the hero's colour picker. Both use one shared material: Paper at 78% behind blur(20px) saturate(1.8), edged with Ink at 8%. It turns solid Paper when the visitor asks for reduced transparency and where the browser cannot blur.

The admin is flat and carries no glass. Its depth is one tonal step: the Paper work sheet sits in the Panel Grey sidebar's ground, edged by a 1px Hairline ring with its default shadow removed. Cards, menus, dialogs and the chart tooltip sit on Paper with a 1px ring of Ink at 10% instead of a shadow, and the period control lifts its chosen segment the same way, with a Paper ground and an Ink 10% ring.

### Named Rules
**The Flat Counter Rule.** No box-shadow, no hover lift, and no backdrop blur except the shared glass on the header and the hero colour picker. Everything else stays flat: if something needs to stand apart, it gets a grey panel or a hairline.

## Shapes

Soft, consistent rounding derived from a 0.75rem base radius. Actions and round controls are full pills or circles. Selection cards and the size guide use the xl radius (1.05rem); content panels, product photos and card images use the 2xl radius (1.35rem). On phones the product gallery runs full bleed with square edges; it rounds to 2xl as tiles from 768px. Cart thumbnails are 4:5 at xl radius; the compact 48px order line thumbnails at checkout and on the order page are 4:5 at lg radius (0.75rem), the base radius, because xl reads as a blob at that size. Text fields and choice cards share the xl radius of the size cards. Product imagery in cards, the gallery and the colour cards is always 4:5. Landing photos are art-directed instead: the hero's main photo runs full bleed with square edges at 4:5 on phones, and from 768px every hero mosaic tile rounds to 2xl; story photos are 4:5 at 2xl radius on phones and either crop to 16:10 or keep the whole 4:5 photo (at most 36rem wide) from 768px; the line tile photo is a 5:4 crop at xl radius nested inside the tile's 2xl radius.

The glass colour picker is a full pill with 32px circular swatches; the photo viewer runs edge to edge with square corners, its thumbnails 48px wide at 4:5 and lg radius. The cart drawer is a full-height sheet with square corners; its line thumbnails are 64px at 4:5 and xl radius.

In the admin the large forms take the xl radius (1.05rem): the work sheet, cards and dialogs. Buttons, menus, the period and status tab tracks, the status tab links and the Needs action rows take lg (0.75rem); the period segments, the tab count chips and the sidebar's items take md (0.6rem). Badges are full pills 20px tall. The quiet pill stays a full pill at 40px. The money bar is a full-round track, 6px in tables and 8px in an order's summary; Analytics' share bars are full-round 6px tracks and its funnel bars 10px; the stepper's steps are 24px circles joined by 1px rules; product thumbnails are 48px at 4:5 and lg radius; the receipt preview rounds to 2xl; admin fields keep the xl radius.

Journal covers are photographs of their own, not product imagery: 4:3 at xl radius in the index (240px wide from 640px, full width on phones), whole at their own ratio and 2xl radius in an article, on Panel Grey. In the admin the article list's thumbnails are 56px at 4:3 and md radius, and the editor's cover preview is 4:3 at lg radius. Repeated editable items (the FAQ's questions, an order's lines in Edit items and Create order) are boxes at xl radius with a 1px Hairline border and 12px padding, 12px apart. The refusal warning is an lg strip; a customer's tags are md chips. Print is square: no radius anywhere, 1px rules only, and the slip's pack box is a 14px square outlined in black.

Borders are 1px. Outline Grey outlines interactive cards; Hairline rules lists. Lists of rows (details, cart lines) are ruled top and bottom as well as between rows.

### Brand marks
The icon is a Paper K in Geist 600 on an Ink tile, centred on the letter's own ink: the cap height is about 40% of the tile, and about 50% in the favicon sizes (48, 32, 16px) so it still reads in a browser tab. The favicon and the 512px icon (also the store's logo in search) round their corners at 22.5% of the side; the home screen icon is square, because iOS masks it. The link preview (1200 by 630) is White ground with the wordmark centred at 44px above the three cropped jackets worn, dark brown, black and burgundy, as 2xl-rounded cards 16px apart; black sits in the middle, where a square crop of the preview lands. `scripts/brand-images.ts` draws all of them; a shared product, collection or article shows its own first photo instead, at its stored 1200 wide copy.

## Components

### Buttons
Calm, solid and few.
- **Shape:** full pill (9999px).
- **Shared pill:** one class string in `lib/styles.ts` defines the black pill for links and buttons on the landing page, cart and not-found page. New surfaces reuse it rather than restating the classes.
- **Primary:** Ink ground, Paper on Ink label, 500 weight at 0.9375rem, 48px tall with 20 to 24px side padding; 56px tall and full width in the desktop buy column and the cart order action.
- **Hover / Active:** ground eases to 85% Ink; pressing scales to 0.98. Focus uses the global 2px Ink outline at 2px offset.
- **Disabled / Pending:** Panel Grey ground with Quiet Grey label (sold out, adding, placing order, uploading).
- **Quiet pill:** once its job is done a pill can step down to Panel Grey ground with an Ink label, Press Grey on hover, same size (the receipt upload becomes "Upload another"). It is never a second pill beside a black one, except in the admin (see Admin Actions).
- **Icon button:** 44px circle, Ink glyph (Lucide at 1.6 stroke), Press Grey wash on hover. Used for cart, close and remove. Remove is a Trash glyph (18px) in Quiet Grey that turns Ink on hover, on the cart page and in the cart drawer alike.
- **Text link:** underlined at 0.2em offset, 1px thickness, underline drops on hover.
- **Quiet link:** beside a pill (the hero's "See the colours", the order page's "Send it on WhatsApp"), Ink at 500 weight, 0.9375rem, 48px tall, a trailing Lucide chevron; underline appears on hover and the chevron nudges 2px right.
- **Alternative link:** under a full-width pill (the cart's "Send your order on WhatsApp"), Small Quiet Grey text, centred, 44px tall, no chevron; turns Ink and underlines on hover. The way out that is not the main path.
- **Outline pill:** a pill attached to a field (the checkout's "Apply"): 48px, 20px side padding, Small 500 Ink on Paper with a 1px Outline Grey border, Panel Grey on hover, Quiet Grey label while it works ("Checking").
- **Copy button:** a 44px round icon button inside a row (Lucide Copy at 1.6 stroke, 18px), Press Grey on hover. A tap swaps the glyph for a Check for 2 seconds and announces "Copied" to screen readers; nothing moves or pops.

### Size Cards (signature)
The step that defines the buy flow.
- **Style:** two-column grid, 8px gap; each card is a whole-card radio at xl radius, 1px Outline Grey border on white, 12px by 16px padding, at least 64px tall. Size in 1rem semibold, chest measurement beneath as Caption in Quiet Grey.
- **Selected:** border and a 1px ring in Ink, giving a 2px Ink outline.
- **Sold out:** stays visible, Panel Grey ground, Quiet Grey text, "Sold out" caption, not-allowed cursor.
- **Behaviour:** choosing a size rewrites the primary action to "Add to cart, size M". Pressing the action with no size scrolls the grid into view and focuses the first available card.

### Sticky Buy Bar
On phones, fixed to the bottom from first paint: white ground, hairline top rule, price (semibold, tabular) with the advance "to confirm" line beneath it, and the primary pill to the right. From 768px it dissolves into the buy column as a full-width pill.

### Inputs / Fields
Plain and roomy, sized for one thumb.
- **Style:** 48px tall, xl radius, 1px Outline Grey border on white Paper, 16px side padding, 1rem text (so phones never zoom). The multi-line address field is the same box at least 96px tall with 12px vertical padding, three rows, not resizable.
- **Label:** Label (0.9375rem, 500) above the field, 6px gap. A hint sits beneath in Small Quiet Grey.
- **Focus:** the global 2px Ink outline at 2px offset; the border does not change.
- **Error:** see the Red Line Rule. The border stays Outline Grey; a Small Signal Red line sits beneath the field, above its hint, and is wired to the field as its description.
- **Keyboards:** phone fields ask for the phone keyboard, email the email keyboard; the city field suggests from a list of Pakistani cities.

### Choice Cards (payment)
The size card language reused for a stacked choice. Whole-card radios in a single column, 8px apart: at least 64px tall, xl radius, 1px Outline Grey border on white, 12px by 16px padding. Title in 1rem semibold with a Caption note beneath in Quiet Grey ("PKR 900 delivery", "Free delivery"), the total right-aligned in 0.875rem 500 tabular. Chosen: Ink border plus a 1px Ink ring, as on the size cards. Focus draws the Ink outline around the whole card.

### Payment Breakdown (checkout)
Directly under the choice cards: a Panel Grey 2xl panel with 16px padding holding one two-column list in Small tabular figures: Subtotal, Delivery, Total (500), a Hairline, then "Send now to confirm" (500, figure semibold) and, for cash on delivery, the cash balance. It rewrites the moment the choice changes.

### Checkout Bar (signature)
The sticky buy bar's checkout form. On phones it is fixed to the bottom from first paint: white ground, Hairline top rule, 12px by 20px padding respecting the safe-area inset. Left: what to send now in 1rem semibold tabular, with the rest of the deal beneath in Caption Quiet Grey ("to confirm, PKR 18,899 total" or "by bank transfer, free delivery"). Right: the "Place order" pill. Changing the payment choice crossfades the figure in over 300ms (none under reduced motion). From 768px the bar sits in the column: the figure and its line on one baseline, then the pill full width at 56px.

### Order Lines
The compact list of what is being bought, at checkout and on the order page: rows ruled by Hairline top, bottom and between, 12px vertical padding, a 48px 4:5 thumbnail at lg radius on Panel Grey, then the title (Label, balanced) with "Size S" in Small Quiet Grey beneath, and the line total right-aligned in Small 500 tabular.

### Account Panel (signature)
Where the money goes. A Panel Grey 2xl panel with 16px side padding, holding a list of rows split by Hairline, each at least 56px: term in Quiet Grey left, value right in 0.9375rem. The amount leads in semibold tabular; the account number and IBAN are 500 tabular with slightly opened tracking and a Copy button at the row's right edge. If no account is set, a Panel Grey line says the details come on WhatsApp.

### Order Page Lead
The order page opens on its Title ("Order #1022 is in.") and a two-line Lead whose content follows the order's state: waiting for payment says the amount to send and what is paid at the door; once a receipt is in it says "Receipt received." and what happens next; once confirmed it is one Quiet Grey line of status. When the receipt is in, the account panel moves below the order summary, its heading becomes "Paid to", and the upload pill steps down to the quiet pill. The upload itself starts the moment a file is chosen.

### Order Summary
On the order page, under a Headline: the order lines, then the same Small tabular two-column list as the payment breakdown but on white, with no panel. The delivery address follows as plain 0.9375rem text at relaxed leading, phone tabular.

### Discount Code (checkout)
Between the payment choice cards and the payment breakdown. Before a code is applied: a Label ("Discount code") over a 48px field and the Apply outline pill on one row, 8px apart. The field shows what is typed in uppercase (its placeholder stays in sentence case); Enter applies the code and never places the order. A code that does not apply says why in a Small Signal Red line beneath. Once applied, the field gives way to a row: at least 48px, xl radius, 1px Outline Grey border on Paper, 8px by 16px, the code in Small 500 at 0.025em tracking with what it gives in Caption Quiet Grey beneath, and "Remove" as a Small text link at the right. The breakdown then carries "Discount (CODE)" in Quiet Grey between Subtotal and Delivery, its figure "−PKR 1,000" with a true minus sign, tabular. The admin's Items card and the printed invoice state a discount the same way.

### Order Tracker (/track)
A 36rem column: the Title "Track your order", a Body line in Quiet Grey with the WhatsApp link, then the form: order number and mobile number as 48px fields with Labels (the phone's hint in Small Quiet Grey), and the black pill full width ("Track order", "Finding it" in Panel Grey while it looks). The answer appears 40px below in a region that takes focus and is announced politely.
- **Found:** "Order #1042" as a Headline, the status line in Lead Quiet Grey, then a vertical step list. Each step is a 24px circle: done is Ink with a 14px Paper Check; not yet is a 1px Outline Grey ring on Paper. A 1px rule joins each circle to the next, Ink between two done steps and Hairline otherwise. Labels are 0.9375rem: the latest done step in 600, earlier ones in Ink, steps not reached in Quiet Grey, each with its date at the right in Small Quiet Grey tabular. Steps sit 20px apart. A cancelled or refused order shows no steps, only its status line. Then the tracking number while shipped (Small Quiet Grey, the number in 500 Ink), and the lines under a Hairline in 0.9375rem, size and quantity in Quiet Grey.
- **Not found:** a Panel Grey 2xl panel with 16px padding and one Small line saying what to check. A miss is an answer, not a field error, so it is not red.

### Journal
The articles at /blogs/blog, in Read mode.
- **Index:** the Title "Journal" and a Body line in Quiet Grey (52ch), then the articles newest first as a list ruled by Hairline top, bottom and between. Each row is a whole link, 24px of vertical padding: the cover (see Shapes), then the date in Small Quiet Grey tabular, the title in Headline (balanced, underlined at 0.2em on the row's hover) and the summary in Body Quiet Grey. Beside the cover from 640px, 24px apart; stacked beneath it on phones. With no articles, a Panel Grey 2xl panel with 24px padding says so in Quiet Grey.
- **Article:** a 42rem column. The breadcrumbs (Home, Journal, the article), the title in Title, balanced, and a Small Quiet Grey tabular line of the date and the reading time ("12 March 2026 · 4 min read"). The cover runs the column's width at 2xl radius. The body is Article text, its blocks 20px apart: paragraphs, Article Headings with 12px more space above, and lists with Quiet Grey disc markers, a 20px indent and 8px between items. The body is plain text parsed into these three blocks, with `[words](/link)` links inside them (underlined at 0.2em offset, the underline dropping on hover; an outside https link opens a new tab); there is no other formatting. Store pages share the same renderer. The breadcrumbs close the article on phones.

### Cards / Containers
- **Corner Style:** 2xl (1.35rem) for panels; xl for the size guide.
- **Background:** Panel Grey on white.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** none; rows inside a panel are split by Hairline.
- **Internal Padding:** 16px; 24px for the empty cart message.
- **Payment panel:** two rows (cash on delivery, bank transfer), each a title with its total right-aligned in Quiet Grey, then a two-column definition list of amounts with labels in Quiet Grey and figures in 500 weight, tabular. The panel renders on its own (PaymentBreakdown) so a page can give it its own heading; the product page and cart wrap it under a "How you pay" label, the landing page under a Title.
- **Exchange terms line:** follows the payment panel on the cart and the landing page, 12px below. Small (0.875rem) Quiet Grey text led by a 500 weight Ink lead-in ending in a full stop ("Exchanges."), then the terms in plain sentences.
- **Size table:** on the landing page the size chart is a Panel Grey 2xl table, at most 24rem wide: Quiet Grey 0.875rem column heads, rows split by Hairline, size in 500 weight, chest right-aligned and tabular.

### Disclosure (details accordion)
Native details elements, so they work before JavaScript. Summary rows are at least 56px, 500 weight, with a Lucide chevron in Quiet Grey. Rows are ruled by Hairline top, bottom and between. The size guide is the same pattern inside a Panel Grey xl panel with a 44px summary. The landing FAQ is the same pattern under a Display heading, in a 48rem column, answers in Body Reading capped at 52ch (about 65 characters, since Geist's ch is wide).
- **Motion:** the panel's height slides open over 320ms and closed over 240ms on cubic-bezier(0.32, 0.72, 0, 1); the chevron rotates 180 degrees on the same curve and turns back the moment closing starts. Under reduced motion the panel opens and closes instantly.

### Product Card
A whole-card link: 4:5 photo at 2xl radius on a Panel Grey placeholder, then title (0.9375rem, 500, balanced) and price or "Sold out" in Quiet Grey, tabular. Hover dims the photo to 90% opacity. The photo shares a view-transition name with the product page gallery so it morphs on navigation.

### Landing Hero
A centred text block above a photo mosaic of the lead line, with a glass colour picker floating on the main photo. Hero headline, a Lead line, the price in 500 weight tabular, then the shared pill and the "See the colours" quiet link side by side 24px apart. The text block has 32px above it and 24px below on phones (56px and 40px from 768px).
- **Phones:** the main worn photo alone, full bleed with square edges at 4:5, cropped from the top, Panel Grey behind it, loaded eagerly as the first-viewport image.
- **From 768px:** a 2fr/1fr grid inside the 72rem container, min(78vh, 52rem) tall with 8px gaps: the main photo spans both rows on the left, the side profile and the collar stack on the right. Every tile is 2xl radius on Panel Grey. The main photo's crop sits at 50% 60%, so the hem clears the picker.
- **Behaviour:** every photo is a link to the jacket shown. Choosing a colour swaps all three photos, which fade in over 500ms (no fade under reduced motion).

### Hero Colour Picker (signature)
The leather itself, as a radio group. A glass pill (the shared glass material, 1px Ink 8% edge, 4px padding, 16px on the right) centred 16px above the main photo's bottom edge (24px from 768px). It sits beside the photo's link, never inside it, so choosing never opens the jacket.
- **Swatches:** three 44px round radio targets, each holding a 32px circular swatch. The swatch is the product's flat-lay photo enlarged five times onto the left chest panel, so it shows leather only.
- **Selected / unselected:** selected takes a 2px Ink ring at 2px offset; unselected a 1px Ink 10% ring at the same offset. Keyboard focus draws the global Ink outline around the 44px target.
- **Name:** the chosen colour's name follows the swatches in Small 500 Ink, held at a fixed minimum width so the pill does not jump between names.

### Colour Cards
The lead line's colours in a row of three, right under the hero: a centred Display heading ("Three colours.") with a Body line in Quiet Grey, then a three-column grid (8px gap, 20px from 768px). Each card is a whole-card link: a 4:5 photo at xl radius (2xl from 768px) on Panel Grey, then the colour name in 0.875rem 500 Ink and a stock line ("S, M, L in stock" or "Sold out") as Caption in Quiet Grey, both one step larger from 768px. The photo shares the product card's view-transition name, so it morphs into the product page gallery; hover dims it to 90%.

### Story Section
One doubt answered per screen: a centred Title, Lead copy in Quiet Grey, then the proof beneath, either a photo or a Panel Grey block (size table, payment panel). Photos are 4:5 at 2xl radius on phones; from 768px they crop to 16:10 with the focus 30% from the top, or keep the whole portrait photo when the proof sits at its edges.

### Line Tile
A Panel Grey card at 2xl radius pointing to another line: a centred Display heading, a Body line in Quiet Grey, the price in 500 weight tabular, the shared pill, then a 5:4 photo at xl radius inset 20px from the tile's sides and bottom. 40px of top padding. No border, no shadow.

### Breadcrumbs
Where the page sits in the shop, on the product and collection pages: Home, then the collection, then the page. Small text; earlier crumbs are Quiet Grey links that turn Ink on hover, split by a 14px Lucide chevron at 1.6 stroke in Quiet Grey, and the current page ends the trail in 500 Ink. From 768px the trail leads the page, top left in the content column, 24px below the header. On phones it closes the page instead, ruled by a Hairline on top, 20px of padding, sitting directly on the footer rule, so the first screen stays the product's. A BreadcrumbList in JSON-LD carries the same trail for search.

### Cart Drawer
The cart over the page, so Add to cart never leaves the product (behind the cartDrawer flag, on by default; the cart page remains, and is where the icon goes before JavaScript loads). A native modal dialog sliding in from the right over 320ms on cubic-bezier(0.32, 0.72, 0, 1), full height, at most 28rem wide (full width on phones), solid Paper over the page dimmed by Ink at 30%. It opens from the cart icon and after Add to cart, focused on its title rather than the close button; Esc, the close button, a tap outside or any link inside closes it, and focus returns to what opened it. Under reduced motion it appears without sliding.
- **Head:** a 64px row ruled by Hairline: "Cart" in Headline, a 44px close icon button.
- **Lines:** Hairline-split rows with 16px vertical padding: a 64px 4:5 thumbnail at xl radius, the title (Label, balanced, a link), the size and quantity in Small Quiet Grey, the line total in Small 500 tabular, and a Trash remove button at the right.
- **Foot:** ruled by Hairline: Subtotal in 500 with the figure in 1.125rem semibold tabular, the cash-on-delivery note in Small Quiet Grey (what to send now, the delivery fee, and that bank transfer delivers free), the Checkout pill full width at 56px, then a quiet "View cart" link in Small Quiet Grey, 44px tall, that turns Ink and underlines on hover.
- **Empty:** "Your cart is empty" in 500 and the shared pill to all products.

### Photo Viewer
Every gallery photo opens a full-screen native modal dialog at that photo. Solid Paper edge to edge, fading in and out over 220ms (instantly under reduced motion); the page behind cannot scroll. It opens focused on its (visually hidden) title, and focus returns to the photo on close.
- **Top bar:** "N of M" in Small Quiet Grey tabular on the left, a 44px close icon button on the right; 56px tall on phones, 64px from 768px.
- **Photos:** whole, never cropped, in a horizontal snap track. While the sharp copy loads, the smaller copy the gallery already loaded fills in behind it.
- **Phones:** swipe, with the 2px segmented indicator of the gallery beneath, above the safe-area inset.
- **From 768px:** 48px round Panel Grey arrow buttons on either side (Press Grey on hover, faded to 30% at either end), arrow keys, and a centred row of 48px 4:5 thumbnails at lg radius, the current one ringed 2px Ink at 2px offset.

### Gallery Indicator
A 2px segmented bar along the photo's bottom edge on phones, one segment per photo with 2px gaps; the current segment is Ink, others Ink at 30%. Colour changes over 300ms. Hidden from 768px, where photos are a grid.

### Navigation
A full-width sticky glass bar (the shared glass material), 48px tall on phones and 52px from 768px, seated by a 1px rule of Ink at 8%. Three columns: "Shop" on the left (Small, Ink, so it holds its contrast over dark leather passing beneath; 44px tall with a Press Grey pill bubble on hover), the KLAEV wordmark centred (with left padding equal to its tracking, so the word sits on the true centre), and the cart icon button on the right. The cart count is an 18px Ink pill with a white 0.6875rem semibold tabular figure at the bag's top right. The header is excluded from page transitions so it never flickers.

### Store Pages
The store's own words (About, Contact, the size chart, the policies), in Read mode like a journal article: a 42rem column with the breadcrumbs (Home, the page) top left from 768px and closing the page on phones, the title in Title (balanced), an optional Lead in Quiet Grey (pretty wrap, any link in it Ink and underlined), and on a policy a "Last updated 12 March 2026" line in Small Quiet Grey. The body is the journal's Article text through the shared renderer, links included.
- **Contact:** the form beneath the Lead, its parts 20px apart: storefront fields at 48px with Labels (Name; Mobile number and Email side by side from 640px, then "One is enough" in Small Quiet Grey), the subject as chips, a five-row message field at least 128px tall that resizes vertically, then the shared black pill ("Send message", "Sending" on Panel Grey while it goes), full width on phones and its own width from 640px. Sent, the form gives way to a Panel Grey 2xl panel with 24px padding: the thanks in 1.125rem 500, then a Body Quiet Grey line with the WhatsApp link. The panel takes focus and is announced.
- **Subject chips:** a radio group as 44px full pills, 1px Outline Grey border on Paper, 16px side padding, Small Ink. The chosen one takes an Ink border and a 1px Ink ring, as a size card does; keyboard focus draws the global Ink outline.
- **Size chart:** one section per line, 40px apart: the line's name in Headline, its jackets as underlined links in a Small Quiet Grey line, the size table on a Panel Grey 2xl panel (16px by 8px), then the guide's note in Small Quiet Grey. The table is the size guide's: Small tabular, Quiet Grey heads over an Outline Grey rule, rows split by Hairline, the size in 500.

### Footer
Panel Grey ground with a Hairline top rule, Small Quiet Grey text, 40px of vertical padding inside the 72rem container. Four columns from 768px: the brand (the wordmark, the line "Real leather. Made in Pakistan, delivered across Pakistan." and an About Klaev link), Help (Track your order, Size chart, Contact, WhatsApp and the email address), Policies (Delivery, Exchanges and refunds, Privacy, Terms) and More (Journal, Instagram). On phones it is two columns, the brand across both above Help and Policies, then More; columns sit 24px apart and rows 32px. Column labels are 500 Ink over links 8px apart in Quiet Grey that turn Ink and underline on hover. On a phone page with a fixed bottom bar it holds a 7rem reserve below its last line, so the bar never covers the footer and the page ends on Panel Grey.

### Admin Sidebar
The console's shell, from the shadcn sidebar in its inset form. Panel Grey, 16rem wide, holding the Paper work sheet beside it.
- **Head:** the Admin Wordmark with "Admin" in Small Quiet Grey on its baseline, a link to the dashboard, 16px in from the sides.
- **Places:** laid out like Shopify's admin, so it feels familiar: Home, Orders, Products, Customers, Messages, Discounts, Content, Analytics and Settings, each a 32px row at md radius with a 16px Lucide glyph at 1.8 (Home, ShoppingBag, Package, Users, Inbox, BadgePercent, FileText, BarChart3, Settings) and a Small label. Hover washes the row Selected Grey; the current place keeps that wash and turns 500. Orders carries the count of orders waiting on you (to confirm and to ship together) at its right edge in Caption 500 tabular, no fill, hidden at zero; Messages carries its count of messages waiting the same way.
- **Sub pages:** a section's own pages show beneath it only while you are in it: Orders holds Create order and Abandoned checkouts; Products holds Collections and Inventory; Content holds Journal, Pages and FAQ; Analytics holds Live view, Funnel and Reports. They are 28px rows at md radius in Small, no glyph, indented 14px behind a 1px Hairline rule, Selected Grey on hover.

**The One Highlight Rule.** The sidebar marks exactly one place per page: the sub page you are on, or else, when no sub page matches, the section itself. A section and its sub page are never washed together, and the highlighted row carries aria-current="page".
- **Foot:** View store (opens the store in a new tab, ExternalLink glyph) and Sign out (LogOut glyph), in the same row style.
- **Behaviour:** offcanvas. The page header's toggle slides it out over 200ms and back; below 768px it opens as an 18rem sheet over the page.

### Page Header
The top of every console page: the sidebar toggle (a 28px ghost icon button), a 16px vertical rule, the Admin Page Title, and the page's controls on the right. The order page's title is a row of its own: a back link ("Orders" with a ChevronLeft, Quiet Grey turning Ink on hover), the number in tabular figures, its status badge and its payment badge.

### Admin Actions
Three kinds, and one primary per view.
- **Primary:** the shadcn button in Ink with a Paper on Ink label in Small 500, 32px tall, 10px side padding, lg radius; 80% Ink on hover; half opacity when disabled, its label turning to the pending verb ("Saving"). It is the Update status trigger on an order, Save on the courier settings, and a dialog's confirming action.
- **Outline:** the same button on Paper with a 1px Outline Grey border, Panel Grey on hover: a dialog's dismissal, and "Nothing left to do" (disabled) once an order is finished.
- **Quiet pill:** shared from `lib/styles.ts`. Panel Grey ground, Ink label in Small 500, 40px tall, 16px side padding, full pill, an 8px gap for a leading 16px glyph; Press Grey on hover, 0.98 on press; Quiet Grey label when disabled. Every secondary action that is a button: WhatsApp the customer, Copy all for PostEx, Record payment, Save note, a product's stock Save (disabled until a number changes), Open the PDF receipt. The pager uses it at 36px.
- **Ghost:** the shadcn ghost button, 28px tall, md radius, 10px side padding, no ground until hover washes it Panel Grey. A card's header action ("Edit" on Customer, Shipping, Contact and Notes; "Edit items", "Exchange a size", "Packing slip" and "Invoice" on Items) and the quiet way to remove something from a page ("Remove" a cover, "Delete article"), each opening a dialog or, for print, a new tab. Its 28px square form, with a 16px glyph at 1.8, is the icon action inside a repeated item (remove, move up, move down).
- **Text link:** "View all", "All stock", "Open full size", "Clear search": Small 500 Ink, underlined on hover at a 4px offset.

### Row Actions
A table row with one action shows it in place (an abandoned checkout's WhatsApp follow-up). A row with more than one puts them in a menu: a 28px ghost icon button at the row's end holding a MoreHorizontal glyph at 1.8, named "Actions for <the row>", disabled while an action runs. The menu is the admin menu (Paper, lg radius, Ink 10% ring) aligned to the button's end, at least 10rem wide. Items that need more open a dialog and end in an ellipsis ("Edit…", "Remove…"); ones that need nothing act at once ("Turn off", "Turn on"). Removal sits last under a rule, and is offered only while it is allowed (a code no order has used). The dialog opens as the menu closes, and closes itself once the change went through.

**The One Menu per Row Rule.** Once a row has more than one action, every one of them goes in its single "⋯" menu; a row never shows two buttons side by side.

**The One Black Primary Rule.** Each admin view has exactly one Ink button: on an order, the Update status trigger in its header; on a form, its Save. Everything else steps down to a quiet pill, an outline button or a text link. Inside a dialog the confirming action is the one Ink button, and the menu that opened it is closed.

### Admin Fields
The storefront field at working density: 40px tall, xl radius, 1px Outline Grey border on Paper, 12px side padding, Small text, Quiet Grey placeholders. Labels sit above in Small 500, 6px apart; hints below in Caption Quiet Grey. Money and counts are tabular; stock counts are 64px wide and centred, their size label centred above in Caption Quiet Grey, a size at zero set in Quiet Grey. The note field is the same box, three rows, at least 80px tall, resizing vertically. The orders search sits in the page header at 36px and 18rem, a 16px Search glyph inside at the left.

### Badges
State without hue, from the shadcn badge: 20px full pills, Caption 500, 8px side padding, a 12px Lucide glyph at stroke 2 where one helps.
- **Ink (needs you):** To confirm; Receipt in, with a FileCheck glyph, beside To confirm in the table once a receipt has come; a shipped order whose courier status is Delivery attempted or Coming back; a customer who has refused a delivery ("Refused a delivery", "Refused 2 deliveries"), with a TriangleAlert.
- **Panel Grey (moving):** Confirmed, Packed, Delivered (with a Check), Paid (with a Check); a Repeat customer; an Active discount code; a Published article.
- **Outline (out of your hands, or over):** a 1px Outline Grey border on Paper. In Ink text: the courier statuses of a shipped order on its way (Booked, In transit, Out for delivery), With courier (with a Truck), Advance in, Part paid, a First-time customer, a Scheduled code or article, a Draft article, Messaged on an abandoned checkout, and a message's subject (A question, An order, A custom jacket, An exchange). In Quiet Grey text, because it is over: Cancelled, Refused, Unpaid, a Lapsed customer, No orders, a code that has Ended, is Used up or is Off, and a store page still Original.
- **Status of a shipped order:** once shipped, the status badge names where the parcel is (the courier status set by hand) instead of "Shipped".
- **Customer segments:** a customer's badges sit in a row 6px apart: the refusal first, then Repeat or First-time, then Lapsed or No orders.
- **Trend:** on a KPI card, an outline badge with a TrendingUp or TrendingDown glyph and the change in tabular figures ("+12%").
- **Draft:** an outline badge in Quiet Grey beside the name, on the products list, the stock list and the journal alike.

**The Three Fills Rule.** A badge says who holds the order by its fill alone: Ink when it waits on you, Panel Grey while it moves, outline when it is in someone else's hands or over. No badge takes a hue, and glyphs mark only Paid, Delivered, With courier, Receipt in, a refusal and a trend.

### Admin Cards
The shadcn card: Paper, xl radius, a 1px ring of Ink at 10%, no shadow, 16px padding and 16px between its parts, Small text. A header holds the Admin Card Title, a Small Quiet Grey description beneath, and an action at its top right (a text link or a badge). A card holding a table or a list runs it edge to edge, its rows padded 16px at either end.

### KPI Cards
One card, shared by the dashboard and Analytics. Four on the dashboard: Sales, Orders, Cash with the courier, and Profit. Each is the label in Small Quiet Grey, the figure in Admin Figure, an outline trend badge against the previous period at the top right (on Sales and Orders, when the previous period had any), and a note line in Small Quiet Grey (last period's figure, the average order, what the courier should pay out after its tax, or what the profit leaves out). Analytics' overview carries six (Sales, Orders, Average order, Visitors, Conversion rate, Returning customers), each noting the period before; a trend badge shows only where the period before had any, and rates carry none. Live view carries four with no trend: Visitors right now, Carts open, Checkouts in progress, Orders today.

### Period Control
The 7, 30 and 90 days in a page header (the dashboard, the Analytics overview, Funnel, and Reports except Profit, which lists every month), as links in a segmented control: a Panel Grey track at lg radius with 2px padding; each segment Small Quiet Grey at md radius, 4px by 12px, turning Ink on hover; the chosen one Paper, 500 Ink, ringed 1px Ink at 10%. The period lives in the address, so a view can be shared.

### Trend Chart
One figure per day in an area chart (Sales on the dashboard; Sales and Visitors in Analytics), 256px tall, the full width of its card, one series only. The line is Chart One (Ink) at 1.5px over a wash of the same at 6%. Horizontal grid lines only, in Outline Grey at half strength; axes without lines, ticks in Caption Quiet Grey, the value axis in thousands ("12k", "2.1M"). Today is still going, so its stretch (from yesterday's point to today's) sits in a solid Panel Grey band, drawn above the grid and beneath the line and its wash, and its tick reads "Today", so a low point there never reads as a collapse. The tooltip names the day ("Today so far" for today), the point's detail in Quiet Grey ("3 orders", "41 visits") and the figure in 500 tabular, in PKR for money.

### Needs Action
The dashboard card of what waits on you, beside the chart. Its description says "Waiting on you", or "All caught up." when every count is zero. Rows link to the matching status tab: To confirm (with how many have a receipt in), To ship, Out for over 5 days, Payouts to record. Each row is lg radius, 10px by 8px, Panel Grey on hover: the count (600, 1.125rem, tabular, 2rem wide), the label in Small 500 with its detail in Caption Quiet Grey beneath, and a 16px ArrowRight in Quiet Grey. A row at zero dims to Quiet Grey and its count drops to 400, so what needs you stands out without a colour.

### Recent Orders and Running Low
Recent orders is the orders table in its compact form (no Items column, no method, no money bar) in a card whose header carries "View all". Running low lists sizes on their last piece, up to eight: the product title with ", size" in Quiet Grey, and "1 left" in 500 at the right; then how many sizes are sold out in Small Quiet Grey. Its header carries "All stock".

### Status Tabs
The orders page's tabs are links, so each tab has its own address: All, To confirm, To ship, Out for delivery, Payout due, Delivered, Cancelled. Each is Small Quiet Grey at lg radius, 6px by 12px, Panel Grey and Ink on hover; the current tab is Panel Grey, 500 Ink. Each carries a count chip in Caption tabular at md radius, Panel Grey, turning Paper on the current tab so it holds against the wash. The row scrolls sideways on a phone. Queues (To confirm through Payout due) list the longest-waiting order first. An empty tab says in one centred Small Quiet Grey line what lands there ("Nothing to ship. Confirmed orders wait here for their tracking number.").

### Orders Table
The shadcn table in a card, rows ruled by Hairline, Panel Grey at 50% on hover. Heads are 40px, Small 500 Ink; cells are 8px, with 16px at the table's two ends. The whole row is the link to the order (its number link stretches over the row).
- **Order:** the number in 500 tabular, the date and time in Caption Quiet Grey beneath.
- **Customer:** the name in 500 with the city in Caption Quiet Grey beneath, both truncated at 12rem.
- **Items:** "2 items" in Quiet Grey, from 768px.
- **Payment:** a 9rem stack of the payment badge with the method beside it in Caption Quiet Grey ("COD", "Bank transfer"), and the money bar beneath.
- **Status:** the status badge, with Receipt in beside it while confirming.
- **Total:** right-aligned, 500 tabular.
- **Phones:** below 640px Payment and Status drop; the status badge moves under the customer's city instead.
- **Pager:** under the card when there are more than 25: "1 to 25 of 140" in Small Quiet Grey tabular at the left, Previous and Next as 36px quiet pills at the right.

### Order Summary Card
The first card on an order. A line in Small Quiet Grey with the customer's name in 500 Ink, then city, when it was placed and how it is paid; the total at the right in 600, 1.25rem, tabular. Beneath, the money bar at 8px with its legend in Caption Quiet Grey tabular: what was received (figure in 500 Ink), what is at the door or with the courier and about how much of it the courier keeps as tax, what the courier kept once recorded, or what is still due. Then the stepper.

### Order Stepper
Where the order is, in equal columns: Placed, Advance in (or Paid when prepaid), Packed, Shipped, Delivered, and Paid out on cash on delivery. Each step is a 24px circle joined to the next by a 1px rule, Ink between done steps and Outline Grey after.
- **Done:** an Ink circle with a 14px Paper Check, its label in 500.
- **Next:** a 2px Ink ring, its label in 500, "Next" beneath.
- **Waiting:** a 1px Outline Grey ring, its label in Quiet Grey.
- **Ended:** a cancelled or refused order stops at the step it reached and ends on an Ink circle with an X, labelled Cancelled or Refused.
- Labels are Caption on phones, kept whole; from 640px they are Small, truncated, with each step's date beneath in Caption Quiet Grey tabular. A step counts as done once it or any later step happened.

### Update Status and Dialogs
The one control that moves an order on, at the right of its header: the Ink primary labelled "Update status" with a ChevronDown. It opens a menu (Paper, lg radius, at least 16rem, aligned to its right edge): "Next step" as a Caption label over the next step in 500, labelled with the money it records where it records any ("Confirm, PKR 3,000 received", "Mark delivered, PKR 9,000 collected"); then other steps; then, under a rule, the ways out (Cancel order, Refused at the door). A step that needs details ends in an ellipsis and opens a dialog; one that needs nothing happens on the spot. The outcome is said beside the trigger in a Small line.
- **Dialogs:** Paper, xl radius, 16px padding, at most 24rem wide, an Admin Card Title and a Small Quiet Grey description of what will happen, then admin fields, focused on the first. Ship asks for the tracking number and the courier's charge; Courier payout for the amount paid out, saying live what the courier kept as tax; Advance for the advance. The footer is a Panel Grey 50% strip under an Outline Grey rule, its actions at the right: the dismissal as an outline button, then the Ink confirmation. An error is a Small Signal Red line above the footer.

**The Not Now, Keep It Rule.** A dialog that only gathers details is dismissed with "Not now": the step waits for later. A dialog that asks before undoing (Cancel order, Refused at the door) is dismissed with "Keep it", and its confirmation says the act in full ("Yes, cancel it", "Yes, it was refused"), so the safe answer never reads like the destructive one.

### Order Tabs
Overview, Payments and History, as shadcn tabs: a 32px Panel Grey track at lg radius with 3px padding, triggers in Small 500 at 60% Ink, the current one on Paper in full Ink.
- **Overview:** while confirming, a Receipt card whose description says in 1rem Ink what the receipt should show (the figure in semibold); the newest receipt image at the card's width on Panel Grey at 2xl radius, capped at 52% of the screen's height with a 96px Panel Grey fade when cut, "Open full size" and earlier receipts as links beneath; a PDF receipt as a quiet pill; no receipt as a Panel Grey xl note. Then Items: 48px thumbnails, title in 500, size in Quiet Grey, line totals tabular, and the totals as a Hairline-ruled two-column list with Total in 600. The side column holds Customer (name, phone, email, address, and the WhatsApp quiet pill), Parcel details while the order is live (term in Quiet Grey in a 7rem column, the value, a copy button per row, and Copy all for PostEx), and the Note.
- **Payments:** Money and Profit as Hairline-ruled two-column lists, their bottom lines in 600, figures not yet known in Quiet Grey; then Payments as dated lines with figures in 500 tabular, and "Record a payment" as a 40px disclosure holding its form.
- **History:** every event oldest first, Hairline-ruled, the date and time in an 8rem Quiet Grey tabular column.

### Order Cards: Items, Size Exchange, Customer
- **Items actions:** the Items card's header holds its actions as ghost buttons: Edit items while the order can still change, Exchange a size once delivered, then Packing slip and Invoice, which open the print page in a new tab. An exchange's free line reads "Exchange" in Quiet Grey where its price would be; a discount reads "Discount CODE" with a "−" figure in the totals.
- **Edit items:** a dialog widened to 32rem: one repeated item per line (title in Small 500, a ghost X to take it off, then size and quantity fields side by side, each size naming what is free to sell), an "Add a jacket or belt" select with an outline Add button, then "Not now" and "Save items".
- **Exchange a size:** a dialog: the jacket (a select when there are several), the new size (only sizes in stock) beside an 8rem Delivery charge field, and a Caption Quiet Grey note on who pays it. If every other size is sold out, a Panel Grey xl note says so and "Send the new size" stays disabled.
- **Size exchange card:** on both linked orders, after Items. In Small: "Replaces #1040: size M comes back, size L goes out." on the new order, with a Quiet Grey line saying whether the old jacket is back; "Exchanged on #1041, shipped" on the old one, the status in Quiet Grey. Linked numbers are 500 Ink, underlined on hover. Until the old jacket is back the header carries an outline "It's back", whose dialog confirms "Yes, back in stock".
- **Customer card:** the name in 500 with the customer's history on its baseline at the right, a Small Quiet Grey link to their page ("First order", "3 other orders") that turns Ink and underlines on hover. If they have refused a delivery before, a warning strip follows the name: Ink at lg radius, 6px by 10px, a 16px TriangleAlert at 1.8 and "Refused a delivery before" in Small Paper on Ink. It is the admin's one Ink block of text, because a cash on delivery order to them is worth a call before it ships.

### Money Bar (signature)
Every order's money as one bar: in each table row (6px) and in the order's summary card (8px). A full-round track on Panel Grey with an inset 1px ring of Ink at 10%. Four marks:
- **Received:** Ink, from the left, as wide as what has come in, rounded.
- **At the door (cash on delivery, not yet settled):** hatched from the advance, or from what has come in if more did, to where the tax begins: 1.5px Quiet Grey stripes every 4px at 135 degrees, at 60%.
- **The courier's estimated tax:** the last stretch of the door share, its tax percent from Settings, in Quiet Grey at 30%, faint because it is an estimate.
- **Recorded tax:** once a payout records what the courier kept, solid Quiet Grey at the end.
- A cancelled or refused order shows no door share. Anything else still due is left open on the track. The bar carries the same as its accessible name ("PKR … of PKR … received, PKR … to collect at the door, about PKR … of it kept by the courier as tax").

**The Hatch Means the Door Rule.** Hatching is the money bar's mark for cash the rider still has to collect, and nothing else in the system is hatched.

**The Faint Means Estimate Rule.** In the money bar, Quiet Grey at 30% is a figure not yet known for sure; once it is recorded it turns solid.

### Admin States
- **Feedback:** beside or under the action that caused it, a Small line: Quiet Grey for what was done, announced as status; Signal Red for what went wrong, announced as an alert. The Red Line Rule holds: no red borders, fills or icons, and no destructive-coloured button.
- **Copied:** Copy all for PostEx swaps its glyph for a Check and its label to "Copied" for 2 seconds; a row's copy button does the same in place.
- **Empty:** a card holds one Small Quiet Grey line saying what will appear there ("No orders yet. They appear here the moment one is placed.").
- **Pending:** the acting button turns to its verb ("Saving", "Recording") and disables.

### Stock List
An intro line in Small Quiet Grey, then one card of products, rows split by Hairline, 12px by 16px: a 48px 4:5 thumbnail at lg radius on Panel Grey, the name in 500 (with the Draft badge where it applies) over "N in stock" or "Sold out" in Small Quiet Grey tabular, then a field per size and the Save quiet pill. On phones the fields wrap onto the row's second line.

### Customers
The customer list is the orders table's language: the segment tabs (All, First-time, Repeat, Lapsed, Refused a delivery) are status tabs with count chips, and each row is a whole link: the name in 500 with the phone (or email) in Caption Quiet Grey tabular beneath, both truncated at 14rem; the city in Quiet Grey from 768px; the segment badges from 640px (under the name on phones); orders and money spent right-aligned and tabular; the last order date in Quiet Grey tabular from 1024px.
- **Customer page:** the header title is the back link, the name and the segment badges. The figures card, then Orders: its header ruled by Hairline, with a Small Quiet Grey line counting refusals and cancellations; the last 15 orders in a table (number in 500 tabular over the date, status badge, method and item count in Quiet Grey, total in 500 tabular, struck through in Quiet Grey when cancelled), and beneath, ruled by Hairline, "All 22 orders" as a text link. Contact holds the phone, the email as a Quiet Grey link, the address in Quiet Grey and the WhatsApp quiet pill; Notes holds the note (Quiet Grey "No notes." when empty) and the tags. Each card's ghost Edit opens its dialog.

### Abandoned Checkouts
One table card: the customer (name in 500, phone and city in Caption Quiet Grey tabular), the cart from 768px, its value right-aligned tabular from 640px, how long ago they left in Quiet Grey tabular, and the follow-up at the row's end. The follow-up is the row's one action, so it stays in place: a 36px quiet pill with a MessageCircle, "WhatsApp". Once sent it steps down to no ground with a Quiet Grey label ("Message again"), and the row gains an outline "Messaged" badge.

### Discounts
A table card of codes: the code in 500 at 0.025em tracking with its conditions beneath in Caption Quiet Grey ("10% off the items, orders of PKR 15,000 or more, once per customer"), the status badge, the dates in Quiet Grey from 768px, uses and money given off right-aligned and tabular from 640px, and the row's actions menu (Edit…, Turn off or Turn on, and Remove… while unused). "Create code" is the page's Ink primary, in the header, opening the code dialog. With no codes, the card holds a 500 line and a Small Quiet Grey suggestion, 32px by 24px.

### Create Order
A sale taken on WhatsApp, Instagram or in person. Items: repeated items with size, quantity and price-each fields side by side (prices start at the store's and can be typed over), and the add select with an outline Add. Payment: three admin choice cards in a row from 640px (Cash on delivery, Bank transfer, In person), each xl radius, 1px Outline Grey border, 10px by 12px, a Small 500 title over a Caption Quiet Grey note; the chosen one takes an Ink border and 1px Ink ring, as the storefront's choice cards do. Discount, delivery and advance fields follow, then a Panel Grey xl summary (16px padding, Small tabular, labels in Quiet Grey, Total in 500, then what the rider collects), and a 16px checkbox in Ink with a 500 label and a Caption Quiet Grey line on what it records. The side column ends on "Create order", the Ink primary at 40px across the column, with a Caption Quiet Grey line saying what is still missing.

### Settings and Content Editors
- **Settings forms:** each card's fields in two or three columns from 640px, 16px apart, labels above and hints below; the Save row 20px beneath, the outcome said beside the button in a Small line (Quiet Grey for done, Signal Red for wrong). Store details is a read-only list, terms in a 10rem Quiet Grey column.
- **FAQ editor:** the home page questions as repeated items in their order: the question field in 500, then ghost icon buttons to move it up or down (disabled at the ends) and to remove it; the answer as a three-row field beneath. Under the list, "Add a question" as an outline button with a Plus, then Save.
- **Page editor:** the SaveForm pattern of the article editor: the header's back link to Pages, a Small Quiet Grey "View on the store" link and the Save beside it; the Title field, then the Page field at 24 rows, 0.9375rem and relaxed leading, resizing vertically, its Caption Quiet Grey hint naming the blocks, the link format and the term placeholders. The side column's Search engine listing card names the page's address and holds the description. An edited page offers "Put back the original" as a ghost button, through a dialog dismissed by "Keep my edits".
- **Pages list:** one table card, each row a whole link: the title in 500, the address in Quiet Grey from 640px, and at the right "Edited 12 Mar 2026" in Small Quiet Grey tabular or an outline "Original" badge in Quiet Grey.
- **Article editor:** the fields sit across the cards and save together from the header's Save; once live, a Small Quiet Grey "View on the store" link sits beside it. The Article field is 18 rows at 0.9375rem and relaxed leading, its hint naming the three blocks the body knows. The search listing card previews the result in an xl box with a Hairline border. A cover is replaced by upload and removed through a "Keep it" dialog; Delete article sits alone at the foot of the side column.

### Analytics
How the store did, in the dashboard's materials. Every table here is a report table and every share a bar.
- **Report table:** the orders table's language in a card whose header is ruled by Hairline: Admin Card Title, a Small Quiet Grey note, and a "CSV" ghost button with a 16px Download glyph at the top right when there are rows. Heads are Small 500 Ink; the first column is the name in 500, truncated at 18rem; every other column is a figure, right-aligned and tabular, 16px in from the card's edges. A cell with nothing in it reads "None" in Quiet Grey. Rows ruled by Hairline; heads take no hover wash. An empty table is one centred Small Quiet Grey line, 32px tall either side.
- **Share bar:** a 6px full-round Panel Grey track, the share in Ink from the left. Under each source's name in Where visits come from, and under each device's line (the share, then its visits in Quiet Grey) in Devices.
- **Funnel:** the steps from a visit to a delivered order in one card, 16px apart. From 640px each step is a row: the label in Small 500 in a 14rem column, a 10px Ink bar on its Panel Grey track as wide as the step's share of visits (at least 1% when any), then a 9rem column, right-aligned: the count in 600 tabular over "62% of previous" in Caption Quiet Grey. On phones the bar drops under the label and figure, across the row.
- **Report tabs and inbox tabs:** Reports' Sales, Customers, Behaviour, Operations and Profit, and Messages' Waiting and Handled, are status tabs without count chips: links, Small Quiet Grey at lg radius, 6px by 12px, the current one Panel Grey in 500 Ink. The report tabs scroll sideways on a phone.
- **Live view:** the same page with "Updates every 10 seconds" in Small Quiet Grey at the header's right. It reloads its figures every 10 seconds while the tab is in view, and at once when the tab comes back; nothing on screen animates when it does. Today's orders are action rows (lg radius, Panel Grey on hover): the number in 500 tabular with the name in Quiet Grey, the city and how long ago in Caption Quiet Grey beneath, and the total over the status badge at the right. Cities now and Campaigns are Hairline-ruled two-column lists.

**The No Sideways Table Rule.** A report table fits a phone by dropping its secondary columns below 640px (or 768px), never by scrolling sideways: the name and the one figure that answers the question stay, the rest come back with the room. Figures are always right-aligned and tabular, so a column of money reads down.

### Messages
The contact form's inbox, waiting first and newest first. Each message is an admin card (16px padding, 24px sides from 768px, 12px between its parts): the name in 500 with the subject as an outline badge beside it, how long ago at the right in Small Quiet Grey tabular; the phone and email in Small Quiet Grey tabular; the message at 0.9375rem and relaxed leading, its line breaks kept, capped at 70ch; then the replies as quiet pills at 36px with a 16px glyph ("WhatsApp Ali" with MessageCircle, "Email Ali" with Mail) and "Mark handled" (or "Move back to waiting") as a ghost button opening a dialog. No message is Ink: waiting is said by the tab and the sidebar's count. With none, a card holds a 500 line and a Small Quiet Grey line, 32px by 24px.

### Print Document
A packing slip or an invoice for one order, at /admin/print/<number> (?doc=invoice for the invoice) and, for every order waiting to ship, oldest first, at /admin/print. Black on white, square, 32px between its parts:
- **Head:** the KLAEV wordmark over the store's email and WhatsApp in neutral 600; at the right the document's name, the order number and the date and time, tabular. A 1px black rule beneath.
- **Parties:** two columns: Ship to (or Bill to) with the name in 600, the phone, address and city; Payment at the right with the method and, on a slip, what the rider collects ("Collect PKR 16,899", or "Nothing to collect"), on an invoice what is still due or "Paid", then the tracking number.
- **Lines:** a full-width table, its head ruled in black, rows in neutral 300, 10px vertical padding: item (SKU beneath in Caption neutral 600), size, quantity; the invoice adds price and amount, right-aligned and tabular, and an exchanged line reads "No charge, exchange for #1040". A slip leads each line with an empty 14px square to tick when it is packed.
- **Close:** the invoice's totals in an 18rem column at the right (Subtotal, a discount as "−", Delivery, a black rule, Total in 600, Paid, the cash on delivery balance in 600); the slip's note, if any, in a neutral 300 box with 12px padding. The exchange terms end the page in neutral 600 under a neutral 300 rule.

**The Paper Copy Rule.** A printed document is black on white with no fill, no badge, no money bar and no radius. Hierarchy comes from weight and 1px rules alone, secondary text takes one grey, sizes come from the ramp, every figure is tabular, and each order starts a new page. A slip always states, in 600, what the rider collects.

### Admin Sign-in
The one admin page outside the console: no sidebar, a centred column at most 24rem wide, the storefront Wordmark over "Sign in to the admin" in Admin Title, then the storefront's 48px password field and full-width black pill, its error a Signal Red line beneath the field.

## Do's and Don'ts

### Do:
- **Do** keep the interface to Ink, Paper, the greys and Hairline; let the leather photographs carry all colour.
- **Do** use the black pill for the single primary action in a view, 48px tall on phones.
- **Do** set every PKR amount and measurement with tabular numerals, and show the cash-on-delivery split (advance now, balance on delivery) wherever a total is shown.
- **Do** keep sold-out options visible and disabled on a Panel Grey ground, never hidden.
- **Do** separate blocks with space (32px) and group related facts in a Panel Grey panel at 2xl radius.
- **Do** keep touch targets at 44px or larger and size cards at 64px or taller.
- **Do** honour reduced motion: view-transition animations drop to zero duration, and the checkout bar's crossfade, the hero's photo fade, accordion slides, the drawer slide and the viewer fade are all off.
- **Do** build forms from 48px xl-radius fields with the label above, and choices from whole-card radios in the size card language.
- **Do** state what to send now in the fixed bar of any page that takes an order, and change it the moment the choice changes.
- **Do** give any phone bar fixed to the bottom the `data-fixed-bar` mark, so focused fields scroll clear of it and the footer holds the bar's room; never pad the page itself for it.
- **Do** open overlays (cart drawer, photo viewer) as native modal dialogs focused on their title, and return focus to what opened them.
- **Do** keep glass to the shared material (Paper at 78%, blur 20px, saturate 1.8, Ink 8% edge) with its solid Paper fallback.
- **Do** build admin controls from the shared quiet pill and admin field in `lib/styles.ts` and the shadcn Button, Card, Badge, Tabs, Table, Dropdown Menu and Dialog in `components/ui`, on Klaev's tokens.
- **Do** give each admin view one black primary (the Update status trigger on an order, Save on a settings form) and make everything else a quiet pill, an outline button or a text link.
- **Do** draw an order's money as the money bar wherever the admin shows it, and set Lucide in the admin at 1.8 stroke (2 on 12 to 14px badge icons).
- **Do** say the outcome of an admin action in a Small line beside or under it, and ask in a dialog, dismissed by "Keep it", before anything that puts pieces back into stock.
- **Do** draw admin state in Ink, Panel Grey or outline only, and keep Ink for what waits on the owner: a pending order, a receipt in, a failed delivery attempt, a parcel coming back, a customer who refused a delivery.
- **Do** put a table row's actions in one "⋯" menu at its end once there is more than one, ending the items that open a dialog in an ellipsis.
- **Do** highlight exactly one place in the admin sidebar: the current sub page, or else its section.
- **Do** set every size from the ramp; the journal's long reading is Article (1.0625rem, line-height 1.625) in a 42rem column.
- **Do** print black on white: Small text, Caption heads, 1px black and neutral 300 rules, tabular figures, one order per page.
- **Do** right-align every figure in a report table, and drop its secondary columns on phones rather than let it scroll sideways.
- **Do** draw a share or a funnel step as an Ink bar on a Panel Grey track, and give each trend chart one series in Chart One.
- **Do** set a store page (About, a policy, Contact) as a 42rem Read-mode column: Title, optional Lead, Article body through the shared renderer.

### Don't:
- **Don't** add box-shadows or hover lift to any surface, or backdrop blur to anything but the header and the hero colour picker.
- **Don't** introduce a brand hue, gradient, coloured badge or marquee; Signal Red is for validation messages only.
- **Don't** use a dark, moody ground for the store; the user rejected it.
- **Don't** set headings, labels or buttons in letterspaced uppercase; that treatment belongs to the wordmark.
- **Don't** use a second typeface or a second secondary-text grey.
- **Don't** use urgency devices (countdowns, stock pressure, "selling fast") in the visual system.
- **Don't** turn an invalid field's border or ground red; the error line carries it.
- **Don't** add shadows to admin surfaces: ring the sheet in Hairline, and cards, menus and dialogs in Ink at 10%.
- **Don't** hatch anything but cash still to collect at the door, or give a badge or chart a hue the store doesn't have.
- **Don't** spend Ink on a state that is merely moving or finished, or show two action buttons side by side in a table row.
- **Don't** carry screen fills, badges, the money bar or rounded corners onto a printed document.
- **Don't** spend Ink on a label that only sorts: a message's subject is an outline badge.
