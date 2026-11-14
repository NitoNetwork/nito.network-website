import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

const phase = process.argv[2] ?? "after";
const origin = process.env.AUDIT_ORIGIN ?? "http://127.0.0.1:4177";
const folder = `.cache/audit/${phase}`;
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = [];
try {
  for (const width of [1440, 1024, 390]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        hasTouch: width === 390,
      });
      await context.addInitScript((theme) => {
        localStorage.setItem("nito-theme", theme);
        window.auditMetrics = { lcp: 0, cls: 0, longTasks: 0 };
        for (const type of [
          "largest-contentful-paint",
          "layout-shift",
          "longtask",
        ]) {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (type === "largest-contentful-paint")
                window.auditMetrics.lcp = entry.startTime;
              if (type === "layout-shift" && !entry.hadRecentInput)
                window.auditMetrics.cls += entry.value;
              if (type === "longtask") window.auditMetrics.longTasks++;
            }
          }).observe({ type, buffered: true });
        }
      }, theme);
      const page = await context.newPage();
      await page.route("https://api.github.com/**", (r) => r.abort());
      for (const locale of ["en", "fr", "de", "es", "nl", "ru", "cn"]) {
        for (const route of [
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
          const response = await page.goto(`${origin}/${locale}/${route}`, {
            waitUntil: "load",
          });
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(100);
          const state = await page.evaluate(() => ({
            overflow:
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
            h1: document.querySelectorAll("h1").length,
            brokenImages: [...document.images]
              .filter((i) => !i.complete || !i.naturalWidth)
              .map((i) => i.src),
            metrics: window.auditMetrics,
            visibleText: document.querySelector("main").innerText,
            resources: performance
              .getEntriesByType("resource")
              .reduce((s, r) => s + r.transferSize, 0),
          }));
          let axe = [];
          if (width === 1440)
            axe = (await new AxeBuilder({ page }).analyze()).violations.map(
              ({ id, impact, nodes }) => ({
                id,
                impact,
                targets: nodes.map((n) => n.target),
              }),
            );
          if (locale === "fr")
            await page.screenshot({
              path: `${folder}/${route.replace("/", "") || "home"}-${theme}-${width}.png`,
              fullPage: true,
            });
          report.push({
            width,
            theme,
            locale,
            route,
            status: response.status(),
            ...state,
            errors,
            axe,
          });
          page.off("pageerror", onError);
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
await writeFile(`${folder}/report.json`, JSON.stringify(report, null, 2));
const failures = report.filter(
  (r) =>
    r.status !== 200 ||
    r.overflow ||
    r.h1 !== 1 ||
    r.brokenImages.length ||
    r.errors.length ||
    r.axe.length,
);
console.log(
  JSON.stringify(
    {
      states: report.length,
      failures: failures.map(({ visibleText, ...r }) => r),
    },
    null,
    2,
  ),
);
