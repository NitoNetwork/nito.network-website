import { escape as e, anchor, icon } from "./html";
import { languageTags, type Locale } from "./data";
import type { Copy } from "./content/en";
import type { Asset, Release } from "./releases";

export const CORE_RELEASE_KEY_PATH = "/security/nito-core-release.pub";
export const CORE_RELEASE_KEY_ID = "D060C20B3417848D";
export const CORE_RELEASE_PUBLIC_KEY =
  "RWSNhBc0C8Jg0H6yw7+V3qiCv/k/7NZox9P9oIGV/veXmCUrI6Bmn9oJ";
export const CORE_RELEASE_VERIFY_COMMAND = `minisign -Vm SHA256SUMS \\
  -x SHA256SUMS.minisig \\
  -P ${CORE_RELEASE_PUBLIC_KEY}`;
export const CORE_RELEASE_TRUSTED_COMMENT = "Nito Core vX.Y.Z SHA256SUMS";

function assetLabel(a: Asset, c: Copy) {
  const n = a.name.toLowerCase();
  return n.endsWith(".exe")
    ? c.setup
    : n.endsWith(".dmg")
      ? "DMG"
      : n.endsWith(".zip")
        ? c.portable
        : n.includes("aarch64")
          ? "aarch64"
          : n.includes("x86_64")
            ? "x86_64"
            : n.includes("arm64")
              ? "aarch64"
              : "tar.gz";
}
export function downloadsView(r: Release, c: Copy, l: Locale, fresh = false) {
  const f = new Intl.NumberFormat(languageTags[l]);
  const groups = [
    {
      name: "Windows",
      match: (a: Asset) => /win64.*\.(exe|zip)$/.test(a.name),
    },
    {
      name: "macOS",
      match: (a: Asset) => /apple-darwin.*\.(dmg|tar.gz)$/.test(a.name),
    },
    { name: "Linux", match: (a: Asset) => /linux-gnu.tar.gz$/.test(a.name) },
  ];
  return `<div class="release-info"><strong>${e(r.tag)}</strong><span>${e(fresh ? c.live : c.cached)}</span><span>${e(c.releaseDate)} ${new Intl.DateTimeFormat(languageTags[l], { dateStyle: "medium" }).format(new Date(r.published))}</span></div>${groups
    .map(
      (g) =>
        `<div class="download-row"><strong>${g.name}</strong><div class="download-assets">${
          r.assets
            .filter(g.match)
            .map((a) =>
              anchor(
                a.url,
                `${assetLabel(a, c)} · ${f.format(Math.round(a.size / 1048576))} MiB`,
                "button secondary",
                "download",
              ),
            )
            .join("") || anchor(r.url, c.allReleases)
        }</div></div>`,
    )
    .join(
      "",
    )}<div class="download-row"><strong>${e(c.source)}</strong>${anchor(r.url, c.allReleases)}</div>`;
}
export function checksumsView(r: Release, c: Copy) {
  return (
    r.assets
      .filter((a) => a.digest)
      .map(
        (a) =>
          `<div class="digest-item"><button class="icon-button" data-copy="${a.digest!.slice(7)}" title="${e(c.copy)}" aria-label="${e(c.copy)} SHA-256 ${e(a.name)}">${icon("copy")}</button><strong>${e(a.name)}</strong><code>${a.digest!.slice(7)}</code></div>`,
      )
      .join("") || anchor(r.url, c.allReleases)
  );
}

export function coreReleaseVerificationView(c: Copy) {
  return `<section class="release-verification" aria-labelledby="core-release-verification-title"><h3 id="core-release-verification-title">${e(c.coreSignatureTitle)}</h3><p>${e(c.coreSignaturePurpose)}</p><dl class="release-key-meta"><div><dt>${e(c.coreSignatureKeyId)}</dt><dd><code>${CORE_RELEASE_KEY_ID}</code></dd></div></dl><p><a class="text-link" href="${CORE_RELEASE_KEY_PATH}" target="_blank" rel="noopener noreferrer">${e(c.coreSignatureKeyLink)}${icon("download")}</a></p><h4>${e(c.coreSignatureCommand)}</h4><pre class="code-block"><code>${e(CORE_RELEASE_VERIFY_COMMAND)}</code></pre><p>${e(c.coreSignatureTrusted)} <code>${e(CORE_RELEASE_TRUSTED_COMMENT)}</code></p></section>`;
}
