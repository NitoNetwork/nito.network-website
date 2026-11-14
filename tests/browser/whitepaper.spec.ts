import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { whitepaperCopy } from "../../src/content/whitepaper";
import { locales } from "../../src/data";

const revision = "a".repeat(40);
const chapters = [
  { id: "wp-overview", title: "Overview" },
  { id: "wp-orchard", title: "Orchard cryptography" },
];
const meta = { schema: 1, revision, publishedAt: 1794670524, chapterCount: 2 };
const paper = {
  schema: 1,
  revision,
  language: "en",
  chapters,
  html: chapters
    .map(
      ({ id, title }) =>
        `<section class="chapter" id="${id}" aria-labelledby="${id}-title"><h2 id="${id}-title" tabindex="-1">${title}</h2><p>${"Nito protocol documentation. ".repeat(50)}</p><p><a href="https://example.org/reference">Protocol reference</a></p></section>`,
    )
    .join(""),
};

test.use({ reducedMotion: "reduce" });
test.beforeEach(async ({ page }) => {
  await page.route("**/whitepaper-data/current.json", (r) =>
    r.fulfill({ json: meta }),
  );
  await page.route(`**/whitepaper-data/${revision}/document.json`, (r) =>
    r.fulfill({ json: paper }),
  );
});

test("localized controls keep the official language and only fetch same-origin data", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:"))
      external.push(request.url());
  });
  for (const locale of locales) {
    await page.goto(`/${locale}/whitepaper/`);
    await expect(page.locator(".paper-document .chapter")).toHaveCount(2);
    await expect(page.locator(".paper-document")).toHaveAttribute("lang", "en");
    await expect(page.locator("[data-paper-pdf]")).toHaveText(
      whitepaperCopy[locale].pdf,
    );
    await expect(page.locator("[data-paper-pdf]")).toHaveAttribute(
      "href",
      `/whitepaper-data/${revision}/Nito_Whitepaper.pdf`,
    );
    await expect(page.locator("#navigation a[aria-current]")).toHaveAttribute(
      "href",
      `/${locale}/resources/`,
    );
  }
  expect(external).toEqual([]);
});

test("chapter navigation works with keyboard, hash links and mobile select", async ({
  page,
}) => {
  await page.goto("/fr/whitepaper/");
  const link = page.locator('.paper-index a[href="#wp-orchard"]');
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#wp-orchard$/);
  await expect(page.locator("#wp-orchard-title")).toBeFocused();
  expect(
    await page
      .locator("#wp-orchard")
      .evaluate((element) => element.getBoundingClientRect().top),
  ).toBeGreaterThanOrEqual(100);
  await page.setViewportSize({ width: 320, height: 850 });
  await page.locator("[data-paper-chapter]").selectOption("wp-overview");
  await expect(page.locator("#wp-overview-title")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/en/whitepaper/#wp-orchard");
  await expect(page.locator("#wp-orchard-title")).toBeFocused();
});

test("failure keeps official links and retry recovers without reloading the page", async ({
  page,
}) => {
  await page.route("**/whitepaper-data/current.json", (r) =>
    r.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/fr/whitepaper/");
  await expect(page.locator(".paper-status")).toHaveText(
    whitepaperCopy.fr.unavailable,
  );
  await expect(page.locator("[data-paper-pdf]")).toHaveAttribute(
    "href",
    "https://nitonetwork.github.io/Nito-Whitepaper/Nito_Whitepaper.pdf",
  );
  await page.route("**/whitepaper-data/current.json", (r) =>
    r.fulfill({ json: meta }),
  );
  await page.locator("[data-paper-retry]").click();
  await expect(page.locator(".paper-document .chapter")).toHaveCount(2);
});

test("untrusted markup is sanitized and mismatched revisions are rejected", async ({
  page,
}) => {
  await page.route(`**/whitepaper-data/${revision}/document.json`, (r) =>
    r.fulfill({
      json: {
        ...paper,
        html:
          paper.html +
          '<script>window.compromised=true</script><img src=x onerror="window.compromised=true"><iframe src="https://example.org"></iframe>',
      },
    }),
  );
  await page.goto("/fr/whitepaper/");
  await expect(page.locator(".paper-document .chapter")).toHaveCount(2);
  await expect(
    page.locator(
      ".paper-document script, .paper-document iframe, .paper-document img",
    ),
  ).toHaveCount(0);
  expect(await page.evaluate(() => "compromised" in window)).toBe(false);
  await page.route(`**/whitepaper-data/${revision}/document.json`, (r) =>
    r.fulfill({ json: { ...paper, revision: "b".repeat(40) } }),
  );
  await page.reload();
  await expect(page.locator(".paper-status")).toHaveText(
    whitepaperCopy.fr.unavailable,
  );
});

test("reader meets automated accessibility checks at desktop and narrow mobile sizes", async ({
  page,
}) => {
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 950 });
    for (const theme of ["light", "dark"]) {
      await page.addInitScript(
        (value) => localStorage.setItem("nito-theme", value),
        theme,
      );
      await page.goto("/fr/whitepaper/");
      await expect(page.locator(".paper-document .chapter")).toHaveCount(2);
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("official fallbacks work without JavaScript and PDF downloads remain on this site", async ({
  browser,
  page,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const staticPage = await context.newPage();
    await staticPage.goto("http://127.0.0.1:4177/fr/whitepaper/");
    await expect(staticPage.locator("[data-paper-pdf]")).toBeVisible();
    await expect(
      staticPage.getByRole("link", { name: "Site officiel", exact: true }),
    ).toBeVisible();
    await expect(staticPage.locator("noscript p")).toHaveText(
      whitepaperCopy.fr.unavailable,
    );
    await expect(staticPage.locator("noscript p")).toBeVisible();
  } finally {
    await context.close();
  }
  await page.route(`**/whitepaper-data/${revision}/Nito_Whitepaper.pdf`, (r) =>
    r.fulfill({ contentType: "application/pdf", body: "%PDF-1.7\n%%EOF\n" }),
  );
  await page.goto("/fr/whitepaper/");
  await expect(page.locator(".paper-document .chapter")).toHaveCount(2);
  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-paper-pdf]").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Nito_Whitepaper.pdf");
  expect(download.url()).toContain(
    `/whitepaper-data/${revision}/Nito_Whitepaper.pdf`,
  );
});
