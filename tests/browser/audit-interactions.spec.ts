import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { en } from "../../src/content/en";
import { fr } from "../../src/content/fr";
import { languageTags, locales, pages, pageUrl } from "../../src/data";
import type { Release } from "../../src/releases";

const core = JSON.parse(
  await readFile("public/data/core.json", "utf8"),
) as Release;

test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.abort());
});

test("keyboard opening enters mobile navigation and Escape restores focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/");
  const menu = page.locator("#menu");
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#navigation a").first()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#navigation a").nth(1)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(page.locator("#navigation")).toBeHidden();
});

test("localized HTTP 404 recovers to a valid language home", async ({
  page,
}) => {
  const fallback = await readFile("dist/404.html", "utf8");
  await page.route("**/fr/no-such-page/", (route) =>
    route.fulfill({
      status: 404,
      contentType: "text/html",
      body: fallback,
    }),
  );
  const response = await page.goto("/fr/no-such-page/");
  expect(response?.status()).toBe(404);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("html")).toHaveAttribute("data-page", "not-found");
  await expect(page.locator("h1")).toHaveText(fr.notFound);
  await expect(page.locator("#language")).toHaveValue("fr");
  await expect(page.locator("#navigation a").first()).toHaveAttribute(
    "href",
    "/fr/",
  );
  await page.locator("#language").selectOption("de");
  await expect(page).toHaveURL(/\/de\/$/);
  await expect(page.locator("html")).toHaveAttribute("data-page", "home");
});

test("reload intentionally removes fragments and always returns to top", async ({
  page,
}) => {
  await page.goto("/en/network/#issuance");
  await expect(page).toHaveURL(/#issuance$/);
  await page.evaluate(() =>
    scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
  );
  await page.reload();
  await expect(page).toHaveURL(/\/en\/network\/$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});

test("generation exposes pending state, blocks concurrent submits and rejects changed input", async ({
  page,
}) => {
  let requests = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("https://api.github.com/**", async (route) => {
    requests++;
    await pending;
    await route.abort();
  });
  await page.goto("/en/easynode/");
  const form = page.locator("#installer");
  const submit = form.locator("button[type=submit]");
  try {
    await submit.click();
    await expect(form).toHaveAttribute("aria-busy", "true");
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveText(en.loading);
    await expect(page.locator("#announcement")).toHaveText(en.loading);
    await expect.poll(() => requests).toBe(1);
    await form.evaluate((element) => {
      element.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      element.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(requests).toBe(1);
    await page.locator('select[name="arch"]').selectOption("aarch64");
  } finally {
    release();
  }
  await expect(form).toHaveAttribute("aria-busy", "false");
  await expect(submit).toBeEnabled();
  await expect(submit).toHaveText(en.generate);
  await expect(page.locator("#form-error")).toHaveText(en.changed);
  await expect(page.locator("#script-result")).toBeHidden();
  await submit.click();
  await expect(page.locator("#script-result")).toBeVisible();
  await expect(page.locator("#script-result [data-copy]")).toHaveAttribute(
    "data-copy",
    /aarch64/,
  );
  expect(requests).toBe(1);
});

for (const failure of ["network", "http", "metadata"] as const) {
  test(`release ${failure} failure is not reported as invalid settings`, async ({
    page,
  }) => {
    await page.route("**/data/core.json", (route) =>
      failure === "network"
        ? route.abort()
        : route.fulfill({
            status: failure === "http" ? 503 : 200,
            contentType: "application/json",
            body: "{}",
          }),
    );
    await page.goto("/en/easynode/");
    await page.locator('#installer button[type="submit"]').click();
    await expect(page.locator("#form-error")).toHaveText(en.unavailable);
    await expect(page.locator("#installer")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await expect(
      page.locator('#installer button[type="submit"]'),
    ).toBeEnabled();
    await expect(page.locator("#script-result")).toBeHidden();
  });
}

test("configuration conflict and unreviewed source release have distinct errors", async ({
  page,
}) => {
  await page.goto("/en/easynode/");
  await page.locator('select[name="storage"]').selectOption("pruned");
  await page.locator('input[name="txindex"]').check();
  await page.locator('#installer button[type="submit"]').click();
  await expect(page.locator("#form-error")).toHaveText(en.conflict);
  await page.locator('input[name="txindex"]').uncheck();
  await page.locator('select[name="os"]').selectOption("ubuntu-20.04");
  await page.route("**/data/core.json", (route) =>
    route.fulfill({
      json: {
        ...core,
        tag: "v999.0.0",
        assets: core.assets.map((asset) => ({
          ...asset,
          url: asset.url.replace(
            `/download/${core.tag}/`,
            "/download/v999.0.0/",
          ),
        })),
      },
    }),
  );
  await page.locator('#installer button[type="submit"]').click();
  await expect(page.locator("#form-error")).toHaveText(en.sourceUnavailable);
});

test("copy feedback is visible on success and denial and download matches the script", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let copied = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          copied = text;
        },
        readText: async () => copied,
      },
    });
  });
  await page.goto("/en/easynode/");
  await page.locator('#installer button[type="submit"]').click();
  const copy = page.locator("#script-result [data-copy]");
  await expect(copy).toBeVisible();
  const script = await copy.getAttribute("data-copy");
  await copy.click();
  await expect(copy).toHaveAttribute("data-copy-state", "success");
  await expect(page.locator(".copy-status")).toBeVisible();
  await expect(page.locator(".copy-status")).toHaveText(en.copied);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    script,
  );
  const pendingDownload = page.waitForEvent("download");
  await page.locator("#download-script").click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe("install-nito-node.sh");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(Buffer.concat(chunks).toString("utf8")).toBe(script);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      },
    }),
  );
  await copy.click();
  await expect(copy).toHaveAttribute("data-copy-state", "error");
  await expect(copy).toBeEnabled();
  await expect(page.locator(".copy-status")).toBeVisible();
  await expect(page.locator(".copy-status")).toHaveText(en.copyFail);
});

test("wallet checksums copy with visible feedback and safe fallback links", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async () => {} },
    }),
  );
  await page.goto("/en/wallets/");
  await expect(page.locator("#core-downloads")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(
    page.locator('#core-downloads a[href*="/download/"]'),
  ).toHaveCount(core.assets.length);
  await page.locator("details.disclosure summary").click();
  const copy = page.locator("#checksums [data-copy]").first();
  await copy.click();
  await expect(copy).toHaveAttribute("data-copy-state", "success");
  await expect(page.locator("#checksums .copy-status")).toHaveText(en.copied);
});

test("all prerendered routes carry localized social metadata and static page identity", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  await page.goto("/en/");
  for (const locale of locales)
    for (const name of pages) {
      const path = pageUrl(locale, name);
      const response = await request.get(path);
      expect(response.ok(), path).toBe(true);
      const result = await page.evaluate(
        (html) => {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const meta = (selector: string) =>
            doc.querySelector(selector)?.getAttribute("content");
          return {
            lang: doc.documentElement.lang,
            page: doc.documentElement.dataset.page,
            title: doc.title,
            description: meta('meta[name="description"]'),
            ogTitle: meta('meta[property="og:title"]'),
            ogDescription: meta('meta[property="og:description"]'),
            twitterTitle: meta('meta[name="twitter:title"]'),
            twitterDescription: meta('meta[name="twitter:description"]'),
            canonical: doc
              .querySelector('link[rel="canonical"]')
              ?.getAttribute("href"),
            ogUrl: meta('meta[property="og:url"]'),
            ogLocale: meta('meta[property="og:locale"]'),
            image: meta('meta[property="og:image"]'),
            twitterImage: meta('meta[name="twitter:image"]'),
            robots: meta('meta[name="robots"]'),
            alternates: doc.querySelectorAll("link[hreflang]").length,
          };
        },
        await response.text(),
      );
      expect(result.lang, path).toBe(languageTags[locale]);
      expect(result.page, path).toBe(name);
      expect(result.ogTitle, path).toBe(result.title);
      expect(result.twitterTitle, path).toBe(result.title);
      expect(result.ogDescription, path).toBe(result.description);
      expect(result.twitterDescription, path).toBe(result.description);
      expect(result.canonical, path).toBe(`https://nito.network${path}`);
      expect(result.ogUrl, path).toBe(result.canonical);
      expect(result.ogLocale, path).toMatch(
        new RegExp(`^${locale === "cn" ? "zh" : locale}_`),
      );
      expect(result.image, path).toBe(
        "https://nito.network/media/nito-logo-256.png",
      );
      expect(result.twitterImage, path).toBe(result.image);
      expect(result.robots, path).toBe("noindex,nofollow");
      expect(result.alternates, path).toBe(8);
    }
  const sitemap = await request.get("/sitemap.xml");
  const urls = await page.evaluate(
    (xml) => {
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      if (doc.querySelector("parsererror"))
        throw new Error("Invalid sitemap XML");
      return [...doc.querySelectorAll("url > loc")].map(
        (node) => node.textContent,
      );
    },
    await sitemap.text(),
  );
  expect(urls).toEqual(
    locales.flatMap((locale) =>
      pages.map((name) => `https://nito.network${pageUrl(locale, name)}`),
    ),
  );
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );
});
