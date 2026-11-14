import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";

test("dark is the first theme and an explicit light choice persists", async ({
  page,
}) => {
  await page.goto("/fr/");
  await page.evaluate(() => localStorage.removeItem("nito-theme"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#theme")).toHaveAttribute(
    "aria-label",
    "Activer le mode clair",
  );
  await page.locator("#theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("footer motion preference stops every effect and persists across routes", async ({
  page,
}) => {
  await page.goto("/fr/");
  await page.locator("#motion-toggle").uncheck();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect(page.locator(".ledger-monogram")).toHaveAttribute(
    "data-fragment-state",
    "static",
  );
  const before = await page
    .locator("#site-particles")
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.mouse.move(1000, 300);
  await page.mouse.move(1100, 400);
  await page.waitForTimeout(150);
  expect(
    await page
      .locator("#site-particles")
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).toBe(before);
  await expect(page.locator("[data-hero-scene]")).not.toHaveAttribute(
    "data-interacting",
    "true",
  );
  await page.goto("/fr/easynode/");
  await expect(page.locator("#motion-toggle")).not.toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await page.locator("#motion-toggle").check();
  await page.goto("/fr/");
  await expect(page.locator(".ledger-monogram")).toHaveAttribute(
    "data-fragment-state",
    "wave",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#motion-toggle")).toBeDisabled();
  await expect(page.locator(".ledger-monogram")).toHaveAttribute(
    "data-fragment-state",
    "static",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("#motion-toggle")).toBeEnabled();
});

test("custom EasyNode configuration is localized, validated and reflected in all generated commands", async ({
  page,
}) => {
  await page.route("https://api.github.com/**", (r) => r.abort());
  await mkdir(".cache/audit/settings", { recursive: true });
  for (const locale of ["en", "fr", "de", "es", "nl", "ru", "cn"]) {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`/${locale}/easynode/`);
    await page.evaluate(() => document.fonts.ready);
    const clippedOptions = await page
      .locator('[name="rpcPasswordMode"]')
      .evaluate((select: HTMLSelectElement) => {
        const style = getComputedStyle(select);
        const ctx = document.createElement("canvas").getContext("2d")!;
        ctx.font = style.font;
        const available =
          select.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight) -
          18;
        return [...select.options]
          .filter((option) => ctx.measureText(option.text).width > available)
          .map((option) => option.text);
      });
    expect(clippedOptions, locale).toEqual([]);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.locator('[name="network"]').selectOption("testnet");
    await expect(page.locator('[name="rpcPort"]')).toHaveValue("8845");
    for (const [name, value] of Object.entries({
      installDir: "/srv/nito-custom",
      dataDir: "/mnt/ssd/nito-data",
      serviceUser: "nito-custom",
      rpcUser: "rpc-custom",
      p2pPort: "18820",
      rpcPort: "18825",
      dbCacheMiB: "768",
      maxConnections: "48",
    }))
      await page.locator(`[name="${name}"]`).fill(value);
    await page.locator('[name="network"]').selectOption("mainnet");
    await expect(page.locator('[name="rpcPort"]')).toHaveValue("18825");
    await page.locator('[name="storage"]').selectOption("pruned");
    await page.locator('[name="pruneMiB"]').fill("4096");
    await page.locator('[name="rpcPasswordMode"]').selectOption("prompt");
    await page.locator('#installer button[type="submit"]').click();
    await expect(page.locator("#script-result")).toBeVisible();
    const script = await page
      .locator("#script-result details code")
      .textContent();
    expect(script).toContain("rpcuser=rpc-custom");
    expect(script).toContain("rpcport=18825");
    expect(script).toContain("read -r -s -p");
    expect(script).toContain("prune=4096");
    await expect(page.locator(".install-steps article").last()).toContainText(
      "sudo -u nito-custom /srv/nito-custom/bin/nito-cli -datadir=/mnt/ssd/nito-data",
    );
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (locale === "fr")
      await page.screenshot({
        path: ".cache/audit/settings/easynode-mobile.png",
        fullPage: true,
      });
    await page.locator('[name="dataDir"]').fill("/etc/nito");
    await page.locator('#installer button[type="submit"]').click();
    await expect(page.locator("#script-result")).toBeHidden();
    await expect(page.locator("#form-error")).not.toBeEmpty();
  }
});
