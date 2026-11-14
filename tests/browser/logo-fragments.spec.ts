import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
for (const width of [1440, 1024, 390])
  test(`logo reconstructs from actual rendered pixels at ${width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: width === 390,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto("/fr/");
      const host = page.locator(".ledger-monogram"),
        canvas = page.locator(".logo-fragments");
      const setMotion = async (enabled: boolean) => {
        await page.locator("#motion-toggle").setChecked(enabled);
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      };
      await expect(host).toHaveAttribute("data-fragment-state", "wave");
      const pixels = async () =>
        createHash("sha256")
          .update(
            await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL()),
          )
          .digest("hex");
      const a = await pixels();
      await page.waitForTimeout(2700);
      expect(await pixels()).not.toBe(a);
      await mkdir(".cache/audit/fragments", { recursive: true });
      await page.screenshot({
        path: `.cache/audit/fragments/wave-${width}.png`,
      });
      await expect(page.locator(".logo-pause")).toHaveCount(0);
      await setMotion(false);
      await expect(host).toHaveAttribute("data-fragment-state", "static");
      const rest = await pixels();
      await page.waitForTimeout(200);
      expect(await pixels()).toBe(rest);
      await setMotion(true);
      await expect(host).toHaveAttribute("data-fragment-state", "wave");
      await page.locator(".logo-trigger").focus();
      if (width === 390) await page.locator(".logo-trigger").tap();
      else await page.locator(".logo-trigger").press("Enter");
      await expect(host).toHaveAttribute("data-fragment-state", "burst");
      await page.waitForTimeout(900);
      expect(await pixels()).not.toBe(rest);
      await page.screenshot({
        path: `.cache/audit/fragments/burst-${width}.png`,
      });
      await expect(host).toHaveAttribute("data-fragment-state", "wave", {
        timeout: 5000,
      });
      await setMotion(false);
      expect(await pixels()).toBe(rest);
      await page.mouse.move(5, 5);
      await page.screenshot({
        path: `.cache/audit/fragments/rest-${width}.png`,
      });
      await setMotion(true);
      await expect(host).toHaveAttribute("data-fragment-state", "wave");
      await page.locator(".site-footer").scrollIntoViewIfNeeded();
      await expect(host).toHaveAttribute("data-fragment-state", "static");
      const off = await pixels();
      await page.waitForTimeout(180);
      expect(await pixels()).toBe(off);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(host).toHaveAttribute("data-fragment-state", "wave");
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(host).not.toHaveClass(/has-fragments/);
      await expect(page.locator(".logo-trigger")).toBeHidden();
      await expect(page.locator(".ledger-art")).toHaveCSS("opacity", "1");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await expect(host).toHaveAttribute("data-fragment-state", "wave");
      await page.evaluate(() =>
        window.dispatchEvent(
          new PageTransitionEvent("pagehide", { persisted: true }),
        ),
      );
      await expect(host).toHaveAttribute("data-fragment-state", "static");
      await page.evaluate(() =>
        window.dispatchEvent(
          new PageTransitionEvent("pageshow", { persisted: true }),
        ),
      );
      await expect(host).toHaveAttribute("data-fragment-state", "wave");
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect(host).toHaveAttribute("data-fragment-state", "static");
      const hidden = await pixels();
      await page.waitForTimeout(180);
      expect(await pixels()).toBe(hidden);
      await page.evaluate(() => {
        Reflect.deleteProperty(document, "hidden");
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await expect(host).toHaveAttribute("data-fragment-state", "wave");
      await canvas.dispatchEvent("contextlost");
      await expect(host).not.toHaveClass(/has-fragments/);
      await expect(page.locator(".logo-trigger")).toBeHidden();
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });

test("EasyNode is reachable and active without crowding localized desktop menus", async ({
  page,
}) => {
  for (const width of [900, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const locale of ["en", "fr", "de", "es", "nl", "ru", "cn"]) {
      await page.goto(`/${locale}/network/`);
      await page.evaluate(() => document.fonts.ready);
      const nodes = await page
        .locator(".header-inner > *")
        .evaluateAll((elements) =>
          elements
            .map((el) => el.getBoundingClientRect())
            .map((r) => ({ left: r.left, right: r.right })),
        );
      for (let i = 1; i < nodes.length; i++)
        expect(nodes[i].left).toBeGreaterThanOrEqual(nodes[i - 1].right);
      await page.locator("#navigation a", { hasText: "EasyNode" }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/easynode/$`));
      await expect(
        page.locator('#navigation [aria-current="page"]'),
      ).toHaveText("EasyNode");
    }
  }
});

test("slow frame delivery does not stretch a burst into a long animation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.requestAnimationFrame = (callback) =>
      window.setTimeout(() => callback(performance.now()), 200);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
  await page.goto("/fr/");
  const host = page.locator(".ledger-monogram");
  await expect(host).toHaveAttribute("data-fragment-state", "wave");
  await page.locator(".logo-trigger").press("Enter");
  await expect(host).toHaveAttribute("data-fragment-state", "burst");
  await expect(host).toHaveAttribute("data-fragment-state", "wave", {
    timeout: 3500,
  });
});
