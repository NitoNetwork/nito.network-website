import { build as viteBuild } from "vite";
import { build as bundle } from "esbuild";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

await viteBuild();
await mkdir("dist/licenses", { recursive: true });
await copyFile(
  "node_modules/dompurify/LICENSE",
  "dist/licenses/DOMPurify-Apache-2.0.txt",
);
await writeFile(
  "dist/licenses/DOMPurify-NOTICE.txt",
  "DOMPurify 3.4.18\nCopyright Cure53 and other contributors.\nhttps://github.com/cure53/DOMPurify\nUsed under Apache-2.0. Source is not modified.\n",
);
await mkdir(".cache", { recursive: true });
await bundle({
  entryPoints: ["src/render.ts", "src/data.ts", "src/html.ts"],
  outdir: ".cache",
  bundle: true,
  platform: "node",
  format: "esm",
  outExtension: { ".js": ".mjs" },
});
const { render, description } = await import(
  pathToFileURL(resolve(".cache/render.mjs"))
);
const { locales, pages, languageTags, pageUrl, ACTIVATION_HEIGHT } =
  await import(pathToFileURL(resolve(".cache/data.mjs")));
const base = await readFile("dist/index.html", "utf8");
const { escape: escapeHtml } = await import(
  pathToFileURL(resolve(".cache/html.mjs"))
);
const production = !process.argv.includes("--test");
const origin = "https://nito.network";
await writeFile(
  "dist/data/activation-config.json",
  JSON.stringify({ activationHeight: ACTIVATION_HEIGHT }) + "\n",
);
const socialLocales = {
  en: "en_US",
  fr: "fr_FR",
  de: "de_DE",
  es: "es_ES",
  nl: "nl_NL",
  ru: "ru_RU",
  cn: "zh_CN",
};
const socialImage = `${origin}/media/nito-logo-256.png`;
function documentFor(lang, page, valid = true) {
  const body = render(lang, page, valid);
  const h1 =
    body.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1].replace(/<[^>]+>/g, "") ??
    "Nito Network";
  const title =
    valid && page === "home" ? "Nito Network" : `${h1} · Nito Network`;
  const summary = valid ? escapeHtml(description(lang, page)) : h1;
  const url = `${origin}${valid ? pageUrl(lang, page) : "/404.html"}`;
  const metadata = [
    `<meta name="robots" content="${valid && production ? "index,follow,max-image-preview:large" : "noindex,nofollow"}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Nito Network">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${summary}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:locale" content="${socialLocales[lang]}">`,
    `<meta property="og:image" content="${socialImage}">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:width" content="256">`,
    `<meta property="og:image:height" content="256">`,
    `<meta property="og:image:alt" content="Nito Network">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${summary}">`,
    `<meta name="twitter:image" content="${socialImage}">`,
    `<meta name="twitter:image:alt" content="Nito Network">`,
  ];
  if (valid) {
    metadata.push(`<link rel="canonical" href="${url}">`);
    for (const code of locales) {
      metadata.push(
        `<link rel="alternate" hreflang="${languageTags[code]}" href="${origin}${pageUrl(code, page)}">`,
      );
      if (code !== lang)
        metadata.push(
          `<meta property="og:locale:alternate" content="${socialLocales[code]}">`,
        );
    }
    metadata.push(
      `<link rel="alternate" hreflang="x-default" href="${origin}${pageUrl("en", page)}">`,
    );
  }
  return base
    .replace('lang="en"', `lang="${languageTags[lang]}"`)
    .replace('data-page="home"', `data-page="${valid ? page : "not-found"}"`)
    .replace('<div id="app"></div>', () => `<div id="app">${body}</div>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/,
      () => `<meta name="description" content="${summary}">`,
    )
    .replace(/<meta\s+name="robots"\s+content="[^"]*"\s*\/?\s*>/, "")
    .replace("<title>Nito Network</title>", () => `<title>${title}</title>`)
    .replace("</head>", () => `${metadata.join("\n")}\n</head>`);
}
let count = 0;
for (const lang of locales) {
  for (const page of pages) {
    const url = pageUrl(lang, page),
      dir = "dist" + url;
    await mkdir(dir, { recursive: true });
    await writeFile(dir + "index.html", documentFor(lang, page));
    count++;
  }
}
await writeFile("dist/404.html", documentFor("en", "home", false));
await writeFile("dist/index.html", documentFor("en", "home"));
const old = { downloads: "wallets", mobile: "wallets", mining: "participate" };
for (const lang of locales)
  for (const [before, after] of Object.entries(old)) {
    const dir = `dist/${lang}/${before}/`;
    await mkdir(dir, { recursive: true });
    await copyFile(`dist/${lang}/${after}/index.html`, dir + "index.html");
  }
{
  const dir = "dist/tools/easynode/";
  await mkdir(dir, { recursive: true });
  await writeFile(dir + "index.html", documentFor("en", "easynode"));
}
await writeFile(
  "dist/robots.txt",
  production
    ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n",
);
await writeFile(
  "dist/sitemap.xml",
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    locales
      .flatMap((lang) =>
        pages.map(
          (page) =>
            `  <url><loc>${escapeHtml(origin + pageUrl(lang, page))}</loc></url>`,
        ),
      )
      .join("\n") +
    "\n</urlset>\n",
);
const sha =
  process.env.DEPLOY_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
await writeFile(
  "dist/build.json",
  JSON.stringify({
    commit: sha,
    built: new Date().toISOString(),
    pages: count,
    origin,
    indexable: production,
  }) + "\n",
);
console.log(
  `${count} localized pages generated for ${origin} (${production ? "indexable" : "test"}).`,
);
