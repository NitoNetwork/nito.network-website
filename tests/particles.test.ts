import test from "node:test";
import assert from "node:assert/strict";
import {
  createParticles,
  repelParticles,
  stepParticles,
  installParticles,
} from "../src/particles";

test("particles start still, follow the full pointer path and settle", () => {
  const field = createParticles(800, 600);
  assert.ok(field.length >= 24 && field.length <= 160);
  assert.ok(field.every((p) => p.vx === 0 && p.vy === 0));
  const particles = [
    { x: 400, y: 300, vx: 0, vy: 0, size: 2 },
    { x: 400, y: 320, vx: 0, vy: 0, size: 2 },
    { x: 400, y: 550, vx: 0, vy: 0, size: 2 },
  ];
  assert.equal(
    repelParticles(particles, { x: 0, y: 300 }, { x: 800, y: 300 }),
    true,
  );
  assert.ok(particles[1].vy > 0, "particles move away from the swipe");
  assert.equal(particles[2].vy, 0, "distant particles remain still");
  for (let n = 0; n < 300; n++) stepParticles(particles, 800, 600, 16);
  assert.ok(
    particles.every(
      (p) =>
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.vx === 0 &&
        p.vy === 0,
    ),
  );
  assert.ok(particles[1].y > 320);
  const settled = structuredClone(particles);
  assert.equal(stepParticles(particles, 800, 600, 16), false);
  assert.deepEqual(particles, settled);
});

test("site-wide controller is input-driven, passive and stops when hidden", (t) => {
  let id = 0,
    now = 0,
    painted = 0,
    disconnected = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const reduced = Object.assign(new EventTarget(), { matches: false });
  const doc = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: {},
  });
  const win = new EventTarget();
  const canvas = {
    width: 0,
    height: 0,
    dataset: {} as Record<string, string>,
    getContext: () => ({
      clearRect() {},
      setTransform() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      fillRect() {
        painted++;
      },
    }),
  };
  const globals = {
    document: doc,
    window: win,
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 3,
    matchMedia: () => reduced,
    getComputedStyle: () => ({ getPropertyValue: () => "#07694f" }),
    requestAnimationFrame: (f: FrameRequestCallback) => {
      frames.set(++id, f);
      return id;
    },
    cancelAnimationFrame: (f: number) => frames.delete(f),
    MutationObserver: class {
      observe() {}
      disconnect() {
        disconnected++;
      }
    },
  };
  const originals = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true });
  }
  t.after(() => {
    for (const [key, value] of originals) {
      if (value) Object.defineProperty(globalThis, key, value);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  t.mock.method(performance, "now", () => now);
  const flush = () => {
    for (let i = 0; frames.size && i < 300; i++) {
      now += 16;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((f) => f(now));
    }
    assert.equal(
      frames.size,
      0,
      "frames stop after friction settles the field",
    );
    assert.equal(canvas.dataset.moving, undefined);
  };
  const touch = () =>
    Object.assign(new Event("touchmove", { cancelable: true }), {
      touches: [{ clientX: 400, clientY: 300 }],
    });
  const destroy = installParticles(canvas as unknown as HTMLCanvasElement)!;
  assert.equal(canvas.width, 1600);
  assert.ok(painted > 0);
  assert.equal(frames.size, 0);
  const event = touch();
  win.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
  assert.equal(frames.size, 1);
  flush();
  win.dispatchEvent(touch());
  doc.hidden = true;
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(frames.size, 0);
  doc.hidden = false;
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(frames.size, 0);
  reduced.matches = true;
  reduced.dispatchEvent(new Event("change"));
  win.dispatchEvent(touch());
  assert.equal(frames.size, 0);
  reduced.matches = false;
  win.dispatchEvent(
    Object.assign(new Event("pointermove"), {
      pointerType: "mouse",
      isPrimary: true,
      clientX: 200,
      clientY: 150,
    }),
  );
  assert.equal(frames.size, 1);
  destroy();
  assert.equal(frames.size, 0);
  assert.equal(disconnected, 1);
  win.dispatchEvent(touch());
  assert.equal(frames.size, 0);
});
