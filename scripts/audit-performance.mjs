import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const folder = ".cache/audit/performance";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
const results = [];
try {
  for (const profile of ["desktop", "mobile-throttled"]) {
    const context = await browser.newContext({
      viewport:
        profile === "desktop"
          ? { width: 1440, height: 900 }
          : { width: 390, height: 844 },
      hasTouch: profile !== "desktop",
    });
    const page = await context.newPage();
    await page.route("https://api.github.com/**", (route) => route.abort());
    await page.addInitScript(() => {
      window.metrics = { lcp: 0, cls: 0, longTasks: [], interactions: [] };
      for (const type of [
        "largest-contentful-paint",
        "layout-shift",
        "longtask",
        "event",
      ]) {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (type === "largest-contentful-paint")
              window.metrics.lcp = e.startTime;
            if (type === "layout-shift" && !e.hadRecentInput)
              window.metrics.cls += e.value;
            if (type === "longtask") window.metrics.longTasks.push(e.duration);
            if (type === "event" && e.interactionId)
              window.metrics.interactions.push(e.duration);
          }
        }).observe({ type, buffered: true, durationThreshold: 16 });
      }
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (profile !== "desktop") {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: 1_600_000 / 8,
        uploadThroughput: 750_000 / 8,
      });
    }
    for (const route of ["", "resources/", "easynode/"]) {
      await page.goto(`http://127.0.0.1:4177/fr/${route}`, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(300);
      const load = await page.evaluate(() => ({
        ...window.metrics,
        resources: performance.getEntriesByType("resource").map((r) => ({
          name: new URL(r.name).pathname,
          bytes: r.transferSize,
        })),
        dom: document.querySelectorAll("*").length,
      }));
      const canvas = page.locator("#site-particles");
      const before = await canvas.evaluate((c) => c.toDataURL());
      const frameTimes = await page.evaluate(async () => {
        const times = [];
        let previous = performance.now();
        await new Promise((resolve) => {
          const frame = (now) => {
            times.push(now - previous);
            previous = now;
            window.dispatchEvent(
              new PointerEvent("pointermove", {
                clientX: 60 + times.length * 4,
                clientY: 300,
                pointerType: "mouse",
                isPrimary: true,
              }),
            );
            if (times.length < 90) requestAnimationFrame(frame);
            else resolve();
          };
          requestAnimationFrame(frame);
        });
        return times.slice(1);
      });
      const after = await canvas.evaluate((c) => c.toDataURL());
      assert.notEqual(before, after, "particles must visibly change pixels");
      await page.waitForFunction(
        () =>
          !document
            .querySelector("#site-particles")
            .hasAttribute("data-moving"),
      );
      const settled = await canvas.evaluate((c) => c.toDataURL());
      await page.waitForTimeout(150);
      assert.equal(
        await canvas.evaluate((c) => c.toDataURL()),
        settled,
        "idle field should remain still",
      );
      if (route === "") {
        for (const period of [50, 200, 10])
          await page.locator(`[data-horizon="${period}"]`).click();
      } else if (route === "easynode/") {
        await page.locator('#installer button[type="submit"]').click();
        await page.locator("#script-result").waitFor();
      }
      await page.waitForTimeout(300);
      const values = await page.evaluate(() => window.metrics);
      const sorted = frameTimes.sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      results.push({
        profile,
        route,
        load,
        interaction: values,
        frameP95: p95,
        changedPixels: true,
        staticAtRest: true,
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
}
const comparison = {};
for (const phase of ["before", "after"]) {
  const data = JSON.parse(
    await readFile(`.cache/audit/${phase}/report.json`, "utf8"),
  );
  comparison[phase] = {};
  for (const width of [1440, 1024, 390]) {
    const rows = data.filter((r) => r.width === width);
    const sorted = rows.map((r) => r.metrics.lcp).sort((a, b) => a - b);
    comparison[phase][width] = {
      lcpMedian: sorted[Math.floor(sorted.length / 2)],
      maxCLS: Math.max(...rows.map((r) => r.metrics.cls)),
      longTasks: rows.reduce((s, r) => s + r.metrics.longTasks, 0),
    };
  }
}
await writeFile(
  `${folder}/report.json`,
  JSON.stringify({ results, comparison }, null, 2),
);
console.log(
  JSON.stringify(
    {
      comparison,
      runs: results.map((r) => ({
        profile: r.profile,
        route: r.route,
        lcp: r.load.lcp,
        cls: r.load.cls,
        bytes: r.load.resources.reduce((s, r) => s + r.bytes, 0),
        frameP95: r.frameP95,
        interactionMax: Math.max(0, ...r.interaction.interactions),
      })),
    },
    null,
    2,
  ),
);
