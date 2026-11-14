import { escape as e, anchor, icon } from "./html";
import { languageTags, type Locale } from "./data";
import type { Copy } from "./content/en";
import type { Asset, Release } from "./releases";

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
