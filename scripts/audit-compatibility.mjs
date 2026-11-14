import { firefox, webkit } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const folder = ".cache/audit/compatibility";
await mkdir(folder, { recursive: true });
const report = [];
for (const [name, engine] of Object.entries({ firefox, webkit })) {
  const browser = await engine.launch();
  try {
    for (const width of [1440, 390]) {
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({
          viewport: { width, height: 900 },
        });
        await context.addInitScript(
          (theme) => localStorage.setItem("nito-theme", theme),
          theme,
        );
        const page = await context.newPage();
        await page.route("https://api.github.com/**", (route) => route.abort());
        for (const path of [
          "",
          "wallets/",
          "network/",
          "participate/",
          "resources/",
          "easynode/",
        ]) {
          const errors = [];
          const onError = (error) => errors.push(error.message);
          page.on("pageerror", onError);
          await page.goto(`http://127.0.0.1:4177/fr/${path}`);
          await page.evaluate(() => document.fonts.ready);
          const state = await page.evaluate(() => ({
            overflow:
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
            images: [...document.images].every(
              (image) => image.complete && image.naturalWidth,
            ),
          }));
          assert.equal(
            state.overflow,
            false,
            `${name}/${width}/${path} overflow`,
          );
          assert.equal(state.images, true, `${name}/${width}/${path} images`);
          if (width === 390) {
            await page.locator("#menu").focus();
            await page.keyboard.press("Enter");
            assert.equal(
              await page
                .locator("#navigation a")
                .first()
                .evaluate((el) => document.activeElement === el),
              true,
            );
            await page.keyboard.press("Escape");
          }
          if (path === "network/") {
            await page.locator('[data-horizon="200"]').click();
            assert.equal(await page.locator(".chart-data tbody tr").count(), 7);
          }
          if (path === "wallets/") {
            await page.locator("summary").click();
            assert.equal(
              await page.locator(".digest-item").first().isVisible(),
              true,
            );
          }
          if (path === "easynode/") {
            await page.locator('#installer button[type="submit"]').click();
            await page.locator("#script-result").waitFor({ state: "visible" });
            assert.equal(
              await page.locator(".install-steps article").count(),
              4,
            );
          }
          await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
          await page.screenshot({
            path: `${folder}/${name}-${path.replace("/", "") || "home"}-${theme}-${width}.png`,
            fullPage: true,
          });
          assert.deepEqual(errors, []);
          report.push({
            browser: name,
            version: browser.version(),
            width,
            theme,
            path,
            ...state,
            errors,
          });
          page.off("pageerror", onError);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2));
console.log(`${report.length} compatibility states passed.`);
