# Trailside booking flow — approved style (Nov 11, 2026)

Ben approved the five mobile purchase screens: **calendar, gear, agreement,
checkout, confirmation pass** (`4-calendar.jpg` … `8-pass.jpg`). Use this as the
spec when the real booking page (`book.html`, `js/booking.js`) is rebuilt.

Not approved: the Apple-style **home page** and **kit** desktop screens in the
same mockup. Don't reuse those layouts; the home page gets its own direction.

Source: `mockup.html` (open `mockup.html#calendar`, `#gear`, `#waiver`,
`#checkout`, `#pass`; render at 390×844, device scale 2).

## Feel

Apple-like iPhone checkout: calm, minimal, one decision per screen, big
clear type, everything tappable is soft and rounded, nothing decorative.
No eyebrow labels, no gradients on text, no icon-card grids, no emoji.

## Tokens

| Token | Value | Use |
|---|---|---|
| bg | `#FFFFFF` | groups, cards |
| bg2 | `#F3F3F1` | page background on phone screens |
| ink | `#15171A` | text |
| ink2 | `#5C6066` | secondary text |
| ink3 | `#8B8F95` | captions, group labels |
| line | `rgba(21,23,26,.10)` | dividers |
| accent | `#1D5C8A` | the only tap color (buttons, links, selected date) |
| go | `#2E7D4F` | available / done / on toggles only |
| low | `#C58A1A` | "a few left" dot only |
| radius | pill 980px · group 14px · field 12px · card 22px | |

Font: system UI stack on the live site (`-apple-system, BlinkMacSystemFont,
system-ui, sans-serif`) so iPhones show San Francisco. The mockup used Geist
as a stand-in. Never self-host Apple's SF fonts. Legal text stays
Times New Roman; auto-signature uses Homemade Apple.

Type: page title 34px/700, tracking -0.03em · body 17px · captions 13px ·
prices use tabular numbers.

## Components

- **Top bar:** 52px, back link in accent with chevron, centered title,
  translucent with blur (one of only two glass surfaces).
- **Step progress:** 4 thin rounded bars under the top bar.
- **Grouped list:** white rounded group on gray page, 56px rows, inset
  hairline dividers, gray group label above, gray footnote below
  (iPhone Settings pattern). Used for gear, damage cover, statements, summary.
- **Calendar:** month title + arrows in accent; dates as 36px circles;
  availability shown as a 5px dot under each date (green / amber / none);
  closed days struck through; selected start = filled accent circle,
  second day = light accent circle. Legend under the grid.
- **Segmented control:** gray track, white raised thumb (1 day / 2 days).
- **Stepper:** gray rounded pill with − | +, quantity to the right.
- **Radio choice:** round check (filled accent with white tick).
- **Agreement:** scrolling document card in Times New Roman with a fade at
  the bottom and a "Read to the end" check; each statement is a row with an
  iPhone toggle (green when on); signature box shows the name in a
  handwriting font with "Draw instead"; Sign stays dimmed until every
  statement is on.
- **Bottom bar (glass #2):** pinned, shows total or progress on the left
  and a 50px accent pill button on the right.
- **Checkout:** order card with gear image, summary group (line items,
  "2 of 2 signed", "Watched" in green), big total, Apple Pay button
  (black, Apple's official button from Stripe on the real site), then
  "Pay with card" outlined, lock icon + "Secure checkout by Stripe".
- **Confirmation:** green check circle, "You're booked.", dark wallet-style
  pass (code, pickup, return, doors, QR), black "Add to Wallet" button
  (use Apple's/Google's official badges on the real site), link to
  download signed agreements.

## Rules carried over from the current site

Prices from `js/config.js` (2-day = price + extraDay) · 24h / 48h return ·
video must reach the end before signing · every adult signs, parent signs
for 14–17 · lead renter must be 18+ · no claims about cancellation policy
until Ben sets one.
