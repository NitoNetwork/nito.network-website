# Quality Audit

This document describes the repeatable quality gates for the public website. Raw
captures and reports are generated under ignored `.cache/` paths and are not part
of the repository.

## Automated Baseline

```sh
npm run check
npm test
python -m unittest discover -s tests -p "test_*.py"
npm run build
npm run test:browser
npm audit
```

These checks cover type safety, locale parity, prerendered routes, release data,
installer generation, Orchard collection, whitepaper synchronization, navigation,
accessibility, responsive layouts, themes, motion preferences and browser
interaction.

## Rendered Interface Audit

Start a production preview on port 4177, then run:

```sh
node scripts/audit-ui.mjs release
node scripts/audit-compatibility.mjs
node scripts/audit-performance.mjs
node scripts/audit-public-links.mjs
```

`audit-ui` exercises route, language, width and theme combinations with Axe scans
and screenshots. Compatibility checks require Playwright Firefox and WebKit.
Performance comparison requires both baseline and candidate reports and uses a
lab network/CPU profile; it is not field Core Web Vitals evidence.

Review screenshots directly against `DESIGN.md` and `acceptance.md`. In particular,
inspect the hero composition, monogram colors and reconstruction, mobile centering,
long translations, chart labels, menus, EasyNode controls and whitepaper reading.

## Security And Privacy Review

Before a public commit:

1. Scan every tracked file and the staged diff for credentials, private keys,
   tokens, personal paths, operator logs and generated configuration.
2. Run `npm audit` and inspect changes to dependency licenses and lockfile URLs.
3. Confirm `.env*`, caches, reports, runtime snapshots, backups and build output are
   ignored.
4. Confirm the production Nginx example sets restrictive headers, disables visitor
   logs and does not expose private synchronization state.
5. Confirm EasyNode never places RPC secrets in the page, URL, browser storage or
   downloaded script.

## Known Verification Boundaries

- Browser emulation does not certify physical-device rendering or screen-reader
  behavior. Test important releases on representative hardware when available.
- The Ubuntu 20.04 aarch64 EasyNode path has been cross-built and emulated; a full
  native aarch64 build and real-host systemd lifecycle remain separate checks.
- External GitHub, explorer and download availability cannot be guaranteed by this
  static repository. Product fallbacks must remain truthful and usable.

## Publication Evidence

Record the exact source commit, commands run, test counts, rendered viewports and
production `/build.json` match in the release handoff. Do not commit local audit
artifacts or private operator evidence to provide that record.
