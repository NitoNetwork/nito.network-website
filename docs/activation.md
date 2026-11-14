# Orchard Activation Status

The website presents Orchard as an optional privacy transfer system scheduled for
activation at block **1,165,432**. The home page provides a concise status summary;
the Network page contains the protocol explanation and operator guidance.

## Shared Data Model

`nito-site-activation.timer` starts one isolated, non-overlapping collector every
60 seconds. The collector makes bounded requests to the public Nito explorer,
derives an observed average block interval and atomically publishes one small JSON
snapshot.

The snapshot is stored outside the website release at
`/var/lib/nito-site-activation/activation.json`. Nginx serves this file with a
60-second public cache lifetime and ETag support. Visitor count therefore affects
only delivery of a static file; it does not increase explorer queries, blockchain
RPC calls or server-side calculations.

Browsers refresh the same-origin snapshot at most every 60 to 65 seconds while the
page is visible. Hidden pages suspend polling and resume without duplicate timers.
The browser never contacts the explorer for activation data.

## Status Rules

- **Scheduled:** display the validated observed height and exact remaining blocks.
- **Estimated:** multiply remaining blocks by the measured recent average; never
  present the estimate as a guaranteed date.
- **Stale:** keep the last observation but suppress estimates when data is older
  than three minutes or a refresh fails.
- **Slow or stalled:** suppress estimates when the latest observed block is older
  than one hour or has an implausible timestamp.
- **Unavailable:** keep the activation target and explanatory copy without
  inventing progress.
- **Height reached:** the target passed, but compatible-node confirmation is not
  yet available.
- **Confirmed:** require matching mainnet height, configured activation height and
  an explicit Core-backed `activated=true` response. Height alone is insufficient.

The website never exposes authenticated RPC and never treats an absent or legacy
confirmation endpoint as successful activation.

## Production Installation

The production-specific installer expects an immutable runtime release selected
by `/opt/nito-site-runtime/current` and the Nginx vhost at
`/etc/nginx/sites-enabled/nito.network`:

```sh
sudo python3 /opt/nito-site-runtime/current/source/deploy/install-activation.py \
  --source /opt/nito-site-runtime/current
sudo systemctl status nito-site-activation.timer --no-pager
sudo systemctl show nito-site-activation.service -p Result -p ExecMainStatus
```

The installer verifies the source/build commit match, existing no-retention Nginx
policy, service account, systemd units, first snapshot and unrelated service state.
It validates Nginx before reload and restores its backup on failure.

On later collection failures the previous valid snapshot remains in place. The
collector journal contains operational errors only; visitor request logging stays
disabled by the supplied production configuration.

## Verification

```sh
npm run check
npm test
python -m unittest discover -s tests -p test_activation_collector.py
npm run build
npm run test:browser -- tests/browser/activation.spec.ts
```

Automated checks cover validation, atomic publication, error states, polling
lifecycle, all locales and responsive access. Visual changes also require rendered
desktop and mobile inspection.
