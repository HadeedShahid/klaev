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
rounded:
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
---

# Design System: Klaev

## Overview

**Creative North Star: "The Quiet Counter"**

Klaev is the category standard executed at Apple Store craft: a white room with a well lit counter, where one product is laid out, its price is stated once and clearly, and every choice is made in order. The system is deliberately colourless. White ground, soft grey panels and near-black ink are the whole palette; the leather photography supplies every warm tone on the screen, so nothing in the interface competes with the hide.

Density is calm and single-column on the phone (390px first). Content stacks in one column with generous 32px gaps between blocks; on wide screens the same column sits beside the photos as a sticky buy column. Form is soft and rounded: pill actions, rounded selection cards, rounded grey panels, with hairlines used to rule lists and to seat fixed chrome. Depth is flat, with exactly two pieces of frosted glass: the header and the hero's colour picker, both of which float over photography. Motion is functional only: the product photo morphs from its card into the product page, accordions slide open as their chevrons turn, the cart drawer slides in, buttons settle under the finger.

The interface earns trust with exact information rather than decoration. Money is always tabular, sizes are named by chest measurement, and payment is broken into what you send now and what you pay on delivery. The user rejected loud streetwear urgency, generic template looks, and dark, moody "leather brand" styling; the white ground is the answer to all three.

**Key Characteristics:**
- White ground, grey panels, near-black ink; the photography is the only colour.
- One typeface, Geist Sans, with large tight semibold headings and tabular numerals for money.
- Black pill for the one primary action per view.
- Rounded panels and selection cards; hairlines rule lists and seat fixed bars.
- No shadows. Depth comes from grey panels against white; glass is reserved for the header and the hero colour picker.
- Motion serves navigation and state, never ornament.

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
- **Wordmark** (600, 1.0625rem, tracking 0.28em, uppercase): the KLAEV wordmark in header (centred) and footer only.

### Named Rules
**The Tabular Money Rule.** Every PKR amount, size measurement and count is set with tabular numerals so columns of money align.

**The Wordmark Is the Only Spaced Caps Rule.** Wide letterspaced uppercase belongs to the KLAEV wordmark. Headings, labels and buttons stay in sentence case.

## Layout

Mobile first at 390px. Content sits inside a 20px side gutter (32px from 768px) and a 72rem maximum width; the cart narrows to 48rem. On phones the product page is one column: a full-bleed photo strip that swipes sideways with snap, then name and price, then the step-by-step blocks separated by 32px. The photo height is capped at the smaller of 125vw and the viewport minus 17rem so the name and price share the first screen.

From 768px breadcrumbs lead the product and collection pages, top left, 24px below the header, and the product page becomes a 7:5 grid with a 40px gap: photos in a two-column grid of 4:5 rounded tiles on the left, the buy column sticky at 80px from the top on the right. Product grids are two columns on phones (12px column gap, 32px row gap) and four from 768px (20px column gap).

Rhythm: 8px inside grids, 12px between a label and its control, 16px inside panels, 32px between blocks, 64px before a new page section. On phones the product and collection pages close on their breadcrumbs, which sit directly on the footer rule. The fixed buy bar respects the safe-area inset; the room it covers is held by the footer, not the page (below).

The landing page is a single centred column of sections. Text blocks are centred and capped narrower than the photos (42rem for headline and copy, 48rem for the hero text, 48rem for the FAQ); photos run to the 72rem container. Sections open with 64px of top space on phones and 112px from 768px (the colour cards row 48px and 64px, the line tiles 80px and 112px). Inside a section, headline and copy sit 12px apart and the photo or proof 24px below. The hero's main photo is the one full-bleed image outside the product gallery, on phones only; from 768px the hero becomes a mosaic inside the 72rem container (see Landing Hero). The two line tiles stack on phones and sit side by side from 768px with a 12px gap.

The checkout and order pages are one 36rem column (20px gutter, 32px from 768px), 32px below the header. Checkout groups its fields in sections 40px apart, 16px between fields inside a section, 6px between a label, its control and its hint or error line. The order page separates its sections by 40px. Checkout keeps 64px of bottom padding at every width; on phones the footer holds the fixed checkout bar's room, and from 768px the bar joins the column.

The sticky header (48px on phones, 52px from 768px) sets a 4.5rem scroll padding at the top of the document, and any phone page carrying a fixed bottom bar (Add to cart, Place order, each marked `data-fixed-bar`) sets 7rem of scroll padding at the bottom, so a field focused by keyboard or by script never lands under the header or the bar. The same mark gives the footer a 7rem reserve below its last line, so such a page ends on the footer rather than on an empty strip above it. In-page links (the hero's "See the colours") scroll smoothly unless reduced motion is asked for.

Touch targets are at least 44px (icon buttons, nav, size guide summary); the primary pill is 48px on phones and 56px when full width on desktop; size cards are at least 64px tall.

## Elevation & Depth

Flat, with two sanctioned pieces of glass. No surface in the system casts a shadow. Depth is tonal: Panel Grey blocks sit on white Paper, and the fixed buy and checkout bars are separated from scrolling content by a single hairline and a solid white ground. Selection is shown by outline weight, not lift. Overlays stay flat too: the cart drawer is solid Paper over the page dimmed by Ink at 30%, and the photo viewer is solid Paper edge to edge.

The exception is glass, and only on the two pieces that float over photography: the sticky header and the hero's colour picker. Both use one shared material: Paper at 78% behind blur(20px) saturate(1.8), edged with Ink at 8%. It turns solid Paper when the visitor asks for reduced transparency and where the browser cannot blur.

### Named Rules
**The Flat Counter Rule.** No box-shadow, no hover lift, and no backdrop blur except the shared glass on the header and the hero colour picker. Everything else stays flat: if something needs to stand apart, it gets a grey panel or a hairline.

## Shapes

Soft, consistent rounding derived from a 0.75rem base radius. Actions and round controls are full pills or circles. Selection cards and the size guide use the xl radius (1.05rem); content panels, product photos and card images use the 2xl radius (1.35rem). On phones the product gallery runs full bleed with square edges; it rounds to 2xl as tiles from 768px. Cart thumbnails are 4:5 at xl radius; the compact 48px order line thumbnails at checkout and on the order page are 4:5 at lg radius (0.75rem), the base radius, because xl reads as a blob at that size. Text fields and choice cards share the xl radius of the size cards. Product imagery in cards, the gallery and the colour cards is always 4:5. Landing photos are art-directed instead: the hero's main photo runs full bleed with square edges at 4:5 on phones, and from 768px every hero mosaic tile rounds to 2xl; story photos are 4:5 at 2xl radius on phones and either crop to 16:10 or keep the whole 4:5 photo (at most 36rem wide) from 768px; the line tile photo is a 5:4 crop at xl radius nested inside the tile's 2xl radius.

The glass colour picker is a full pill with 32px circular swatches; the photo viewer runs edge to edge with square corners, its thumbnails 48px wide at 4:5 and lg radius. The cart drawer is a full-height sheet with square corners; its line thumbnails are 64px at 4:5 and xl radius.

Borders are 1px. Outline Grey outlines interactive cards; Hairline rules lists. Lists of rows (details, cart lines) are ruled top and bottom as well as between rows.

## Components

### Buttons
Calm, solid and few.
- **Shape:** full pill (9999px).
- **Shared pill:** one class string in `lib/styles.ts` defines the black pill for links and buttons on the landing page, cart and not-found page. New surfaces reuse it rather than restating the classes.
- **Primary:** Ink ground, Paper on Ink label, 500 weight at 0.9375rem, 48px tall with 20 to 24px side padding; 56px tall and full width in the desktop buy column and the cart order action.
- **Hover / Active:** ground eases to 85% Ink; pressing scales to 0.98. Focus uses the global 2px Ink outline at 2px offset.
- **Disabled / Pending:** Panel Grey ground with Quiet Grey label (sold out, adding, placing order, uploading).
- **Quiet pill:** once its job is done a pill can step down to Panel Grey ground with an Ink label, Press Grey on hover, same size (the receipt upload becomes "Upload another"). It is never a second pill beside a black one.
- **Icon button:** 44px circle, Ink glyph (Lucide at 1.6 stroke), Press Grey wash on hover. Used for cart, close and remove. Remove is a Trash glyph (18px) in Quiet Grey that turns Ink on hover, on the cart page and in the cart drawer alike.
- **Text link:** underlined at 0.2em offset, 1px thickness, underline drops on hover.
- **Quiet link:** beside a pill (the hero's "See the colours", the order page's "Send it on WhatsApp"), Ink at 500 weight, 0.9375rem, 48px tall, a trailing Lucide chevron; underline appears on hover and the chevron nudges 2px right.
- **Alternative link:** under a full-width pill (the cart's "Send your order on WhatsApp"), Small Quiet Grey text, centred, 44px tall, no chevron; turns Ink and underlines on hover. The way out that is not the main path.
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

### Footer
Panel Grey ground with a hairline top rule; three columns from 768px. Wordmark, then "Help" and "Follow" labels in 500 Ink over Quiet Grey links that turn Ink and underline on hover. On a phone page with a fixed bottom bar it holds a 7rem reserve below its last line, so the bar never covers the footer and the page ends on Panel Grey.

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

### Don't:
- **Don't** add box-shadows or hover lift to any surface, or backdrop blur to anything but the header and the hero colour picker.
- **Don't** introduce a brand hue, gradient, coloured badge or marquee; Signal Red is for validation messages only.
- **Don't** use a dark, moody ground for the store; the user rejected it.
- **Don't** set headings, labels or buttons in letterspaced uppercase; that treatment belongs to the wordmark.
- **Don't** use a second typeface or a second secondary-text grey.
- **Don't** use urgency devices (countdowns, stock pressure, "selling fast") in the visual system.
- **Don't** turn an invalid field's border or ground red; the error line carries it.
