import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFragment,
  fragmentPose,
  strokeAt,
  waveStrength,
  isolateLogoBody,
  WAVE_DURATION,
  BURST_DURATION,
} from "../src/logo-motion";
import sharp from "sharp";
import { render } from "../src/render";
import { locales, pages } from "../src/data";
import { chart } from "../src/chart";
import { en } from "../src/content/en";

test("every hero encoding confines gold to the official inner left upright", async () => {
  for (const name of [
    "nito-blocks.png",
    "nito-blocks-1024.png",
    ...[320, 640, 1024].flatMap((size) =>
      ["avif", "webp"].map((format) => `nito-blocks-${size}.${format}`),
    ),
  ]) {
    const { data, info } = await sharp(`public/media/${name}`)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let gold = 0,
      blue = 0;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        const p = (y * info.width + x) * 4;
        const [r, g, b, a] = data.subarray(p, p + 4);
        if (a < 180) continue;
        if (b > r * 1.5 && b > 100) blue++;
        if (r > 100 && g > 70 && r > b * 1.7 && g > b * 1.3) {
          gold++;
          const u = x / info.width,
            v = y / info.height;
          assert.ok(
            u >= 0.29 && u <= 0.45 && v >= 0.46 && v <= 0.9,
            `${name}: misplaced gold at ${u}, ${v}`,
          );
        }
      }
    assert.ok(gold > info.width * info.height * 0.01, `${name}: gold retained`);
    assert.ok(blue > info.width * info.height * 0.1, `${name}: blue retained`);
  }
});

test("every page exposes EasyNode in both navigation areas with its own current state", () => {
  for (const locale of locales)
    for (const page of pages) {
      const html = render(locale, page);
      const navs = html.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/g)!;
      // The reader also has a document-only chapter index between the site navs.
      for (const nav of [navs[0], navs.at(-1)!])
        assert.match(nav, new RegExp(`href="/${locale}/easynode/"`));
      if (page === "easynode")
        assert.match(navs[0], /easynode\/" aria-current="page">EasyNode/);
    }
});
test("reward labels retain all values without connector lines", () => {
  for (const range of [10, 50, 200])
    assert.doesNotMatch(chart(en, range), /chart-label-leader/);
});
test("reconstruction wave is bounded and burst returns exactly to rest", () => {
  for (const x of [0.05, 0.5, 0.95])
    for (const y of [0.05, 0.5, 0.95]) {
      const tile = createFragment(x, y, false);
      const rest = fragmentPose(tile, 0, BURST_DURATION);
      assert.ok(Math.abs(rest.x) < 1e-12 && Math.abs(rest.y) < 1e-12);
      assert.equal(rest.scale, 1);
      const burst = fragmentPose(tile, 0, 450);
      assert.ok(burst.scale < 0.8);
      for (let t = 0; t < 9000; t += 50) {
        const pose = fragmentPose(tile, t, null);
        assert.ok(Math.abs(pose.x) <= 0.012 && Math.abs(pose.y) <= 0.017);
        assert.ok(pose.scale >= 0.86 && pose.scale <= 1);
      }
    }
});

test("the slow wave is periodic with no idle gap", () => {
  for (let time = 0; time < 9000; time += 30) {
    let moving = false;
    for (let x = 0.15; x < 0.9; x += 0.05)
      for (let y = 0.2; y < 0.9; y += 0.05) {
        if (fragmentPose(createFragment(x, y, false), time, null).scale < 0.98)
          moving = true;
      }
    assert.ok(moving, `no inactive interval at ${time}`);
  }
  for (const [x, y] of [
    [0.2, 0.3],
    [0.5, 0.5],
    [0.8, 0.85],
  ]) {
    const tile = createFragment(x, y, false);
    const before = fragmentPose(tile, 8999, null),
      after = fragmentPose(tile, 9000, null);
    assert.ok(Math.abs(before.x - after.x) < 0.0001);
    assert.ok(Math.abs(before.scale - after.scale) < 0.001);
  }
});

test("wave contact follows the three N strokes in pen order", () => {
  const route = [
    [0.31, 0.875],
    [0.3, 0.6],
    [0.29, 0.315],
    [0.5, 0.59],
    [0.715, 0.875],
    [0.715, 0.6],
    [0.715, 0.315],
  ];
  const positions = route.map(([x, y]) => strokeAt(x, y).progress);
  assert.equal(positions[0], 0);
  assert.equal(positions.at(-1), 1);
  for (let i = 1; i < positions.length; i++)
    assert.ok(positions[i] > positions[i - 1]);
  for (const progress of positions) {
    assert.ok(waveStrength(progress, progress * WAVE_DURATION) > 0.999);
    assert.equal(
      waveStrength(progress, ((progress + 0.5) % 1) * WAVE_DURATION),
      0,
    );
  }
});

test("full dispersion reassembles progressively from lower-left to upper-right", () => {
  const route = [
    [0.31, 0.875],
    [0.29, 0.315],
    [0.5, 0.59],
    [0.715, 0.875],
    [0.715, 0.315],
  ];
  for (let i = 0; i < route.length - 1; i++) {
    const tile = createFragment(...(route[i] as [number, number]), true);
    const later = createFragment(...(route[i + 1] as [number, number]), true);
    const returnedAt = 850 + tile.progress * 1350;
    assert.equal(fragmentPose(tile, 0, returnedAt).scale, 1);
    assert.ok(fragmentPose(later, 0, returnedAt).scale < 1);
  }
});

test("only the current wave contact lifts edge fragments into the air", () => {
  for (let y = 0.34; y < 0.85; y += 0.05) {
    const tile = createFragment(0.2, y, true);
    const active = fragmentPose(tile, tile.progress * WAVE_DURATION, null);
    assert.ok(Math.abs(active.x) > 0.05 && active.x < 0);
    assert.ok(active.scale >= 0.5 && active.scale < 0.51);
    const far = fragmentPose(
      tile,
      ((tile.progress + 0.5) % 1) * WAVE_DURATION,
      null,
    );
    assert.equal(far.scale, 1);
    assert.equal(Math.abs(far.x), 0);
  }
});

test("runtime body mask removes poster fragments but preserves original blue and gold samples", async () => {
  for (const width of [320, 576, 768]) {
    const { data, info } = await sharp("public/media/nito-blocks-1024.png")
      .resize(width, width)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = new Uint8ClampedArray(data);
    const body = isolateLogoBody(pixels, info.width, info.height);
    const sample = (x: number, y: number) =>
      (Math.floor(y * width) * width + Math.floor(x * width)) * 4;
    for (const [x, y] of [
      [0.235, 0.157],
      [0.314, 0.177],
      [0.13, 0.505],
    ]) {
      const p = sample(x, y);
      assert.ok(pixels[p + 3] > 0, "visible floating fragment in original");
      assert.equal(
        body[p + 3],
        0,
        "no stationary floating fragment in animation",
      );
    }
    for (const [x, y] of [
      [0.36, 0.78],
      [0.24, 0.7],
      [0.75, 0.42],
    ]) {
      const p = sample(x, y);
      assert.ok(body[p + 3] > 240);
      assert.deepEqual(body.slice(p, p + 4), pixels.slice(p, p + 4));
    }
    for (let p = 0; p < body.length; p += 4) {
      if (body[p + 3])
        assert.deepEqual(body.slice(p, p + 4), pixels.slice(p, p + 4));
    }
  }
});
