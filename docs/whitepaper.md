# Official Whitepaper Reader

Each localized `/whitepaper/` route provides a native HTML reader with a chapter
index, publication date, source revision and official PDF download. Interface copy
is localized; the official document keeps its original language and wording.

## Shared Synchronization

`scripts/sync-whitepaper.py` checks the `main` branch of
`NitoNetwork/Nito-Whitepaper` every 15 minutes through conditional GitHub requests.
The schedule is independent of visitor count. An unchanged revision does not
download the HTML or PDF again.

For a new commit, the synchronizer fetches both files from that immutable revision,
validates the PDF and extracts the semantic article body with a strict allowlist.
Upstream scripts, styles and navigation are never imported. Unsupported article
markup fails closed, leaving the last valid publication available.

Runtime data lives outside website releases in `/var/lib/nito-site-whitepaper`:

- `upstream.json` stores conditional-request state and is never served.
- `public/current.json` identifies the active revision and content hashes.
- `public/<commit>/document.json` contains sanitized article content and chapters.
- `public/<commit>/Nito_Whitepaper.pdf` is the byte-identical official PDF.

The document and PDF are completed before the manifest changes atomically. The
three most recent revisions are retained. These files contain public document
data only, never visitor information.

Nginx serves the manifest with a 60-second cache and immutable revision files with
a one-day cache. A reader visit contacts this site only; no visitor triggers a
GitHub synchronization. The PDF loads only after an explicit request.

## Reader Safety

The browser validates the manifest, revision and chapter index, then sanitizes the
article again with DOMPurify. DOMPurify is lazy-loaded only on reader routes and its
Apache-2.0 notice is included in generated builds. The reader adds no iframe,
remote style, script, tracker, PDF engine or browser storage.

Official website and PDF links remain available when JavaScript is disabled or a
cached document cannot be loaded.

## Production Installation

The production-specific installer expects an immutable runtime release selected
by `/opt/nito-site-runtime/current` and the Nginx vhost at
`/etc/nginx/sites-enabled/nito.network`:

```sh
sudo python3 /opt/nito-site-runtime/current/source/deploy/install-whitepaper.py \
  --source /opt/nito-site-runtime/current
sudo systemctl status nito-site-whitepaper.timer --no-pager
sudo systemctl show nito-site-whitepaper.service -p Result -p ExecMainStatus
```

The installer verifies the source/build commit match, no-retention Nginx policy,
service account, systemd units, initial synchronized publication and unrelated
service state. It validates Nginx before reload and restores its backup on failure.

## Local Verification

```sh
python scripts/sync-whitepaper.py --state-dir .cache/whitepaper
python -m unittest discover -s tests -p test_whitepaper_sync.py
npm test
npm run test:browser -- tests/browser/whitepaper.spec.ts
```

Local previews need an alias for `/whitepaper-data/` or the browser-test request
interception. Runtime documents are not committed or bundled. If upstream changes
its article structure, update the parser and content-preservation tests before
publishing a new reader build.
