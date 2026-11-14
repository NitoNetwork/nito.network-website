import {
  ACTIVATION_HEIGHT,
  languageTags,
  links,
  pageUrl,
  type Locale,
} from "./data";
import { orchardTranslations } from "./content/orchard";
import { getCopy } from "./content";
import { anchor, escape as e, icon } from "./html";

export function activationBand(locale: Locale) {
  const c = orchardTranslations[locale];
  const target = new Intl.NumberFormat(languageTags[locale]).format(
    ACTIVATION_HEIGHT,
  );
  return `<section class="activation-band" id="activation" aria-labelledby="activation-heading" data-activation>
    <div class="wrap activation-layout">
      <div class="activation-copy"><span class="eyebrow">${e(c.eyebrow)}</span><h2 id="activation-heading">${e(c.title)}</h2><p data-activation-intro>${e(c.intro)}</p>${anchor(pageUrl(locale, "network") + "#orchard", c.learn)}</div>
      <div class="activation-data"><p class="activation-status" role="status" data-activation-status>${e(c.unavailable)}</p>
        <dl class="activation-stats">
          <div class="activation-key"><dt>${e(c.remaining)}</dt><dd data-activation-remaining>—</dd></div>
          <div class="activation-key"><dt>${e(c.eta)}</dt><dd data-activation-eta>—</dd></div>
          <div><dt>${e(c.height)}</dt><dd data-activation-height>—</dd></div>
          <div><dt>${e(c.target)}</dt><dd>${target}</dd></div>
        </dl>
        <p class="activation-date">${icon("timer")}<span>${e(c.estimatedDate)} <strong data-activation-date>—</strong></span></p>
        <p class="activation-estimate-note">${e(c.estimateNote)}</p>
        <div class="activation-meta"><span>${e(c.updated)} <time data-activation-updated>—</time></span>${anchor(links.mempool, c.source)}</div>
      </div>
    </div>
  </section>`;
}

export function orchardDetails(locale: Locale) {
  const c = orchardTranslations[locale];
  return `<div class="orchard-details">
    <div class="orchard-explanation"><h3>${e(c.distinctionTitle)}</h3><p>${e(c.distinction)}</p></div>
    <div class="orchard-flow"><h3>${e(c.flowTitle)}</h3><ol>${[
      ["key-round", c.notesTitle, c.notes],
      ["scan-line", c.proofTitle, c.proof],
      ["network", c.nullifierTitle, c.nullifier],
    ]
      .map(
        ([symbol, title, text], i) =>
          `<li><span class="orchard-step">${icon(symbol)}<span>0${i + 1}</span></span><h4>${e(title)}</h4><p>${e(text)}</p></li>`,
      )
      .join("")}</ol></div>
    <div class="orchard-boundaries"><div><h3>${e(c.scopeTitle)}</h3><p>${e(c.scope)}</p></div><div><h3>${e(c.benefitTitle)}</h3><p>${e(c.benefit)}</p></div></div>
    <div class="orchard-operators"><h3>${e(c.operatorsTitle)}</h3><p>${e(c.operators)}</p><div class="actions">${anchor(links.core, getCopy(locale).allReleases)}${anchor("https://zips.z.cash/zip-0224", c.specification)}</div></div>
  </div>`;
}
