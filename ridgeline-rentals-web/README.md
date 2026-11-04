# Trailside Rentals — website

Self-serve via ferrata gear rentals at the Ashley Gorge trailhead, Vernal, Utah.
A Randall Ventures LLC brand.

Plain HTML, CSS and JavaScript. No framework and no build step: open `index.html`
or deploy the folder as-is to Netlify.

## Pages

| File | What it is |
|---|---|
| `index.html` | Home: hero, what a via ferrata is, how it works, trailhead location, the kit, before you go, photos, contact |
| `rates.html` | Day rates, deposit vs. Gear Protection, climber requirements, returns |
| `agreement.html` | The rental agreement and liability release, readable and printable |
| `book.html` | Booking demo: calendar with availability, 1–2 day rentals, gear, climbers, safety video, e-signed agreement per adult, review |

## Where to edit things

- **Prices, stock, season dates, closures, contact info:** `js/config.js`. The rates page, booking page and agreement all read from it.
- **Agreement wording:** `js/agreement.js`. Bump `VERSION` whenever the text changes so signed records show which version was agreed to. The Word copy is `assets/Trailside_Rentals_Rental_Agreement.docx`.
- **Booking logic:** `js/booking.js`.
- **Look and feel:** `css/styles.css` (colors and fonts are the variables at the top).

## Demo vs. live

The booking page is a working front end with no backend yet:

- Availability is simulated (`demoBookings: true` in config). Replace `demoBooked()` with a call to the real availability API.
- No payment is taken. Stripe Checkout goes where `confirmBooking()` is.
- Signatures are captured with the signer's typed name, drawn signature, each confirmed statement, e-sign consent, timestamp, time zone, agreement version and a SHA-256 hash of the exact text shown. In the demo they're kept in the browser only and can be downloaded on the confirmation screen. Live, they need to be saved server-side and emailed to each signer.
- Locker doors and codes come from a mock adapter in `js/locker.js`. When the real lockers arrive, write an adapter with the same three functions (assignDoors, createAccessCode, revokeCode) that calls the supplier API from the server, and swap it in. The confirmation page shows a pass with the door and code that can be saved to a phone for use with no signal.
- Return rule: 1-day rentals are due back within 24 hours of pickup, 2-day rentals within 48 hours.

## Brand

- Fonts: Oswald (headings) and Work Sans (body), from Google Fonts.
- Colors: paper `#F1F1EF`, black, graphite `#3B3D3F`, glacier blue `#9FCBE6` / `#2B6A91`, juniper green `#4C6B4F` (used for "available").
- Logo: inline SVG in each page header and footer; icon files are `favicon.ico`, `apple-touch-icon.png`, `assets/icon-512.png`.
