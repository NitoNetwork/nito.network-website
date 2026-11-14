import {
  ACTIVATION_HEIGHT,
  MAX_SUPPLY,
  languageNames,
  languageTags,
  locales,
  links,
  pageUrl,
  rewards,
  type Locale,
  type Page,
} from "./data";
import { getCopy } from "./content";
import {
  escape as e,
  icon,
  anchor as a,
  interpolate,
  linkAttributes,
} from "./html";
import { chart } from "./chart";
import { activationBand, orchardDetails } from "./activation-view";
import { whitepaperPage } from "./whitepaper-view";
import { whitepaperCopy } from "./content/whitepaper";
import { toolPage } from "./tools-view";
import type { Copy } from "./content/en";
import { downloadsView, checksumsView } from "./downloads-view";
import coreCache from "../public/data/core.json";
import mobileCache from "../public/data/mobile.json";

const navPages: Page[] = [
  "home",
  "wallets",
  "network",
  "participate",
  "easynode",
  "resources",
];
export function description(locale: Locale, page: Page): string {
  if (page === "whitepaper") return whitepaperCopy[locale].intro;
  const c = getCopy(locale);
  return page === "home"
    ? c.intro
    : page === "wallets"
      ? c.walletsIntro
      : page === "network"
        ? c.networkIntro
        : page === "participate"
          ? c.participateIntro
          : page === "resources"
            ? c.resourcesIntro
            : c.toolsIntro;
}
function title(c: Copy, label: string, text: string, intro: string) {
  return `<header class="page-heading wrap"><span class="eyebrow">${e(label)}</span><h1>${e(text)}</h1><p class="lead">${e(intro)}</p></header>`;
}
function brand() {
  return '<img class="brand-symbol" src="/media/nito-logo-128.png" srcset="/media/nito-logo-64.png 64w, /media/nito-logo-128.png 128w, /media/nito-logo-256.png 256w" sizes="44px" width="44" height="44" alt=""><span>nito<span class="brand-small">network</span></span>';
}
function phone(c: Copy) {
  return `<figure class="phone-scene"><div class="phone-device" role="img" aria-label="${e(c.phoneAlt)}"><div class="phone-app-ui" aria-hidden="true"><header class="phone-app-header"><span class="phone-app-name"><img src="/media/nito-logo-64.png" width="64" height="64" alt=""><span><strong>NITO WALLET</strong><small>${e(c.phoneWalletType)}</small></span></span><span class="phone-connection"><i></i>${e(c.phoneConnected)}</span></header><section class="phone-balance"><span>${e(c.phoneBalance)}</span><strong>0.00000000 <small>NITO</small></strong></section><div class="phone-stats"><span>${e(c.phoneConfirmed)}<strong>0</strong></span><span>${e(c.phonePending)}<strong>0</strong></span></div><div class="phone-actions"><span><i>↓</i><strong>${e(c.phoneReceive)}</strong></span><span><i>↗</i><strong>${e(c.phoneSend)}</strong></span></div></div><div class="phone-camera"></div><div class="phone-home"></div></div><figcaption class="device-caption">Android / iOS</figcaption></figure>`;
}
function mobile(c: Copy) {
  return `<section class="mobile-band" id="mobile"><div class="wrap mobile-layout"><div><span class="eyebrow">${e(c.mobileEyebrow)}</span><div class="release-pill">${e(c.beta)} <span data-release="mobile" title="${e(c.cached)}">${e(mobileCache.tag)}</span></div><h2>${e(c.mobileTitle)}</h2><p>${e(c.mobileText)}</p>${a(links.mobile, c.mobileCta, "button primary")}</div>${phone(c)}</div></section>`;
}
function rewardChart(c: Copy) {
  return `<div class="chart-header"><h3 id="reward-chart-heading">${e(c.chartTitle)} <small>${e(c.chartUnit)}</small></h3><div class="segmented" role="group" aria-labelledby="reward-chart-heading">${[10, 50, 200].map((n) => `<button type="button" data-horizon="${n}" aria-pressed="${n === 10}" aria-controls="reward-chart">${n} ${e(c.years)}</button>`).join("")}</div></div><div id="reward-chart" aria-live="polite" aria-atomic="true">${chart(c, 10)}</div>`;
}
function resourceDirectory(entries: string[][], heading: "h2" | "h3" = "h2") {
  return entries
    .map(
      ([t, d, url, i]) =>
        `<a class="resource-item" href="${e(url)}" ${linkAttributes(url)}>${icon(i)}<div><${heading}>${e(t)}</${heading}><p>${e(d)}</p></div>${icon(url.startsWith("/downloads/") ? "download" : "arrow-up-right")}</a>`,
    )
    .join("");
}
function home(c: Copy, l: Locale) {
  return `<section class="hero living-hero"><div class="ledger-scene" data-hero-scene aria-hidden="true"><picture class="ledger-world"><source type="image/avif" srcset="/media/nito-ledger-world-960.avif 960w, /media/nito-ledger-world-1680.avif 1672w" sizes="100vw"><source type="image/webp" srcset="/media/nito-ledger-world-960.webp 960w, /media/nito-ledger-world-1680.webp 1672w" sizes="100vw"><img src="/media/nito-ledger-world-1680.jpg" srcset="/media/nito-ledger-world-960.jpg 960w, /media/nito-ledger-world-1680.jpg 1672w" sizes="100vw" width="1672" height="941" alt="" fetchpriority="high" decoding="async" draggable="false"></picture><div class="ledger-world-shade"></div><picture class="ledger-monogram"><source type="image/avif" srcset="/media/nito-blocks-320.avif?v=official-colors 320w, /media/nito-blocks-640.avif?v=official-colors 640w, /media/nito-blocks-1024.avif?v=official-colors 1024w" sizes="(max-width: 900px) 76vw, 43vw"><source type="image/webp" srcset="/media/nito-blocks-320.webp?v=official-colors 320w, /media/nito-blocks-640.webp?v=official-colors 640w, /media/nito-blocks-1024.webp?v=official-colors 1024w" sizes="(max-width: 900px) 76vw, 43vw"><img src="/media/nito-blocks-1024.png?v=official-colors" width="1024" height="1024" alt="" fetchpriority="high" decoding="async" draggable="false"></picture></div><div class="wrap hero-content"><span class="eyebrow">Nito Network</span><h1>Nito Network<span class="brand-period">.</span></h1><p class="hero-tagline">${e(c.hero).replace("\n", " ")}</p><p class="hero-intro">${e(c.intro)}</p><div class="actions">${a(pageUrl(l, "wallets"), c.getWallet, "button primary")}${a(pageUrl(l, "network"), c.discover)}</div></div><div class="wrap hero-foot"><span>${icon("code-2")}${e(c.openSource)}</span><span>${icon("timer")}${e(c.blockTime)}: ${e(c.seconds)}</span><span>${icon("cpu")}${e(c.miningAlgo)}</span><a href="#discover" aria-label="${e(c.discover)}" class="scroll-cue">${icon("arrow-down")}</a></div></section>
  ${activationBand(l)}
  <section class="section home-issuance" id="discover" aria-labelledby="home-issuance-title"><div class="wrap home-overview"><div class="home-section-copy"><span class="eyebrow">${e(c.issuance)}</span><h2 id="home-issuance-title">${e(c.homeIssuanceTitle)}</h2><p>${e(c.issuanceText)}</p>${a(pageUrl(l, "network") + "#issuance", c.schedule)}</div><div class="home-rewards">${rewardChart(c)}</div></div></section>
  <section class="section muted-band" id="home-participate" aria-labelledby="home-participate-title"><div class="wrap"><header class="home-section-copy"><span class="eyebrow">${e(c.participate)}</span><h2 id="home-participate-title">${e(c.sustain)}</h2></header><div class="home-paths">${[
    [
      "EasyNode",
      c.nodeTitle,
      c.nodeText,
      pageUrl(l, "easynode"),
      c.configure,
      "server",
    ],
    [
      c.mining,
      c.miningTitle,
      c.miningText,
      links.mining,
      c.miningCta,
      "pickaxe",
    ],
  ]
    .map(
      ([label, heading, body, url, cta, symbol]) =>
        `<article class="home-path"><div class="home-path-label">${icon(symbol)}<span class="eyebrow">${e(label)}</span></div><h3>${e(heading)}</h3><p>${e(body)}</p>${a(url, cta)}</article>`,
    )
    .join("")}</div></div></section>
  <section class="section" id="home-resources" aria-labelledby="home-resources-title"><div class="wrap home-overview"><div class="home-section-copy"><span class="eyebrow">${e(c.resources)}</span><h2 id="home-resources-title">${e(c.homeResourcesTitle)}</h2><p>${e(c.resourcesIntro)}</p>${a(pageUrl(l, "resources"), c.allResources)}</div><div class="resource-directory home-resource-directory">${resourceDirectory(
    [
      [c.mempool, c.chainText, links.mempool, "scan-line"],
      [c.classic, c.chainText, links.explorer, "search"],
      ["GitHub", c.repositories, links.github, "code-2"],
      [c.whitepaper, c.docs, pageUrl(l, "whitepaper"), "book-open"],
    ],
    "h3",
  )}</div></div></section>`;
}
function wallets(c: Copy, l: Locale) {
  return `${title(c, c.wallets, c.walletsTitle, c.walletsIntro)}<section class="section wrap" id="core"><div class="split-heading"><div><span class="eyebrow">${e(c.desktop)}</span><h2>Nito Core</h2><p>${e(c.desktopText)}</p></div>${a(links.core, c.allReleases)}</div><div id="core-downloads">${downloadsView(coreCache, c, l)}</div><details class="disclosure"><summary>${e(c.checksums)}${icon("plus")}</summary><p>${e(c.checksumText)}</p><div id="checksums">${checksumsView(coreCache, c)}</div></details></section>${mobile(c)}<section class="section wrap web-wallet"><span class="eyebrow">${e(c.web)}</span><h2>${e(c.webTitle)}</h2><p>${e(c.webText)}</p>${a(links.webwallet, c.webCta)}</section>`;
}
function network(c: Copy, l: Locale) {
  const f = new Intl.NumberFormat(languageTags[l]);
  return `${title(c, c.network, c.networkTitle, c.networkIntro)}
  <section class="section muted-band" id="issuance"><div class="wrap"><div class="split-heading"><div><span class="eyebrow">${e(c.issuance)}</span><h2>${e(c.issuanceTitle)}</h2></div><p>${e(c.issuanceText)}</p></div><div class="supply-strip"><div><span>${e(c.maxSupply)}</span><strong>${f.format(Number(MAX_SUPPLY.replaceAll(",", "")))} <small>NITO</small></strong></div><div><span>${e(c.premine)}</span><strong>0 <small>NITO</small></strong></div></div>${rewardChart(c)}<details class="disclosure"><summary>${e(c.schedule)}${icon("plus")}</summary><div class="table-scroll"><table><thead><tr><th>${e(c.years)}</th><th>${e(c.chartUnit)}</th><th>${e(c.blocks)}</th></tr></thead><tbody>${rewards.map((r) => `<tr><th>${r.year}${r.end > r.year ? "–" + r.end : ""}</th><td>${r.reward}</td><td>${f.format(r.block)} – ${f.format(r.last)}</td></tr>`).join("")}</tbody></table></div></details></div></section>
  <section class="section wrap orchard" id="orchard"><div><span class="eyebrow">${e(c.privacy)}</span><h2>${e(c.privacyTitle)}</h2><div class="activation-number"><span>${e(c.activation)} · ${e(c.block)}</span><strong>${f.format(ACTIVATION_HEIGHT)}</strong></div></div><div><p class="lead">${e(c.privacyText)}</p><p>${e(interpolate(c.upgradeDetail, { height: f.format(ACTIVATION_HEIGHT) }))}</p></div>${orchardDetails(l)}</section>
  <section class="section muted-band"><div class="wrap technical-layout"><div><span class="eyebrow">${e(c.technical)}</span><h2>${e(c.network)}</h2>${a(pageUrl(l, "whitepaper"), c.docs)}</div><dl class="spec-list">${[
    [c.blockTime, c.seconds],
    [c.weight, c.weightValue],
    [c.unit, `1 NITO = ${f.format(100_000_000)} Nitoshi`],
    [c.launch, c.launchDate],
    [c.addresses, "Legacy · P2SH-SegWit · Bech32 · Taproot"],
    [c.mainnet, "P2P 8820 · RPC 8825"],
    [c.testnet, "P2P 8840 · RPC 8845"],
    ["Signet", "P2P 8860 · RPC 8865"],
    ["Regtest", "P2P 8880 · RPC 8885"],
  ]
    .map(([k, v]) => `<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`)
    .join("")}</dl></div></section>`;
}
function participate(c: Copy, l: Locale) {
  return `${title(c, c.participate, c.participateTitle, c.participateIntro)}<section class="wrap participation-list">${[
    [
      c.mining,
      c.miningTitle,
      c.miningText,
      links.mining,
      c.miningCta,
      "pickaxe",
    ],
    [
      "EasyNode",
      c.nodeTitle,
      c.nodeText,
      pageUrl(l, "easynode"),
      c.configure,
      "server",
    ],
  ]
    .map(
      ([k, t, b, url, cta, i], n) =>
        `<article class="participation-row"><div class="row-number">0${n + 1}${icon(i)}</div><div><span class="eyebrow">${e(k)}</span><h2>${e(t)}</h2><p>${e(b)}</p></div>${a(url, cta, "button secondary")}</article>`,
    )
    .join("")}</section>`;
}
function resources(c: Copy, l: Locale) {
  return `${title(c, c.resources, c.resourcesTitle, c.resourcesIntro)}<section class="wrap resource-directory">${resourceDirectory(
    [
      [c.mempool, c.chainText, links.mempool, "scan-line"],
      [c.classic, c.chainText, links.explorer, "search"],
      [c.webTitle, c.web, links.webwallet, "wallet"],
      ["CoinPaprika", c.market, links.market, "chart-no-axes-combined"],
      ["GitHub", c.repositories, links.github, "code-2"],
      [c.whitepaper, c.docs, pageUrl(l, "whitepaper"), "book-open"],
    ],
  )}</section><section class="section wrap community"><h2>${e(c.community)}</h2><div class="actions">${a(links.discord, "Discord")}${a(links.telegram, "Telegram")}${a(links.x, "X")}</div></section>`;
}
export function render(l: Locale, p: Page, valid = true): string {
  const c = getCopy(l),
    active = p;
  const nav = navPages
    .map(
      (key) =>
        `<a href="${pageUrl(l, key)}" ${key === active ? 'aria-current="page"' : p === "whitepaper" && key === "resources" ? 'aria-current="location"' : ""}>${key === "easynode" ? "EasyNode" : e(c[key as keyof Copy])}</a>`,
    )
    .join("");
  const body = !valid
    ? title(c, "404", c.notFound, "") +
      `<div class="wrap section">${a(pageUrl(l), c.returnHome)}</div>`
    : p === "home"
      ? home(c, l)
      : p === "wallets"
        ? wallets(c, l)
        : p === "network"
          ? network(c, l)
          : p === "participate"
            ? participate(c, l)
            : p === "resources"
              ? resources(c, l)
              : p === "whitepaper"
                ? whitepaperPage(l)
                : toolPage(c);
  const motion = `<label class="motion-setting" hidden><input type="checkbox" role="switch" id="motion-toggle" checked><span>${e(c.motionSetting)}</span></label>`;
  return `<a class="skip" href="#main">${e(c.skip)}</a><header class="site-header"><div class="wrap header-inner"><a class="brand" href="${pageUrl(l)}">${brand()}</a><nav id="navigation" aria-label="${e(c.menu)}">${nav}</nav><div class="header-controls"><label class="language-control">${icon("globe")}<span class="sr-only">${e(c.language)}</span><select id="language">${locales.map((code) => `<option value="${code}" ${code === l ? "selected" : ""}>${languageNames[code]}</option>`).join("")}</select></label><button type="button" class="icon-button" id="theme" title="${e(c.dark)}" aria-label="${e(c.dark)}">${icon("moon")}</button><button type="button" class="icon-button menu-button" id="menu" aria-label="${e(c.menu)}" aria-expanded="false" aria-controls="navigation">${icon("menu")}</button></div></div></header><main id="main">${body}</main><footer class="site-footer"><div class="wrap footer-top"><a class="brand" href="${pageUrl(l)}">${brand()}</a><p>${e(c.footer)}</p>${motion}<a href="#main" class="icon-button" aria-label="${e(c.returnHome)}">${icon("arrow-up")}</a></div><div class="wrap footer-bottom"><nav aria-label="${e(c.resources)}">${nav}${a(links.github, "GitHub")}${a(pageUrl(l, "whitepaper"), c.whitepaper)}</nav><small>© ${new Date().getFullYear()} Nito Network</small></div></footer><div id="announcement" role="status" class="sr-only"></div>`;
}
