import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ACTIVATION_HEIGHT } from "../../src/data";
import { orchardTranslations } from "../../src/content/orchard";

function snapshot(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    schema: 1,
    activationHeight: ACTIVATION_HEIGHT,
    height: 1_100_000,
    bestBlockHash: "a".repeat(64),
    blockTime: now - 20,
    observedAt: now,
    remaining: ACTIVATION_HEIGHT - 1_100_000,
    windowBlocks: 1440,
    secondsPerBlock: 63,
    confirmed: false,
    ...overrides,
  };
}
test.use({ reducedMotion: "reduce" });
test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/**", (r) => r.abort());
});

test("shared snapshot renders real values, localized dates and internal navigation", async ({
  page,
}) => {
  let explorerRequests = 0;
  page.on("request", (r) => {
    if (r.url().startsWith("https://mempool-explorer")) explorerRequests++;
  });
  await page.route("**/data/activation.json", (r) =>
    r.fulfill({ json: snapshot() }),
  );
  await page.goto("/fr/");
  const section = page.locator("#activation");
  await expect(section.locator("[data-activation-status]")).toHaveText(
    orchardTranslations.fr.scheduled,
  );
  await expect(section.locator("[data-activation-remaining]")).toHaveText(
    /65\s*432/,
  );
  await expect(section.locator("[data-activation-eta]")).toHaveText(
    "47 j 17 h",
  );
  await expect(section.locator("[data-activation-date]")).not.toHaveText("—");
  expect(explorerRequests).toBe(0);
  await section.getByRole("link", { name: "Comprendre Orchard" }).click();
  await expect(page).toHaveURL(/\/fr\/network\/#orchard$/);
  await expect(
    page.getByRole("heading", {
      name: orchardTranslations.fr.distinctionTitle,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: orchardTranslations.fr.specification }),
  ).toHaveAttribute("target", "_blank");
});

test("stale, missing, invalid, stalled and confirmed data have honest distinct states", async ({
  page,
}) => {
  for (const [response, label, eta] of [
    [
      snapshot({ observedAt: Math.floor(Date.now() / 1000) - 400 }),
      "stale",
      "—",
    ],
    [
      snapshot({ blockTime: Math.floor(Date.now() / 1000) - 4000 }),
      "slow",
      "—",
    ],
    [
      snapshot({ height: ACTIVATION_HEIGHT, remaining: 0 }),
      "reached",
      orchardTranslations.fr.pending,
    ],
    [
      snapshot({ height: ACTIVATION_HEIGHT, remaining: 0, confirmed: true }),
      "active",
      "—",
    ],
    [{ wrong: true }, "unavailable", "—"],
    [null, "unavailable", "—"],
  ] as const) {
    await page.route("**/data/activation.json", (r) =>
      response
        ? r.fulfill({ json: response })
        : r.fulfill({ status: 503, body: "Unavailable" }),
    );
    await page.goto("/fr/");
    await expect(page.locator("[data-activation-status]")).toHaveText(
      orchardTranslations.fr[label],
    );
    await expect(page.locator("[data-activation-eta]")).toHaveText(eta);
    if (label === "active")
      await expect(page.locator("[data-activation-intro]")).toHaveText(
        orchardTranslations.fr.activeIntro,
      );
    await page.unroute("**/data/activation.json");
  }
});

test("polling is bounded, stops in hidden pages and retains last valid data on failure", async ({
  page,
}) => {
  await page.clock.install();
  let requests = 0;
  await page.route("**/data/activation.json", (r) => {
    requests++;
    return requests === 1
      ? r.fulfill({ json: snapshot() })
      : r.fulfill({ status: 503, body: "Unavailable" });
  });
  await page.goto("/en/");
  await expect(page.locator("[data-activation-status]")).toHaveText(
    orchardTranslations.en.scheduled,
  );
  await page.clock.fastForward(59_000);
  expect(requests).toBe(1);
  await page.clock.fastForward(7000);
  await expect(page.locator("[data-activation-status]")).toHaveText(
    orchardTranslations.en.stale,
  );
  expect(requests).toBe(2);
  await expect(page.locator("[data-activation-height]")).toHaveText(
    "1,100,000",
  );
  await expect(page.locator("[data-activation-eta]")).toHaveText("—");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(300_000);
  expect(requests).toBe(2);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(100);
  await expect.poll(() => requests).toBe(3);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    ),
  );
  await page.clock.fastForward(300_000);
  expect(requests).toBe(3);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true }),
    ),
  );
  await page.clock.fastForward(100);
  await expect.poll(() => requests).toBe(4);
});

test("seven locales reflow with accessible activation and technical content", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.route("**/data/activation.json", (r) =>
    r.fulfill({ json: snapshot() }),
  );
  for (const locale of ["en", "fr", "de", "es", "nl", "ru", "cn"] as const) {
    for (const path of ["", "network/"]) {
      await page.setViewportSize({ width: 320, height: 812 });
      await page.goto(`/${locale}/${path}`);
      const region = page.locator(path ? "#orchard" : "#activation");
      await region.scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const results = await new AxeBuilder({ page })
        .include(path ? "#orchard" : "#activation")
        .analyze();
      expect(results.violations).toEqual([]);
      if (!path)
        await expect(region.locator("[data-activation-status]")).toHaveText(
          orchardTranslations[locale].scheduled,
        );
    }
  }
});
