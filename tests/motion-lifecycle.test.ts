import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { installHeroParallax } from "../src/hero-parallax";
import { installParticles } from "../src/particles";

function harness(t: TestContext, initiallyReduced = false) {
  const frames = new Map<number, FrameRequestCallback>();
  const properties = new Map<string, string>();
  const reduced = Object.assign(new EventTarget(), {
    matches: initiallyReduced,
  });
  const doc = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: { clientWidth: 800 },
  });
  const win = new EventTarget();
  const disposers: (() => void)[] = [];
  let id = 0;
  let now = 0;
  let measurements = 0;
  let draws = 0;
  let disconnects = 0;
  let pixels: number[][] = [];
  let bounds = {
    left: 100,
    top: 100,
    right: 300,
    bottom: 300,
    width: 200,
    height: 200,
  };
  const monogram = Object.assign(new EventTarget(), {
    style: {
      setProperty: (key: string, value: string) => properties.set(key, value),
    },
    getBoundingClientRect() {
      measurements++;
      return bounds;
    },
  });
  const root = {
    dataset: {} as Record<string, string>,
    querySelector: () => monogram,
    removeAttribute(name: string) {
      if (name === "data-interacting") delete this.dataset.interacting;
      if (name === "data-enhanced") delete this.dataset.enhanced;
    },
  };
  const canvas = {
    width: 0,
    height: 0,
    dataset: {} as Record<string, string>,
    getContext: () => ({
      clearRect() {
        draws++;
        pixels = [];
      },
      fillRect(...values: number[]) {
        pixels.push(values);
      },
      setTransform() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
    }),
  };
  const globals = {
    window: win,
    document: doc,
    matchMedia: () => reduced,
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 3,
    getComputedStyle: () => ({ getPropertyValue: () => "#07694f" }),
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(++id, callback);
      return id;
    },
    cancelAnimationFrame: (frame: number) => frames.delete(frame),
    MutationObserver: class {
      observe() {}
      disconnect() {
        disconnects++;
      }
    },
  };
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
    });
  }
  t.mock.method(performance, "now", () => now);
  t.after(() => {
    disposers.forEach((dispose) => dispose());
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  return {
    root,
    monogram,
    canvas,
    win,
    doc,
    frames,
    properties,
    get measurements() {
      return measurements;
    },
    get draws() {
      return draws;
    },
    get disconnects() {
      return disconnects;
    },
    get pixels() {
      return pixels;
    },
    setBounds(value: typeof bounds) {
      bounds = value;
    },
    hero() {
      const dispose = installHeroParallax(root as unknown as HTMLElement);
      disposers.push(dispose);
      return dispose;
    },
    particles() {
      const dispose = installParticles(canvas as unknown as HTMLCanvasElement);
      disposers.push(dispose);
      return dispose;
    },
    advance() {
      now += 16;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(now));
    },
    preference(matches: boolean) {
      reduced.matches = matches;
      reduced.dispatchEvent(new Event("change"));
    },
    visible(visible: boolean) {
      doc.hidden = !visible;
      doc.dispatchEvent(new Event("visibilitychange"));
    },
    hide() {
      win.dispatchEvent(
        Object.assign(new Event("pagehide"), { persisted: true }),
      );
    },
    show() {
      win.dispatchEvent(
        Object.assign(new Event("pageshow"), { persisted: true }),
      );
    },
  };
}

function pointer(type = "pointermove", values: Partial<PointerEvent> = {}) {
  return Object.assign(new Event(type), {
    clientX: 200,
    clientY: 200,
    isPrimary: true,
    pointerType: "mouse",
    pointerId: 1,
    ...values,
  });
}

function touch(type = "touchmove", x = 400, y = 300) {
  return Object.assign(new Event(type, { cancelable: true }), {
    touches: [{ clientX: x, clientY: y }],
  });
}

test("hero keeps its strength and full rectangular contact footprint without chasing its transform", (t) => {
  const h = harness(t);
  h.hero();
  h.win.dispatchEvent(pointer());
  assert.equal(h.frames.size, 0, "background input does not tilt the hero");
  h.monogram.dispatchEvent(
    pointer("pointermove", { clientX: 100, clientY: 100 }),
  );
  h.advance();
  assert.equal(h.properties.get("--hero-shift-x"), "-8px");
  assert.equal(h.properties.get("--hero-shift-y"), "-6px");
  assert.equal(h.properties.get("--hero-tilt-x"), "2.5deg");
  assert.equal(h.properties.get("--hero-tilt-y"), "-4deg");
  h.setBounds({
    left: 92,
    top: 94,
    right: 292,
    bottom: 294,
    width: 200,
    height: 200,
  });
  h.monogram.dispatchEvent(
    pointer("pointermove", { clientX: 300, clientY: 300 }),
  );
  h.advance();
  assert.equal(h.measurements, 1);
  assert.equal(h.properties.get("--hero-shift-x"), "8px");
  assert.equal(h.properties.get("--hero-shift-y"), "6px");
  assert.equal(h.properties.get("--hero-tilt-x"), "-2.5deg");
  assert.equal(h.properties.get("--hero-tilt-y"), "4deg");
  h.monogram.dispatchEvent(pointer("pointerup", { isPrimary: false }));
  assert.equal(h.root.dataset.interacting, "true");
  h.monogram.dispatchEvent(
    pointer("pointermove", { pointerType: "touch", clientX: 340 }),
  );
  assert.equal(
    h.root.dataset.interacting,
    undefined,
    "implicit capture cannot tilt outside the image",
  );
  assert.equal(h.properties.get("--hero-shift-x"), "0px");
  assert.equal(h.frames.size, 0);
});

test("hero cancels pending work across repeated BFCache suspension and restoration", (t) => {
  const h = harness(t);
  h.hero();
  for (let i = 0; i < 3; i++) {
    h.monogram.dispatchEvent(pointer("pointerdown", { clientX: 280 }));
    assert.equal(h.frames.size, 1);
    h.hide();
    assert.equal(h.frames.size, 0);
    assert.equal(h.root.dataset.interacting, undefined);
    assert.equal(h.properties.get("--hero-shift-x"), "0px");
    h.monogram.dispatchEvent(pointer());
    assert.equal(h.frames.size, 0);
    h.show();
    assert.equal(h.frames.size, 0, "restoration stays idle until contact");
    h.monogram.dispatchEvent(pointer());
    assert.equal(h.frames.size, 1);
    h.advance();
  }
});

test("hero supports reduced motion at load and repeated live preference transitions", (t) => {
  const h = harness(t, true);
  h.hero();
  h.monogram.dispatchEvent(pointer());
  assert.equal(h.frames.size, 0);
  assert.equal(h.root.dataset.enhanced, undefined);
  for (let i = 0; i < 3; i++) {
    h.preference(false);
    assert.equal(h.root.dataset.enhanced, "true");
    h.monogram.dispatchEvent(pointer());
    assert.equal(h.frames.size, 1);
    h.preference(true);
    assert.equal(h.frames.size, 0);
    assert.equal(h.root.dataset.interacting, undefined);
    assert.equal(h.root.dataset.enhanced, undefined);
  }
  h.hide();
  h.preference(false);
  h.monogram.dispatchEvent(pointer());
  assert.equal(h.frames.size, 0);
  h.show();
  h.monogram.dispatchEvent(pointer());
  assert.equal(h.frames.size, 1);
});

test("hero resets on visibility, blur, geometry changes and lost contact", (t) => {
  const h = harness(t);
  h.hero();
  for (const event of ["blur", "resize", "scroll"]) {
    h.monogram.dispatchEvent(pointer());
    h.win.dispatchEvent(new Event(event));
    assert.equal(h.frames.size, 0, event);
    assert.equal(h.root.dataset.interacting, undefined, event);
  }
  for (const event of [
    "pointerleave",
    "pointerup",
    "pointercancel",
    "lostpointercapture",
  ]) {
    h.monogram.dispatchEvent(pointer());
    h.monogram.dispatchEvent(pointer(event));
    assert.equal(h.frames.size, 0, event);
    assert.equal(h.root.dataset.interacting, undefined, event);
  }
  h.monogram.dispatchEvent(pointer());
  h.visible(false);
  h.monogram.dispatchEvent(pointer());
  assert.equal(h.frames.size, 0);
  h.visible(true);
  h.setBounds({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 });
  h.monogram.dispatchEvent(pointer());
  assert.equal(h.frames.size, 0, "collapsed image has no contact area");
});

test("hero reinstall and idempotent disposal leave no listeners or pending frames", (t) => {
  const h = harness(t);
  const first = h.hero();
  h.monogram.dispatchEvent(pointer());
  const dispose = h.hero();
  assert.equal(h.frames.size, 0);
  first();
  h.monogram.dispatchEvent(pointer());
  assert.equal(h.frames.size, 1);
  dispose();
  dispose();
  h.preference(false);
  h.show();
  h.monogram.dispatchEvent(pointer());
  assert.equal(h.frames.size, 0);
  assert.equal(h.root.dataset.enhanced, undefined);
});

test("particles preserve their settled field across BFCache and resume mouse and touch input", (t) => {
  const h = harness(t);
  h.particles();
  h.win.dispatchEvent(touch());
  h.advance();
  const pixels = h.pixels;
  h.hide();
  assert.equal(h.frames.size, 0);
  h.win.dispatchEvent(touch());
  assert.equal(h.frames.size, 0);
  const draws = h.draws;
  h.show();
  assert.equal(
    h.draws,
    draws + 1,
    "restored bitmap is redrawn without an idle loop",
  );
  assert.deepEqual(h.pixels, pixels, "same viewport does not reseed the field");
  assert.equal(h.frames.size, 0);
  for (const input of [pointer(), touch()]) {
    h.win.dispatchEvent(input);
    assert.equal(h.frames.size, 1);
    assert.equal(input.defaultPrevented, false);
    h.hide();
    h.show();
  }
  h.doc.documentElement.clientWidth = 640;
  h.hide();
  h.show();
  assert.equal(
    h.canvas.width,
    1280,
    "restoration catches a viewport change without resize",
  );
  assert.equal(h.frames.size, 0);
});

test("particles remain static through reduced motion and visibility changes, then reenable", (t) => {
  const h = harness(t, true);
  h.particles();
  h.win.dispatchEvent(touch());
  assert.equal(h.frames.size, 0);
  h.preference(false);
  h.win.dispatchEvent(touch());
  assert.equal(h.frames.size, 1);
  h.preference(true);
  assert.equal(h.frames.size, 0);
  h.preference(false);
  h.visible(false);
  h.win.dispatchEvent(pointer());
  assert.equal(h.frames.size, 0);
  h.visible(true);
  assert.equal(h.frames.size, 0);
  h.win.dispatchEvent(pointer());
  assert.equal(h.frames.size, 1);
});

test("particles reinstall and idempotent disposal disconnect each observer once", (t) => {
  const h = harness(t);
  const first = h.particles();
  h.win.dispatchEvent(touch());
  const dispose = h.particles();
  assert.equal(h.disconnects, 1);
  assert.equal(h.frames.size, 0);
  first();
  h.win.dispatchEvent(touch());
  assert.equal(h.frames.size, 1);
  dispose();
  dispose();
  assert.equal(h.disconnects, 2);
  assert.equal(h.frames.size, 0);
  assert.equal(h.canvas.dataset.moving, undefined);
  const draws = h.draws;
  h.win.dispatchEvent(touch());
  h.win.dispatchEvent(new Event("resize"));
  h.preference(false);
  h.show();
  assert.equal(h.frames.size, 0);
  assert.equal(h.draws, draws);
});

test("missing hero and unavailable canvas context provide harmless disposers", () => {
  const hero = installHeroParallax({
    querySelector: () => null,
  } as unknown as HTMLElement);
  const particles = installParticles({
    getContext: () => null,
  } as unknown as HTMLCanvasElement);
  assert.doesNotThrow(hero);
  assert.doesNotThrow(particles);
});
