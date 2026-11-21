import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { translations } from "../src/content";
import { languageTags, locales, MAX_SUPPLY, rewards } from "../src/data";
import {
  CORE_RELEASE_KEY_ID,
  CORE_RELEASE_KEY_PATH,
  CORE_RELEASE_PUBLIC_KEY,
  CORE_RELEASE_TRUSTED_COMMENT,
  CORE_RELEASE_VERIFY_COMMAND,
  coreReleaseVerificationView,
  downloadsView,
} from "../src/downloads-view";
import { validateRelease, type Release } from "../src/releases";

test("download sizes use binary units in every locale", () => {
  const release: Release = {
    tag: "v3.0.1",
    url: "https://github.com/NitoNetwork/Nito-core/releases/tag/v3.0.1",
    published: "2026-03-26T19:01:06Z",
    checked: "2026-11-14T08:48:15Z",
    assets: [
      {
        name: "nito-3.0.1-x86_64-linux-gnu.tar.gz",
        url: "https://github.com/NitoNetwork/Nito-core/releases/download/v3.0.1/nito-3.0.1-x86_64-linux-gnu.tar.gz",
        size: 1234 * 1048576,
        digest: null,
      },
    ],
  };
  for (const locale of locales) {
    const html = downloadsView(release, translations[locale], locale);
    const size = new Intl.NumberFormat(languageTags[locale]).format(1234);
    assert.ok(html.includes(`${size} MiB`), locale);
    assert.doesNotMatch(html, /\bMB\b/);
  }
});

test("Core release verification publishes one scoped Minisign key", () => {
  const expected =
    `untrusted comment: minisign public key ${CORE_RELEASE_KEY_ID}\n` +
    `${CORE_RELEASE_PUBLIC_KEY}\n`;
  assert.equal(
    readFileSync(`public${CORE_RELEASE_KEY_PATH}`, "utf8"),
    expected,
  );
  assert.equal(
    CORE_RELEASE_VERIFY_COMMAND,
    `minisign -Vm SHA256SUMS \\\n  -x SHA256SUMS.minisig \\\n  -P ${CORE_RELEASE_PUBLIC_KEY}`,
  );
  for (const locale of locales) {
    const html = coreReleaseVerificationView(translations[locale]);
    assert.ok(html.includes(CORE_RELEASE_KEY_PATH), locale);
    assert.ok(html.includes(CORE_RELEASE_KEY_ID), locale);
    assert.ok(html.includes(CORE_RELEASE_PUBLIC_KEY), locale);
    assert.ok(html.includes(CORE_RELEASE_TRUSTED_COMMENT), locale);
    assert.doesNotMatch(html, /private key|passphrase/i);
  }
});

test("reward schedule matches the theoretical supply excluding genesis", () => {
  const includingGenesis = rewards.reduce(
    (total, row) => total + (row.last - row.block + 1) * row.reward,
    0,
  );
  assert.equal(rewards[0].block, 0);
  assert.equal(
    includingGenesis - rewards[0].reward,
    Number(MAX_SUPPLY.replaceAll(",", "")),
  );
});

test("bundled release assets agree with their declared product and tag", () => {
  for (const product of ["core", "mobile"] as const) {
    const cached = JSON.parse(
      readFileSync(`public/data/${product}.json`, "utf8"),
    ) as Release;
    const release = validateRelease(cached, product);
    assert.equal(release.assets.length, cached.assets.length);
    assert.ok(Number.isFinite(Date.parse(release.checked)));
    assert.ok(release.url.endsWith(`/tag/${release.tag}`));
    for (const asset of release.assets) {
      assert.ok(asset.url.includes(`/download/${release.tag}/`));
      assert.ok(asset.url.endsWith(`/${asset.name}`));
      assert.ok(asset.size > 0);
      assert.match(asset.digest ?? "", /^sha256:[a-f0-9]{64}$/);
    }
  }
});
