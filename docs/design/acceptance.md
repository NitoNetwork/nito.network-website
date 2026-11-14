# Product Acceptance Contract

This document records the visual and behavioral features that public changes must
preserve. Automated tests supplement this contract; they do not replace rendered
comparison and human review.

## Visual Baseline

The accepted **Living Ledger** direction combines Cinematic 3D atmosphere with
Technical Premium precision:

- a luminous blue-and-gold block Nito monogram over a full-width network landscape;
- gold confined to the inner left upright, with blue or cyan exterior fragments;
- a left-aligned message and three technical feature callouts;
- a stable initial composition with no post-load image swap or layout movement;
- site-wide stationary particles that react to pointer and touch paths;
- the same material, signal colors and typography on interior pages without
  repeating the hero spectacle.

Sections remain unframed bands. Cards are reserved for repeated items or genuine
tools. The interface must not add invented telemetry, marketing claims, nested
cards, scroll trapping or essential pointer-only controls.

## Motion Contract

The monogram wave follows the N's writing order: up the left stem, down the
diagonal and up the right stem. It repeats in a seamless nine-second cycle while
visible. Fragments detach only at wave contact and retain source-image colors.
Click, tap, Enter or Space triggers full dispersion and reconstruction in the same
order.

Direct contact may tilt the monogram; leaving it restores the exact initial pose.
The footer animation switch controls all site motion. `prefers-reduced-motion`,
forced colors, no JavaScript and renderer failure retain a complete static
experience. Hidden tabs and off-screen graphics must stop rendering and release
their work.

## Functional Matrix

| Dimension   | Required coverage                                                         |
| ----------- | ------------------------------------------------------------------------- |
| Pages       | Discover, Wallets, Network, Participate, EasyNode, Resources, Whitepaper  |
| Languages   | English, French, German, Spanish, Dutch, Russian, simplified Chinese      |
| Widths      | 1440, 1024, 390 and 320 pixels; 200% zoom reflow                          |
| Themes      | Dark default and persisted light choice; night hero in both               |
| Input       | Keyboard, pointer and touch; visible focus; no hover-only information     |
| Preferences | Reduced motion, forced colors and JavaScript/graphics fallback            |
| Data        | Current, cached, timeout, malformed and unavailable states                |
| Controls    | Navigation, language, theme, chart, disclosures, copy, download, EasyNode |
| Routing     | 49 localized canonical routes, legacy aliases, deep links and 404         |
| Delivery    | Exact verified `main` commit built and deployed to `nito.network`         |

## Content And Data Contracts

- English is the reference dictionary; all seven locales remain structurally
  equivalent and use accurate technical terminology.
- Internal navigation stays in the current tab. Resources and downloads open in a
  separate tab with opener isolation.
- EasyNode supports Ubuntu 20.04/22.04/24.04 and Debian 12/13 on x86_64/aarch64.
  It exposes installation paths and resource settings without accepting secrets in
  the browser. Custom RPC credentials are entered on the target host.
- The reward chart defaults to 10 years, preserves 50/200-year choices and keeps
  labels readable without leader lines.
- Orchard status comes from one shared server snapshot per minute. Confirmation
  requires explicit Core-backed evidence, never height alone.
- The whitepaper reader preserves official source text and publishes a consistent,
  sanitized HTML/PDF revision without visitor-triggered upstream requests.
- No analytics, tracking, visitor database, cookies, personal operator information
  or credentials belong in the product or repository.

## Release Gate

Before publication, run type checks, unit tests, Python tests, a production build,
browser tests, dependency and secret scans. Render representative desktop/mobile
states in both themes and inspect keyboard use, reduced motion, overflow, console
errors and failed-data fallbacks.

Unreviewed translations, unresolved technical claims, broken accessibility,
weakened signature effects, leaked private data or unapproved visual deviations
block publication. Real-device or assistive-technology limitations must be stated
instead of inferred from emulation.
