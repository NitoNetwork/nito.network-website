import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { strokeAt } from "../../src/logo-motion";

for (const width of [1440, 1024, 390])
  test(`rendered fragments follow the pen and keep the poster intact at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      const state = window as any;
      let time = 100,
        id = 0;
      const callbacks = new Map<number, FrameRequestCallback>();
      window.requestAnimationFrame = (callback) => {
        callbacks.set(++id, callback);
        return id;
      };
      window.cancelAnimationFrame = (id) => {
        callbacks.delete(id);
      };
      state.advanceLogo = (elapsed: number) => {
        time += elapsed;
        const batch = [...callbacks.values()];
        callbacks.clear();
        batch.forEach((callback) => callback(time));
      };
      state.logoDraws = [];
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (this.canvas.className === "logo-fragments") state.logoDraws = [];
        return clear.apply(this, args);
      };
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
        if (this.canvas.className === "logo-fragments" && args.length === 9) {
          const [texture, sx, sy, sw] = args;
          const host = document.querySelector<HTMLElement>(".ledger-monogram")!;
          const size = host.clientWidth,
            ratio = this.canvas.width / (size * 1.6);
          const m = this.getTransform(),
            x = (sx + sw / 2) / texture.width,
            y = (sy + sw / 2) / texture.height;
          state.logoDraws.push({
            x,
            y,
            displacement: Math.hypot(
              m.e / ratio / size - 0.3 - x,
              m.f / ratio / size - 0.3 - y,
            ),
          });
        }
        return draw.apply(this, args as any);
      };
    });
    await page.goto("/fr/");
    const host = page.locator(".ledger-monogram");
    await expect(host).toHaveClass(/has-fragments/);
    const advance = async (time: number) =>
      page.evaluate((t) => (window as any).advanceLogo(t), time);
    await expect
      .poll(async () => {
        await advance(0);
        return host.getAttribute("data-fragment-state");
      })
      .toBe("wave");
    await mkdir(".cache/audit/stroke", { recursive: true });
    let elapsed = 0;
    for (const [time, low, high, name] of [
      [900, 0, 0.21, "left-up"],
      [4500, 0.4, 0.6, "diagonal-down"],
      [7900, 0.77, 0.99, "right-up"],
    ] as const) {
      await advance(time - elapsed);
      elapsed = time;
      const draws = (await page.evaluate(() => (window as any).logoDraws)) as {
        x: number;
        y: number;
        displacement: number;
      }[];
      const flying = draws.filter((d) => d.displacement > 0.025);
      expect(flying.length).toBeGreaterThan(0);
      for (const tile of flying) {
        const position = strokeAt(tile.x, tile.y).progress;
        expect(position).toBeGreaterThan(low);
        expect(position).toBeLessThan(high);
      }
      await page.screenshot({
        path: `.cache/audit/stroke/${width}-${name}.png`,
      });
    }
    const posterFragmentAlpha = () =>
      page.locator(".logo-fragments").evaluate((canvas: HTMLCanvasElement) => {
        const x = ((0.3 + 0.235) / 1.6) * canvas.width,
          y = ((0.3 + 0.157) / 1.6) * canvas.height;
        return canvas
          .getContext("2d")!
          .getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3];
      });
    expect(await posterFragmentAlpha()).toBe(0);
    await page
      .locator(".logo-trigger")
      .evaluate((button: HTMLButtonElement) => button.click());
    await advance(0);
    await advance(1000);
    const draws = (await page.evaluate(() => (window as any).logoDraws)) as {
      x: number;
      y: number;
      displacement: number;
    }[];
    const first = draws.filter((d) => strokeAt(d.x, d.y).progress < 0.05);
    const last = draws.filter((d) => strokeAt(d.x, d.y).progress > 0.9);
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((d) => d.displacement < 0.002)).toBe(true);
    expect(last.some((d) => d.displacement > 0.1)).toBe(true);
    await page.screenshot({
      path: `.cache/audit/stroke/${width}-rebuild-start.png`,
    });
    await advance(750);
    await page.screenshot({
      path: `.cache/audit/stroke/${width}-rebuild-diagonal.png`,
    });
    await advance(500);
    await expect(host).toHaveAttribute("data-fragment-state", "wave");
    await page.locator("#motion-toggle").evaluate((input: HTMLInputElement) => {
      input.checked = false;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(host).not.toHaveClass(/has-fragments/);
    expect(await posterFragmentAlpha()).toBeGreaterThan(0);
    await page.screenshot({
      path: `.cache/audit/stroke/${width}-original-poster.png`,
    });
  });
