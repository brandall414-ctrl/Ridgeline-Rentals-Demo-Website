# Trailside homepage — how it's built (Nov 12, 2026)

Files: `index.html`, `css/home.css`, `js/home.js`. Photos in `assets/route/` (webp, 1600px max).
Booking, rates and agreement pages use the Apple system in `css/apple.css` (see `design/booking-apple/BOOKING-STYLE.md`).

## Sections, top to bottom
1. **Cover** (white): `climber-cutout.webp` bleeds off the right edge, `climber-shadow.webp` sits behind it
   (climber only, not the wall). Load: headline lines rise, climber wipes up. Mouse: 3D tilt + shadow shifts.
2. **Intro** (black): what a via ferrata is, three facts.
3. **Walk the route** (black, 640vh): 3D corridor. Each `[data-z]` item sits at a depth; scrolling moves the camera.
   Words and photos take turns (fade ranges in `drawWalk`). The last photo fills the screen.
4. **Ladder clip** (black, 300vh): `ladder.mp4` grows from a rounded card to full height; "Two carabiners. / One always on."
5. **Kit** (gray): helmet, harness and lanyard start assembled and come apart with labels. Prices read from `js/config.js`.
6. **How it works** (white): sticky phone shows the real booking screens; inline screenshots on phones.
7. **From the gorge**: vertical scroll pans a photo strip sideways.
8. **Location**, **Before you go**, **End** (bridge photo), footer.

## The rail (left edge)
Fixed SVG with `mix-blend-mode: difference` so it reads on white and on photos. A bolt is drawn at the top of every
`[data-pitch]` section after the first. Two carabiners stay at a fixed screen height; when a bolt reaches one it swings
off the cable and back on. They're 92px apart and react within 44px, so only one is ever off at a time.
Lanyard arms meet at the energy absorber. Tune in `drawRail()`.

## Rules
Everything respects `prefers-reduced-motion` (sticky scenes become plain stacked sections).
One `requestAnimationFrame` loop that sleeps when nothing moves.
