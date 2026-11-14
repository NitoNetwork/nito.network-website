# Contributing

Thank you for helping improve the Nito Network website.

## Before You Start

- Keep changes focused and preserve the existing Vite and TypeScript architecture.
- Use official Nito sources for network facts, releases and installation commands.
- Never commit credentials, private keys, wallet material, operator logs, backups,
  generated runtime data or personal information.
- Public product documentation and code identifiers are written in English.
  Visible website copy belongs in all seven locale dictionaries.

## Development

```sh
npm ci
npm run dev
```

For content changes, update the English reference and every corresponding locale.
Do not weaken type-checked dictionary parity or remove an accessibility fallback.

## Required Checks

Run the checks relevant to the change before opening a pull request:

```sh
npm run check
npm test
python -m unittest discover -s tests -p "test_*.py"
npm run build
npm run test:browser
npm audit
```

Visual changes also require real rendered checks at desktop and mobile widths, in
both themes, with keyboard navigation and reduced motion. Passing automated tests
does not replace comparison with the accepted visual baseline in `DESIGN.md` and
`docs/design/acceptance.md`.

## Pull Requests

Describe the user-visible behavior, source for technical claims, verification
performed and any remaining limitation. Keep generated `dist/`, caches, reports
and screenshots out of commits unless maintainers explicitly request an artifact.

Security reports follow [SECURITY.md](SECURITY.md), not the public issue tracker.
