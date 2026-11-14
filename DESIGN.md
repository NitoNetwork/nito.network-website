# Nito Network Design System

## Direction

Nito Network uses **Cinematic 3D** as its base profile and borrows the precision,
technical language and calibrated data presentation of **Technical Premium**.
Its signature is the **Living Ledger**: the official Nito monogram assembled
from luminous blocks above an abstract network landscape. The scene expresses
verification, mining, nodes and public participation without turning the site
into a dashboard.

The interface avoids decorative card grids, scroll trapping and dense dashboard
chrome. Cinematic depth is concentrated in the home hero. Secondary pages reuse
the network paths, materials and signal colors through lighter CSS, SVG and
Canvas treatments so content remains fast and readable.

## Visual Principles

1. Put the next useful action beside the information that justifies it.
2. Use typography, spacing and section tone before borders or containers.
3. Reserve the green action color for interaction, status and navigation.
4. Keep technical values exact, localized and paired with their units.
5. Treat the Living Ledger and particles as progressive visual enhancement.
6. Never present decorative block pulses as live chain telemetry.

## Tokens

`src/styles.css` defines primitive values and semantic roles for canvas,
surface, text, muted text, border, primary action, focus, accent, warning spark
and danger. Light and dark themes must map the same roles rather than introducing
page-specific colors. Illustration colors may use component aliases such as
`--phone-frame`, but must not leak into general interface components.

Status colors require a readable foreground and must never be the only status
indicator. `--focus` is reserved for keyboard focus. Chart labels use the normal
text token; selected chart controls use the primary action pair.

The shared finishing layer adds `--raised`, `--signal`, `--signal-soft` and
`--elevation` for framed tools, technical emphasis and interactive feedback.
Blue signal accents distinguish data and resources from mint primary actions;
gold remains a small signature accent. Interior headings reuse the existing
network landscape at low opacity, with a contained separator and no new asset.

## Layout And Components

- The content width is capped by `.wrap`; outer margins shrink at content-led
  breakpoints without scaling type by viewport width.
- Sections are unframed bands. Cards are reserved for repeated items or framed
  tools, never nested inside other cards.
- Buttons represent commands. Text links represent navigation. Icon-only buttons
  require an accessible name and a minimum 44 by 44 pixel target.
- Tables retain semantic headers and gain horizontal scrolling before values are
  compressed. Charts include a semantic description and equivalent data table.
- The sticky header must not hide focused controls or anchored headings.
- Download rows, resource directories and participation rows share icon sizes,
  surface treatments and focus feedback. Only EasyNode receives a framed tool
  surface; page sections remain unframed.
- Reward values remain separated at longer horizons without leader lines;
  plotted points and the time/reward scales remain unchanged.

## Motion And Graphics

Particles provide pointer and touch feedback across the viewport and remain
still when they are not disturbed. The Living Ledger itself is a stable,
responsive image composition: an optimized cinematic landscape and a separate
transparent block monogram are present in the initial HTML and never exchange
places after loading.

The monogram's tilt responds only to direct pointer or touch contact and returns
to its exact initial transform afterward. A Canvas 2D reconstruction wave runs
while the monogram is visible; click, tap, Enter or Space scatters the same image
tiles and rebuilds them over 2.2 seconds. The slower wave repeats seamlessly
every nine seconds with no idle gap. A localized Animations switch in the footer
controls all site motion and saves the preference locally; system reduced-motion
takes precedence. No WebGL dependency is required. AVIF and WebP sources reduce transfer size while JPEG and PNG
fallbacks preserve the composition. With `prefers-reduced-motion: reduce`, the
monogram remains static; forced colors remove the decorative scene entirely.
The canvas is capped at DPR 1.5 (1.25 on narrow logos) and 60/30 rendered frames
per second. Hidden tabs and off-screen logos stop rendering; image/context
failure retains the original static image. The landscape never animates or moves.

Both the wave and the click reconstruction follow the pen path: up the left
stem, down the diagonal, up the right stem. A runtime silhouette/component mask
excludes floating poster pieces only during animation. Edge tiles lift at the
moving contact; their colors and material come from their actual source pixels,
not a separate particle palette. Disabling motion restores the untouched poster,
including its baked-in floating pieces. The image assets themselves are unchanged.

Below-fold content may enter once over 460 ms with a 14 px vertical translation,
never hidden by opacity. Feedback transitions take 180 ms. Reduced motion skips
entrances and pending pulses. Visibility changes cancel active motion; BFCache
restoration and live motion-preference changes retain working pointer input.
Copy and generation outcomes use visible localized text, not color alone.

## Responsive Rules

- Wide screens use paired content columns only when both columns remain useful.
- Tablet layouts collapse paired sections before text measure becomes cramped.
- Mobile layouts preserve the reading order, expose navigation through a named
  menu button and keep primary controls at touch-safe sizes.
- Long translations, 200 percent zoom, large values and system text scaling must
  reflow without clipping or horizontal page scroll.
- The hero monogram is centered below the message on narrow screens, with fixed
  geometry before and after image decoding.
- Dark mode remains the default for the interface. An explicit light preference
  is stored locally. The cinematic home hero keeps its approved night scene in
  both modes so its visual signature does not change.

## Accessibility

- Target practical WCAG 2.2 AA contrast for text and interactive states.
- Preserve semantic landmarks, one page heading, logical heading order, visible
  focus, keyboard operation and descriptive control names.
- Do not communicate state through color alone. Use text, iconography or native
  state attributes such as `aria-current`, `aria-pressed` and `aria-expanded`.
- Provide accessible chart data, useful error text and status announcements.
- Support reduced motion, forced colors and content reflow at 200 percent zoom.

## Verification

Before publication, run type checking, unit tests and the production build. Then
render representative desktop, tablet and mobile widths in both themes. Exercise
navigation, language, theme, chart ranges, downloads and EasyNode with pointer and
keyboard. Also inspect reduced motion, forced colors where available, overflow,
console errors and failed network fallbacks. A successful build alone is not a
visual acceptance result.

## Do And Do Not

Do keep copy concise, actions explicit, data units exact and decoration bounded.
Do reuse semantic tokens and existing primitives. Do verify the real rendered
interface after visual changes.

Do not add unrelated autonomous motion, nested cards, hidden essential content,
pointer-only controls, third-party branding or a second hero composition that
replaces the first after page load.
