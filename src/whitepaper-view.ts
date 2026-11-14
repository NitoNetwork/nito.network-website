import { getCopy } from "./content";
import { whitepaperCopy } from "./content/whitepaper";
import { links, type Locale } from "./data";
import { anchor, escape as e, icon } from "./html";

export function whitepaperPage(locale: Locale): string {
  const c = whitepaperCopy[locale];
  return `<header class="page-heading wrap"><span class="eyebrow">${e(c.original)}</span><h1>${e(getCopy(locale).whitepaper)}</h1><p class="lead">${e(c.intro)}</p></header>
  <div class="wrap paper-reader" data-whitepaper>
    <div class="paper-toolbar"><div class="actions"><a class="button primary" data-paper-pdf href="${links.whitepaper}Nito_Whitepaper.pdf" target="_blank" rel="noopener noreferrer">${icon("download")}${e(c.pdf)}</a>${anchor(links.whitepaper, c.source)}${anchor("https://github.com/NitoNetwork/Nito-Whitepaper", c.repository)}</div><dl class="paper-metadata" hidden></dl></div>
    <p class="paper-status" role="status"></p><button type="button" class="button secondary" data-paper-retry hidden>${e(c.retry)}</button>
    <noscript><p>${e(c.unavailable)}</p></noscript>
    <div class="paper-layout" hidden><aside class="paper-index"><nav aria-label="${e(c.contents)}"><h2>${e(c.contents)}</h2><ol></ol></nav><label class="paper-mobile-index">${e(c.chapter)}<select data-paper-chapter></select></label></aside><article class="paper-document" aria-label="${e(getCopy(locale).whitepaper)}"></article></div>
  </div>`;
}
