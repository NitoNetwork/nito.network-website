import { motionChange, motionPaused } from "./motion-preference";

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
};
export type Point = { x: number; y: number };

export function createParticles(width: number, height: number): Particle[] {
  const count = Math.max(
    24,
    Math.min(160, Math.round((width * height) / 13500)),
  );
  const columns = Math.ceil(Math.sqrt((count * width) / Math.max(1, height)));
  const rows = Math.ceil(count / columns);
  let seed = 0x1234abcd;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, (_, i) => ({
    x: (((i % columns) + 0.16 + random() * 0.68) * width) / columns,
    y: ((Math.floor(i / columns) + 0.16 + random() * 0.68) * height) / rows,
    vx: 0,
    vy: 0,
    size: 1.5 + random() * 1.2,
  }));
}

export function repelParticles(
  particles: Particle[],
  from: Point,
  to: Point,
  radius = 110,
) {
  const dx = to.x - from.x,
    dy = to.y - from.y,
    length = dx * dx + dy * dy;
  let changed = false;
  particles.forEach((p, i) => {
    // Use the entire pointer path so a fast swipe cannot skip nearby particles.
    const t = length
      ? Math.max(
          0,
          Math.min(1, ((p.x - from.x) * dx + (p.y - from.y) * dy) / length),
        )
      : 0;
    let nx = p.x - from.x - dx * t,
      ny = p.y - from.y - dy * t;
    const distance = Math.hypot(nx, ny);
    if (distance >= radius) return;
    if (distance < 0.01) {
      nx = Math.cos(i * 2.399);
      ny = Math.sin(i * 2.399);
    } else {
      nx /= distance;
      ny /= distance;
    }
    const force =
      (1 - distance / radius) ** 2 *
      (2.8 + Math.min(Math.sqrt(length), 80) / 18);
    p.vx += nx * force;
    p.vy += ny * force;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 12) {
      p.vx *= 12 / speed;
      p.vy *= 12 / speed;
    }
    changed = true;
  });
  return changed;
}

export function stepParticles(
  particles: Particle[],
  width: number,
  height: number,
  ms: number,
) {
  const dt = Math.max(0, Math.min(ms, 32)),
    damping = Math.exp(-dt / 115);
  let moving = false;
  for (const p of particles) {
    p.x += (p.vx * dt) / 16;
    p.y += (p.vy * dt) / 16;
    if (p.x < 3 || p.x > width - 3) {
      p.x = Math.max(3, Math.min(width - 3, p.x));
      p.vx *= -0.3;
    }
    if (p.y < 3 || p.y > height - 3) {
      p.y = Math.max(3, Math.min(height - 3, p.y));
      p.vy *= -0.3;
    }
    p.vx *= damping;
    p.vy *= damping;
    if (Math.hypot(p.vx, p.vy) < 0.035) {
      p.vx = 0;
      p.vy = 0;
    } else moving = true;
  }
  return moving;
}

const installedFields = new WeakMap<HTMLCanvasElement, () => void>();

export function installParticles(canvas: HTMLCanvasElement) {
  installedFields.get(canvas)?.();
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const forcedColors = matchMedia("(forced-colors: active)");
  const lifetime = new AbortController(),
    options = { passive: true, signal: lifetime.signal };
  let particles: Particle[] = [],
    colors: string[] = [];
  let width = 1,
    height = 1,
    frame = 0,
    previous = 0;
  let trail: Point | null = null,
    lastInput = 0;
  let suspended = false,
    disposed = false;
  const enabled = () =>
    !disposed &&
    !suspended &&
    !document.hidden &&
    !motionPaused() &&
    !reduced.matches &&
    !forcedColors.matches;
  function draw() {
    ctx!.clearRect(0, 0, width, height);
    particles.forEach((p, i) => {
      ctx!.fillStyle = ctx!.strokeStyle = colors[i % colors.length];
      ctx!.globalAlpha = i % 3 === 0 ? 0.55 : 0.32;
      ctx!.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      if (Math.hypot(p.vx, p.vy) > 0.2) {
        ctx!.globalAlpha = 0.2;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(p.x, p.y);
        ctx!.lineTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
        ctx!.stroke();
      }
    });
    ctx!.globalAlpha = 1;
  }
  function colorsChanged() {
    const css = getComputedStyle(document.documentElement);
    colors = ["--primary", "--accent", "--spark"].map((k) =>
      css.getPropertyValue(k).trim(),
    );
    draw();
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    delete canvas.dataset.moving;
  }
  function settle() {
    stop();
    trail = null;
    lastInput = 0;
    particles.forEach((p) => {
      p.vx = 0;
      p.vy = 0;
    });
    draw();
  }
  function tick(now: number) {
    frame = 0;
    if (!enabled()) return settle();
    const moving = stepParticles(
      particles,
      width,
      height,
      previous ? now - previous : 16,
    );
    previous = now;
    draw();
    if (moving) frame = requestAnimationFrame(tick);
    else stop();
  }
  function interact(point: Point, radius: number) {
    if (!enabled()) return;
    const now = performance.now();
    const changed = repelParticles(
      particles,
      trail && now - lastInput < 150 ? trail : point,
      point,
      radius,
    );
    trail = point;
    lastInput = now;
    if (changed && !frame) {
      canvas.dataset.moving = "true";
      frame = requestAnimationFrame(tick);
    }
  }
  function pointer(event: PointerEvent) {
    if (event.pointerType !== "touch" && event.isPrimary)
      interact({ x: event.clientX, y: event.clientY }, 110);
  }
  function touch(event: TouchEvent) {
    if (event.touches.length !== 1) {
      trail = null;
      return;
    }
    interact({ x: event.touches[0].clientX, y: event.touches[0].clientY }, 125);
  }
  function resize() {
    stop();
    trail = null;
    width = Math.max(8, document.documentElement.clientWidth || innerWidth);
    height = Math.max(8, innerHeight);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
    particles = createParticles(width, height);
    draw();
  }
  colorsChanged();
  resize();
  const theme = new MutationObserver(colorsChanged);
  theme.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  window.addEventListener("pointermove", pointer, options);
  window.addEventListener("pointerdown", pointer, options);
  // Passive touch events continue during native page scrolling, after pointercancel.
  window.addEventListener("touchstart", touch, options);
  window.addEventListener("touchmove", touch, options);
  for (const event of ["touchend", "touchcancel", "pointercancel", "blur"])
    window.addEventListener(
      event,
      () => {
        trail = null;
      },
      options,
    );
  window.addEventListener("resize", resize, options);
  window.addEventListener(
    "pagehide",
    () => {
      suspended = true;
      settle();
    },
    options,
  );
  window.addEventListener(
    "pageshow",
    () => {
      suspended = false;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const nextWidth = Math.max(
        8,
        document.documentElement.clientWidth || innerWidth,
      );
      const nextHeight = Math.max(8, innerHeight);
      if (
        width !== nextWidth ||
        height !== nextHeight ||
        canvas.width !== Math.round(nextWidth * ratio) ||
        canvas.height !== Math.round(nextHeight * ratio)
      )
        resize();
      else settle();
    },
    options,
  );
  document.addEventListener("visibilitychange", settle, options);
  document.addEventListener(motionChange, settle, options);
  reduced.addEventListener("change", settle, options);
  forcedColors.addEventListener("change", settle, options);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    settle();
    theme.disconnect();
    lifetime.abort();
    installedFields.delete(canvas);
  };
  installedFields.set(canvas, dispose);
  return dispose;
}
