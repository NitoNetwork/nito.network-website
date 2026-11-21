import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

const locales = ["fr", "de", "es", "nl", "ru", "cn"];

async function expectRenderedLedger(page: Page) {
  const images = page.locator(".ledger-world img, .ledger-monogram img");
  await expect(images).toHaveCount(2);
  await expect
    .poll(() =>
      images.evaluateAll((items) =>
        items.every(
          (item) =>
            (item as HTMLImageElement).complete &&
            (item as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  const image = await page.locator(".living-hero").screenshot();
  const { channels } = await sharp(image).stats();
  expect(
    channels.slice(0, 3).some(({ stdev }) => stdev > 20),
    "the cinematic hero should contain a nonblank rendered scene",
  ).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.abort());
});

test("home supports its primary interactions without layout overflow", async ({
  page,
}) => {
  await page.goto("/en/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expectRenderedLedger(page);
  const logoTrigger = page.locator(".logo-trigger");
  await expect(logoTrigger).toHaveAttribute("title", "Mine me!");
  await expect(logoTrigger).toHaveAttribute(
    "aria-label",
    "Disperse and rebuild the Nito logo",
  );
  const pickaxe = page.locator(".logo-pickaxe-cursor");
  await expect(pickaxe).toHaveCount(1);
  await expect(pickaxe).toHaveAttribute("aria-hidden", "true");
  await expect(pickaxe.locator("img")).toHaveAttribute(
    "src",
    "/media/nito-pickaxe-3d.webp",
  );
  await expect(page.locator(".ledger-monogram")).toHaveClass(
    /has-live-pickaxe/,
  );
  expect(
    await logoTrigger.evaluate((element) => getComputedStyle(element).cursor),
  ).toBe("none");
  const ledger = page.locator(".ledger-scene");
  const monogramBox = await page.locator(".ledger-monogram").boundingBox();
  expect(monogramBox).not.toBeNull();
  await page.mouse.move(
    monogramBox!.x + monogramBox!.width * 0.5,
    monogramBox!.y + monogramBox!.height * 0.5,
  );
  await expect(ledger).toHaveAttribute("data-interacting", "true");
  await expect(pickaxe).toHaveClass(/is-visible/);
  await expect(page.locator(".pickaxe-tool")).toHaveCSS(
    "animation-name",
    "pickaxe-mining",
  );
  const cursorPosition = await pickaxe.evaluate(
    (element) => getComputedStyle(element).transform,
  );
  await page.mouse.move(
    monogramBox!.x + monogramBox!.width * 0.56,
    monogramBox!.y + monogramBox!.height * 0.54,
  );
  await expect
    .poll(() =>
      pickaxe.evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe(cursorPosition);
  await page.mouse.down();
  await expect(pickaxe).toHaveClass(/is-striking/);
  await page.mouse.up();
  await expect(page.locator(".ledger-monogram")).toHaveAttribute(
    "data-fragment-state",
    "burst",
  );
  await page.mouse.move(20, 200);
  await expect(ledger).not.toHaveAttribute("data-interacting", "true");
  await expect(pickaxe).not.toHaveClass(/is-visible/);
  await expect(page.locator(".chart-data tbody tr")).toHaveCount(4);
  await expect(page.locator('[data-horizon="10"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.locator('[data-horizon="50"]').click();
  await expect(page.locator('[data-horizon="50"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".chart-data tbody tr")).toHaveCount(6);
  await expect(page.locator("#announcement")).toHaveText(
    "Block reward: 50 Years",
  );

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("#theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#theme")).toHaveAttribute(
    "aria-label",
    "Switch to dark mode",
  );

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
  expect(
    await page
      .locator(".chart-value")
      .first()
      .evaluate((element) => getComputedStyle(element).fill),
  ).not.toBe("rgb(255, 255, 255)");
});

test("hero geometry stays fixed while its images load", async ({ page }) => {
  await page.route(
    /\/media\/(?:nito-ledger-world|nito-blocks)-/,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 650));
      await route.continue();
    },
  );
  await page.goto("/en/", { waitUntil: "domcontentloaded" });
  const hero = page.locator(".living-hero");
  const monogram = page.locator(".ledger-monogram");
  const beforeHero = await hero.boundingBox();
  const beforeMonogram = await monogram.boundingBox();
  await expect
    .poll(() =>
      page
        .locator(".ledger-world img")
        .evaluate((image) => (image as HTMLImageElement).complete),
    )
    .toBe(true);
  const afterHero = await hero.boundingBox();
  const afterMonogram = await monogram.boundingBox();
  expect(afterHero).toEqual(beforeHero);
  expect(afterMonogram).toEqual(beforeMonogram);
});

test.describe("mobile", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("navigation and localized home pages remain usable", async ({
    page,
  }) => {
    for (const locale of locales) {
      await page.goto(`/${locale}/`);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
        locale,
      ).toBe(false);
      await expect(page.locator("h1")).toHaveCount(1);
      expect(
        await page
          .locator("img")
          .evaluateAll(
            (images) =>
              images.filter(
                (image) =>
                  !(image as HTMLImageElement).complete ||
                  (image as HTMLImageElement).naturalWidth === 0,
              ).length,
          ),
        locale,
      ).toBe(0);
    }

    await page.goto("/en/");
    await expectRenderedLedger(page);
    await page.locator("#menu").click();
    await expect(page.locator("#menu")).toHaveAttribute(
      "aria-label",
      "Close menu",
    );
    await expect(page.locator("#navigation")).toBeVisible();
    await page.locator("#menu").press("Escape");
    await expect(page.locator("#menu")).toBeFocused();
    await expect(page.locator("#navigation")).toBeHidden();
  });

  test("EasyNode generates, invalidates and regenerates a script", async ({
    page,
  }) => {
    await page.goto("/en/easynode/");
    await page.locator('#installer button[type="submit"]').click();
    await expect(page.locator("#script-result")).toBeVisible();
    await expect(page.locator("#script-result")).toBeFocused();
    await expect(page.locator(".install-steps article")).toHaveCount(4);

    await page.locator('select[name="arch"]').selectOption("aarch64");
    await expect(page.locator("#script-result")).toBeHidden();
    await expect(page.locator("#form-error")).toContainText(
      "Configuration changed",
    );

    await page.locator('#installer button[type="submit"]').click();
    await expect(page.locator("#script-result")).toBeVisible();
    await expect(page.locator("[data-copy]")).toHaveAttribute(
      "data-copy",
      /aarch64/,
    );
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
});

test("reduced motion and forced colors retain a usable static interface", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en/");
  expect(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
  ).toBe(true);
  await expect(page.locator(".ledger-world img")).toBeVisible();
  await expect(page.locator(".ledger-monogram img")).toBeVisible();
  const monogram = page.locator(".ledger-monogram");
  const box = await monogram.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(page.locator(".ledger-scene")).not.toHaveAttribute(
    "data-interacting",
    "true",
  );
  await expect(page.locator("#site-particles")).not.toHaveAttribute(
    "data-moving",
    "true",
  );

  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.locator("#site-particles")).toBeHidden();
  await expect(page.locator(".ledger-scene")).toBeHidden();
  await expect(
    page.getByRole("link", { name: "Choose your wallet" }),
  ).toBeVisible();
  await expect(page.locator("#theme")).toBeVisible();
});

test("key public pages have no automated accessibility violations", async ({
  page,
}) => {
  for (const path of [
    "/en/",
    "/en/network/",
    "/en/easynode/",
    "/en/wallets/",
  ]) {
    await page.goto(path);
    if (path.endsWith("/wallets/")) {
      await page.getByText("Verify your download", { exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Verify Nito Core releases" }),
      ).toBeVisible();
    }
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        targets: nodes.map((node) => node.target),
      })),
      path,
    ).toEqual([]);
  }
});
