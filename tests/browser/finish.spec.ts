import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.route("https://api.github.com/**", (route) => route.abort());
});

test("light and dark mobile menus remain readable and keyboard navigable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark"]) {
    await page.goto("/en/");
    await page.evaluate(
      (theme) => localStorage.setItem("nito-theme", theme),
      theme,
    );
    await page.reload();
    await page.locator("#menu").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#navigation a").first()).toBeFocused();
    const violations = (await new AxeBuilder({ page }).analyze()).violations;
    expect(violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.locator("#menu")).toBeFocused();
    await page.keyboard.press("Enter");
    const headerLinks = await page.locator("#navigation a").count();
    for (let i = 0; i < headerLinks + 3; i++) await page.keyboard.press("Tab");
    await expect(page.locator("#navigation")).toBeHidden();
    await expect(page.locator(".hero-content a").first()).toBeFocused();
  }
});

test("all localized pages reflow at 320px and at the CSS viewport of 200% desktop zoom", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const locale of ["en", "fr", "de", "es", "nl", "ru", "cn"]) {
    for (const path of [
      "",
      "wallets/",
      "network/",
      "participate/",
      "resources/",
      "easynode/",
    ]) {
      await page.goto(`/${locale}/${path}`);
      if (path === "wallets/")
        await page.locator("details.disclosure summary").click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${locale}/${path}`,
      ).toBe(true);
    }
  }
  // A 1440x900 browser at 200% exposes a 720x450 CSS viewport.
  // CSS zoom alone leaves media queries at 1440px and is not browser zoom.
  await page.setViewportSize({ width: 720, height: 450 });
  for (const path of ["wallets", "network", "easynode"]) {
    await page.goto(`/en/${path}/`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
    await expect(page.locator("h1")).toBeVisible();
  }
});

test("content entrance is visible, reversible on preference change and not required", async ({
  page,
}) => {
  await page.goto("/en/");
  const section = page.locator("#home-participate");
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("h2")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () =>
        document.getAnimations().filter((a) => a.playState === "running")
          .length,
    ),
  ).toBe(0);
  await page.goto("/en/resources/");
  await expect(page.locator(".resource-item")).toHaveCount(6);
  await page.locator(".resource-item").first().focus();
  expect(
    await page
      .locator(".resource-item")
      .first()
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
});

test("download and network disclosures work from keyboard with semantic tables", async ({
  page,
}) => {
  await page.goto("/en/wallets/");
  await page.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".digest-item").first()).toBeVisible();
  await page.goto("/en/network/#issuance");
  await page.locator('[data-horizon="200"]').click();
  await expect(page.locator(".chart-data tbody tr")).toHaveCount(7);
  await page.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".table-scroll")).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByRole("img", { name: /Block reward - 200/ }),
  ).toBeVisible();
  await expect(page.locator(".table-scroll tbody tr")).toHaveCount(7);
});

test("reward labels stay separate in all ranges at narrow widths", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/en/network/");
    for (const horizon of [10, 50, 200]) {
      await page.locator(`[data-horizon="${horizon}"]`).click();
      const overlaps = await page
        .locator(".chart-value")
        .evaluateAll((labels) => {
          const bounds = labels.map((label) => label.getBoundingClientRect());
          return bounds.some((a, i) =>
            bounds
              .slice(i + 1)
              .some(
                (b) =>
                  a.left < b.right &&
                  a.right > b.left &&
                  a.top < b.bottom &&
                  a.bottom > b.top,
              ),
          );
        });
      expect(overlaps, `${width}px / ${horizon} years`).toBe(false);
    }
  }
});

test("graphics and storage failures retain navigation, content and downloads", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  try {
    await context.addInitScript(() => {
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        value: () => null,
      });
      for (const key of ["localStorage", "sessionStorage"])
        Object.defineProperty(window, key, {
          get: () => {
            throw new DOMException("Disabled", "SecurityError");
          },
        });
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://api.github.com/**", (route) => route.abort());
    await page.goto("/fr/");
    await expect(page.locator(".ledger-world img")).toBeVisible();
    await expect(page.locator(".ledger-monogram img")).toBeVisible();
    await page.locator("#menu").click();
    await page.locator('#navigation a[href="/fr/wallets/"]').click();
    await expect(
      page.locator('#core-downloads a[href*="/download/"]').first(),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("forced colors stop invisible particle work independently of reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({
    forcedColors: "active",
    reducedMotion: "no-preference",
  });
  await page.goto("/en/");
  await page.mouse.move(400, 400, { steps: 12 });
  await expect(page.locator("#site-particles")).toBeHidden();
  await expect(page.locator("#site-particles")).not.toHaveAttribute(
    "data-moving",
    "true",
  );
  await page.emulateMedia({ forcedColors: "none" });
  await page.mouse.move(800, 400, { steps: 12 });
  await expect(page.locator("#site-particles")).toBeVisible();
  await expect(page.locator("#site-particles")).toHaveAttribute(
    "data-moving",
    "true",
  );
});

test("touch visibly tilts only the monogram, repels particles and releases cleanly", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    await page.goto("/fr/");
    const logo = page.locator(".ledger-monogram");
    await logo.scrollIntoViewIfNeeded();
    const box = (await logo.boundingBox())!;
    const original = await logo.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    const canvas = page.locator("#site-particles");
    const initialPixels = await canvas.evaluate((el) =>
      (el as HTMLCanvasElement).toDataURL(),
    );
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: box.x + box.width * 0.7, y: box.y + box.height * 0.3 },
      ],
    });
    await expect(page.locator(".ledger-scene")).toHaveAttribute(
      "data-interacting",
      "true",
    );
    await expect
      .poll(() => logo.evaluate((el) => getComputedStyle(el).transform))
      .not.toBe(original);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: box.x + box.width * 0.6, y: box.y + box.height * 0.35 },
      ],
    });
    await expect
      .poll(() =>
        canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL()),
      )
      .not.toBe(initialPixels);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.locator(".ledger-scene")).not.toHaveAttribute(
      "data-interacting",
      "true",
    );
    await expect
      .poll(() => logo.evaluate((el) => getComputedStyle(el).transform))
      .toBe(original);
    await expect(canvas).not.toHaveAttribute("data-moving", "true");
  } finally {
    await context.close();
  }
});

test("prerendered content and downloads remain available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.goto("/fr/");
    await expect(page.locator(".ledger-monogram img")).toBeVisible();
    await page.locator(".hero-content a").first().click();
    await expect(
      page.locator('#core-downloads a[href*="/download/"]').first(),
    ).toBeVisible();
    await page.goto("/fr/easynode/");
    await expect(page.locator("#installer noscript")).toBeVisible();
    await expect(page.locator("#installer fieldset")).toHaveAttribute(
      "disabled",
      "",
    );
    await expect(
      page.locator('#installer button[type="submit"]'),
    ).toBeDisabled();
    await expect(page.locator('#installer select[name="os"]')).toBeDisabled();
  } finally {
    await context.close();
  }
});
