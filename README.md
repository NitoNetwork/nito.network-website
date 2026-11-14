# Nito Network Website

Official source code for [nito.network](https://nito.network), the public Nito
Network information website.

The site is a static, prerendered Vite application. It presents the network,
official wallets, public resources, Orchard activation information, the official
whitepaper and a local EasyNode installer generator in seven languages.

## Highlights

- English, French, German, Spanish, Dutch, Russian and simplified Chinese.
- Prerendered, indexable pages with canonical URLs, alternate-language metadata
  and a generated sitemap.
- Dark theme by default, with an optional light preference stored in the browser.
- Responsive, keyboard-accessible navigation and practical WCAG 2.2 AA targets.
- Reduced-motion, forced-colors and static graphics fallbacks.
- No analytics, advertising, account system, forms, visitor database or cookies.
- Shared server snapshots for Orchard status and the official whitepaper, so
  visitors never trigger blockchain RPC or upstream synchronization jobs.

## Requirements

- Node.js 24 LTS
- npm
- Python 3.11 or newer for collector tests and production synchronization tools
- Google Chrome for the Playwright browser suite

## Local Development

```sh
npm ci
npm run dev
```

The development server listens on `127.0.0.1`. Vite prints the local URL.

## Verification

```sh
npm run check
npm test
python -m unittest discover -s tests -p "test_*.py"
npm run build
npm run test:browser
npm audit
```

Browser tests build and start their own local preview. They cover navigation,
themes, accessibility, responsive layouts, charts, EasyNode, Orchard states,
the whitepaper reader and motion preferences.

Additional visual and compatibility audits are documented in
[the quality report](docs/design/audit.md).

## Build Modes

```sh
npm run build       # Production: indexable pages for https://nito.network
npm run build:test  # Local/CI: noindex output with production canonical URLs
npm run preview     # Preview the current dist/ directory on 127.0.0.1
```

The generated `dist/` directory is the complete static document root. Application
assets are fingerprinted, while reusable media keep stable URLs. `dist/build.json`
records the source commit used for the build.

Run `npm run refresh` before a release when the checked-in fallback metadata for
Nito Core or the mobile wallet must be refreshed from official GitHub releases.

## Project Structure

- `src/content/` - type-checked localized copy; English is the reference locale.
- `src/render.ts` - page composition, shared navigation and footer.
- `src/data.ts` - official links, activation height and reward schedule.
- `src/installers.ts` - client-side EasyNode script generator and safeguards.
- `src/activation-*` - Orchard snapshot validation and presentation.
- `src/whitepaper-*` - native whitepaper reader and client-side validation.
- `src/logo-*`, `src/particles.ts` - progressive Canvas 2D visual effects.
- `scripts/build.mjs` - Vite build, prerendering, metadata and sitemap generation.
- `scripts/collect-activation.py` - once-per-minute public chain snapshot collector.
- `scripts/sync-whitepaper.py` - official whitepaper synchronizer.
- `deploy/` - production-specific Nginx and systemd examples.
- `tests/` - TypeScript, Python and Playwright coverage.
- `DESIGN.md` - visual system, motion, responsive and accessibility rules.

## Runtime Data

The static site uses two optional same-origin data sources:

- `/data/activation.json` is produced once per minute, independently of visitor
  count. See [Orchard activation operations](docs/activation.md).
- `/whitepaper-data/` is synchronized from the official whitepaper repository
  every 15 minutes. See [whitepaper operations](docs/whitepaper.md).

Both jobs publish small static files atomically and retain the last valid result
when an upstream request fails. They do not receive or store visitor data.

## Privacy And Security

The website does not set cookies or submit personal data to a Nito application
server. Language, theme, motion and the guarded Chrome iOS recovery flag are kept
only in browser storage. The browser may contact GitHub for current public release
metadata and follows external links only after an explicit user action.

The supplied Nginx example disables visitor access logs and uses restrictive
security headers. Production credentials, private keys, operator evidence,
backups and generated runtime data must remain outside this repository and the
public document root.

Please report vulnerabilities through GitHub's private security advisory flow.
See [SECURITY.md](SECURITY.md) for scope and reporting guidance.

## Deployment

Production uses immutable static releases selected by
`/var/www/nito.network/current`, with collector code selected independently by
`/opt/nito-site-runtime/current`. The files in `deploy/` are examples for the
current Nito production architecture; review paths and service names before using
them on another host.

A release should serve the exact commit pushed to `main`. After deployment,
compare that commit with `/build.json`, validate Nginx, verify representative
localized routes and exercise the rendered desktop and mobile states.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Changes to
network facts, downloads, installation commands or translations require a
verifiable official source and matching tests.

General website questions can be sent to `help@nito.network`. Security reports
must follow the private process in [SECURITY.md](SECURITY.md).

## License

The website source is available under the [MIT License](LICENSE). Nito names,
logos and brand artwork remain subject to their respective trademark and brand
rights. Manrope and runtime dependencies retain their own licenses; required
notices are included with the relevant source or generated build.
