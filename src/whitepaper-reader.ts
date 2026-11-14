import DOMPurify from "dompurify";
import { whitepaperCopy } from "./content/whitepaper";
import { languageTags, type Locale } from "./data";
import { escape as e } from "./html";

const revisionPattern = /^[0-9a-f]{40}$/;
type Chapter = { id: string; title: string };

export function installWhitepaper(root: HTMLElement, locale: Locale) {
  const c = whitepaperCopy[locale];
  const status = root.querySelector<HTMLElement>(".paper-status")!;
  const retry = root.querySelector<HTMLButtonElement>("[data-paper-retry]")!;
  const article = root.querySelector<HTMLElement>(".paper-document")!;
  const layout = root.querySelector<HTMLElement>(".paper-layout")!;
  const select = root.querySelector<HTMLSelectElement>("[data-paper-chapter]")!;
  let pending: AbortController | undefined;
  let observer: IntersectionObserver | undefined;
  let loaded = false;

  function navigate(id: string) {
    const section = article.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!section) return;
    history.replaceState(null, "", `#${id}`);
    section.scrollIntoView({ behavior: "instant", block: "start" });
    section.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    select.value = id;
  }
  root.querySelector(".paper-index ol")!.addEventListener("click", (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>("a");
    if (!link || (event as MouseEvent).ctrlKey || (event as MouseEvent).metaKey)
      return;
    event.preventDefault();
    navigate(link.hash.slice(1));
  });
  select.addEventListener("change", () => navigate(select.value));

  async function load() {
    if (pending || loaded) return;
    const controller = new AbortController();
    pending = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    retry.hidden = true;
    status.textContent = c.loading;
    status.classList.remove("sr-only");
    try {
      const read = async (url: string) => {
        const response = await fetch(url, {
          signal: controller.signal,
          credentials: "omit",
        });
        if (!response.ok) throw new Error("Unavailable document");
        const text = await response.text();
        if (text.length > 3_000_000) throw new Error("Oversized document");
        return JSON.parse(text);
      };
      const meta = await read("/whitepaper-data/current.json");
      if (
        meta.schema !== 1 ||
        !revisionPattern.test(meta.revision) ||
        !Number.isSafeInteger(meta.publishedAt) ||
        meta.publishedAt <= 0 ||
        !Number.isInteger(meta.chapterCount) ||
        meta.chapterCount < 1 ||
        meta.chapterCount > 200
      )
        throw new Error("Invalid publication");
      const base = `/whitepaper-data/${meta.revision}/`;
      const doc = await read(base + "document.json");
      if (
        doc.schema !== 1 ||
        doc.revision !== meta.revision ||
        typeof doc.language !== "string" ||
        !/^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{2,8})*$/.test(doc.language) ||
        typeof doc.html !== "string" ||
        !Array.isArray(doc.chapters) ||
        doc.chapters.length !== meta.chapterCount
      )
        throw new Error("Invalid document");
      const chapters: Chapter[] = doc.chapters;
      if (
        chapters.some(
          (chapter) =>
            typeof chapter.id !== "string" ||
            !/^wp-[a-zA-Z][a-zA-Z0-9_-]{0,120}$/.test(chapter.id) ||
            typeof chapter.title !== "string" ||
            !chapter.title.trim() ||
            chapter.title.length > 500,
        ) ||
        new Set(chapters.map(({ id }) => id)).size !== chapters.length
      )
        throw new Error("Invalid index");
      const fragment = DOMPurify.sanitize(doc.html, {
        ALLOWED_TAGS: [
          "section",
          "h2",
          "h3",
          "h4",
          "p",
          "div",
          "span",
          "strong",
          "em",
          "b",
          "i",
          "table",
          "caption",
          "thead",
          "tbody",
          "tfoot",
          "tr",
          "th",
          "td",
          "code",
          "pre",
          "a",
          "ul",
          "ol",
          "li",
          "sup",
          "sub",
          "br",
          "hr",
          "blockquote",
          "dl",
          "dt",
          "dd",
        ],
        ALLOWED_ATTR: [
          "id",
          "class",
          "href",
          "scope",
          "colspan",
          "rowspan",
          "role",
          "tabindex",
          "aria-label",
          "aria-labelledby",
        ],
        ALLOW_DATA_ATTR: false,
        RETURN_DOM_FRAGMENT: true,
      });
      fragment.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href") ?? "";
        if (href.startsWith("https://")) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        } else if (!/^#wp-[a-zA-Z][a-zA-Z0-9_-]*$/.test(href)) {
          a.removeAttribute("href");
        }
      });
      const sections = fragment.querySelectorAll("section.chapter");
      if (
        sections.length !== chapters.length ||
        chapters.some(
          (chapter, i) =>
            sections[i].id !== chapter.id ||
            sections[i]
              .querySelector("h2")
              ?.textContent?.replace(/\s+/g, " ")
              .trim() !== chapter.title,
        )
      )
        throw new Error("Index/content mismatch");
      article.replaceChildren(fragment);
      article.lang = doc.language;
      root.querySelector(".paper-index ol")!.innerHTML = chapters
        .map(
          (chapter) =>
            `<li><a href="#${e(chapter.id)}" lang="${e(doc.language)}">${e(chapter.title)}</a></li>`,
        )
        .join("");
      select.lang = doc.language;
      select.innerHTML = chapters
        .map(
          (chapter) =>
            `<option value="${e(chapter.id)}">${e(chapter.title)}</option>`,
        )
        .join("");
      const metadata = root.querySelector<HTMLElement>(".paper-metadata")!;
      const language =
        new Intl.DisplayNames([languageTags[locale]], { type: "language" }).of(
          doc.language,
        ) ?? doc.language;
      const date = new Date(meta.publishedAt * 1000);
      metadata.innerHTML = `<div><dt>${e(c.language)}</dt><dd>${e(language)}</dd></div><div><dt>${e(c.published)}</dt><dd><time datetime="${date.toISOString()}">${e(new Intl.DateTimeFormat(languageTags[locale], { dateStyle: "long" }).format(date))}</time></dd></div><div><dt>${e(c.revision)}</dt><dd><a href="https://github.com/NitoNetwork/Nito-Whitepaper/commit/${meta.revision}" target="_blank" rel="noopener noreferrer">${meta.revision.slice(0, 7)}</a></dd></div>`;
      metadata.hidden = false;
      const pdf = root.querySelector<HTMLAnchorElement>("[data-paper-pdf]")!;
      pdf.href = base + "Nito_Whitepaper.pdf";
      pdf.download = "Nito_Whitepaper.pdf";
      layout.hidden = false;
      loaded = true;
      status.textContent = c.ready;
      status.classList.add("sr-only");
      if (location.hash.startsWith("#wp-")) navigate(location.hash.slice(1));
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries)
            if (entry.isIntersecting) {
              select.value = entry.target.id;
              root
                .querySelectorAll<HTMLAnchorElement>(".paper-index a")
                .forEach((a) => {
                  if (a.hash === `#${entry.target.id}`)
                    a.setAttribute("aria-current", "location");
                  else a.removeAttribute("aria-current");
                });
            }
        },
        { rootMargin: "-110px 0px -55% 0px", threshold: 0 },
      );
      article
        .querySelectorAll("section.chapter")
        .forEach((section) => observer!.observe(section));
    } catch {
      status.textContent = c.unavailable;
      retry.hidden = false;
    } finally {
      clearTimeout(timeout);
      pending = undefined;
    }
  }
  retry.addEventListener("click", () => void load());
  addEventListener("pagehide", () => {
    pending?.abort();
    observer?.disconnect();
  });
  addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    if (!loaded) void load();
    else
      article
        .querySelectorAll("section.chapter")
        .forEach((section) => observer?.observe(section));
  });
  void load();
}
