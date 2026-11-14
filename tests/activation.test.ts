import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVATION_HEIGHT, locales } from "../src/data";
import {
  parseActivation,
  activationState,
  estimateSeconds,
} from "../src/activation";
import { orchardTranslations } from "../src/content/orchard";
import { render } from "../src/render";

const now = 1_800_000_000;
const sample = {
  schema: 1,
  activationHeight: ACTIVATION_HEIGHT,
  height: 1_100_000,
  bestBlockHash: "a".repeat(64),
  blockTime: now - 45,
  observedAt: now,
  remaining: ACTIVATION_HEIGHT - 1_100_000,
  windowBlocks: 1440,
  secondsPerBlock: 63,
  confirmed: false,
};
test("activation uses observed blocks and a measured estimation window", () => {
  const s = parseActivation(sample, now);
  assert.equal(activationState(s, now), "scheduled");
  assert.equal(estimateSeconds(s, now), sample.remaining * 63);
  assert.equal(activationState(s, now + 181), "stale");
  assert.equal(estimateSeconds(s, now + 181), null);
});
test("height reached is not a substitute for node confirmation", () => {
  const s = parseActivation(
    { ...sample, height: ACTIVATION_HEIGHT, remaining: 0 },
    now,
  );
  assert.equal(activationState(s, now), "reached");
  assert.equal(estimateSeconds(s, now), null);
  assert.equal(activationState({ ...s, confirmed: true }, now), "active");
  assert.equal(activationState({ ...s, confirmed: true }, now + 181), "stale");
});
test("stalled or future-dated tips and missing rates suppress the ETA", () => {
  const slow = parseActivation({ ...sample, blockTime: now - 3601 }, now);
  assert.equal(activationState(slow, now), "slow");
  assert.equal(estimateSeconds(slow, now), null);
  assert.equal(
    estimateSeconds(
      parseActivation({ ...sample, blockTime: now + 300 }, now),
      now,
    ),
    null,
  );
  assert.equal(
    estimateSeconds(
      parseActivation({ ...sample, secondsPerBlock: null }, now),
      now,
    ),
    null,
  );
});
test("malformed or contradictory snapshots are rejected", () => {
  for (const invalid of [
    null,
    [],
    {},
    { ...sample, remaining: -1 },
    { ...sample, remaining: sample.remaining - 1 },
    { ...sample, confirmed: true },
    { ...sample, confirmed: "true" },
    { ...sample, activationHeight: 1_110_000 },
    { ...sample, height: "1100000" },
    { ...sample, windowBlocks: 15 },
    { ...sample, observedAt: now + 121 },
    { ...sample, secondsPerBlock: NaN },
    { ...sample, secondsPerBlock: 0 },
    { ...sample, bestBlockHash: "<script>" },
  ]) {
    assert.throws(() => parseActivation(invalid, now));
  }
});
test("every locale has the full activation and technical content", () => {
  for (const locale of locales) {
    const copy = orchardTranslations[locale];
    assert.deepEqual(
      Object.keys(copy).sort(),
      Object.keys(orchardTranslations.en).sort(),
    );
    assert.ok(
      Object.values(copy).every((v) => typeof v === "string" && v.length),
    );
    const home = render(locale, "home");
    assert.ok(
      home.indexOf('id="activation"') >
        home.indexOf('class="hero living-hero"'),
    );
    assert.ok(home.indexOf('id="activation"') < home.indexOf('id="discover"'));
    assert.ok(home.includes(`/${locale}/network/#orchard`));
    assert.ok(home.includes(copy.intro));
    const network = render(locale, "network");
    assert.ok(network.includes("Halo2"));
    assert.ok(network.includes("nito1x"));
    assert.ok(network.includes("https://zips.z.cash/zip-0224"));
  }
});
