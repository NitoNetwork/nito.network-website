import type { Copy } from "./content/en";
import { motionChange, motionPaused } from "./motion-preference";
import {
  BURST_DURATION,
  LOGO_OUTLINE,
  createFragment,
  fragmentPose,
  isolateLogoBody,
  type Fragment,
} from "./logo-motion";

type Tile = Fragment & { sourceX: number; sourceY: number; size: number };

export function installLogoFragments(root: HTMLElement, copy: Copy) {
  const picture = root.querySelector<HTMLPictureElement>(
    "picture.ledger-monogram",
  );
  const image = picture?.querySelector("img");
  if (!picture || !image) return () => {};
  const host = document.createElement("div");
  host.className = "ledger-monogram";
  picture.replaceWith(host);
  picture.className = "ledger-art";
  host.append(picture);
  const canvas = document.createElement("canvas");
  canvas.className = "logo-fragments";
  canvas.setAttribute("aria-hidden", "true");
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  // The scene is positioned absolutely; its new controls follow the main actions.
  root.parentElement?.querySelector(".hero-content")?.after(root);
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "logo-trigger";
  trigger.setAttribute("aria-label", copy.logoReplay);
  trigger.title = copy.logoTooltip;
  const lifetime = new AbortController();
  const options = { signal: lifetime.signal };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const forced = matchMedia("(forced-colors: active)");
  const texture = document.createElement("canvas");
  let tiles: Tile[] = [];
  let ready = false,
    visible = false,
    suspended = false,
    disposed = false;
  let frame = 0,
    previous = 0,
    clock = 0,
    burstStart: number | null = null;
  let size = 0,
    ratio = 1,
    lastPaint = 0;
  const allowed = () =>
    ready &&
    visible &&
    !suspended &&
    !disposed &&
    !document.hidden &&
    !motionPaused() &&
    !reduced.matches &&
    !forced.matches;
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  }
  function paint(rest = false) {
    if (!size || !ready) return;
    ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx!.clearRect(0, 0, size * 1.6, size * 1.6);
    const padding = size * 0.3;
    if (rest) {
      ctx!.drawImage(image!, padding, padding, size, size);
      return;
    }
    const scale = size / texture.width;
    for (const tile of tiles) {
      const pose = fragmentPose(
        tile,
        clock,
        burstStart === null ? null : clock - burstStart,
      );
      const width = tile.size * scale;
      ctx!.save();
      ctx!.translate(
        padding + tile.x * size + pose.x * size,
        padding + tile.y * size + pose.y * size,
      );
      ctx!.rotate(pose.angle);
      ctx!.scale(pose.scale, pose.scale);
      ctx!.drawImage(
        texture,
        tile.sourceX,
        tile.sourceY,
        tile.size,
        tile.size,
        -width / 2,
        -width / 2,
        width,
        width,
      );
      ctx!.restore();
    }
  }
  function tick(now: number) {
    frame = 0;
    if (!allowed()) return sync();
    // Visibility changes reset previous; slow frames must not stretch the sequence.
    if (previous) clock += Math.max(0, now - previous);
    previous = now;
    const interval = size < 400 ? 1000 / 30 : 1000 / 60;
    if (now - lastPaint >= interval - 1) {
      lastPaint = now;
      if (burstStart !== null && clock - burstStart >= BURST_DURATION) {
        burstStart = null;
        clock = 0;
      }
      const state = burstStart !== null ? "burst" : "wave";
      if (host.dataset.fragmentState !== state)
        host.dataset.fragmentState = state;
      paint();
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    stop();
    const enabled =
      ready && !motionPaused() && !reduced.matches && !forced.matches;
    trigger.hidden = !enabled;
    host.classList.toggle("has-fragments", enabled);
    root.removeAttribute("aria-hidden");
    if (!allowed()) {
      burstStart = null;
      clock = 0;
      host.dataset.fragmentState = "static";
      paint(true);
    } else frame = requestAnimationFrame(tick);
  }
  function resize() {
    size = host.clientWidth;
    ratio = Math.min(devicePixelRatio || 1, size < 400 ? 1.25 : 1.5);
    canvas.width = Math.round(size * 1.6 * ratio);
    canvas.height = canvas.width;
    paint(true);
  }
  function load() {
    if (disposed || !image!.naturalWidth) return;
    try {
      const count = matchMedia("(max-width: 600px)").matches ? 24 : 32;
      texture.width = texture.height = count * 24;
      const source = texture.getContext("2d", { willReadFrequently: true });
      if (!source) return;
      source.save();
      source.beginPath();
      LOGO_OUTLINE.forEach(([x, y], index) => {
        if (index) source.lineTo(x * texture.width, y * texture.height);
        else source.moveTo(x * texture.width, y * texture.height);
      });
      source.closePath();
      source.clip();
      source.drawImage(image!, 0, 0, texture.width, texture.height);
      source.restore();
      const imageData = source.getImageData(
        0,
        0,
        texture.width,
        texture.height,
      );
      const pixels = isolateLogoBody(
        imageData.data,
        texture.width,
        texture.height,
      );
      imageData.data.set(pixels);
      source.putImageData(imageData, 0, 0);
      tiles = [];
      for (let y = 0; y < texture.height; y += 24) {
        for (let x = 0; x < texture.width; x += 24) {
          let opaque = 0;
          for (let py = y; py < y + 24; py++)
            for (let px = x; px < x + 24; px++)
              if (pixels[(py * texture.width + px) * 4 + 3] > 8) opaque++;
          if (opaque)
            tiles.push({
              ...createFragment(
                (x + 12) / texture.width,
                (y + 12) / texture.height,
                opaque > 80 && opaque < 560,
              ),
              sourceX: x,
              sourceY: y,
              size: 24,
            });
        }
      }
      if (tiles.length < 20) throw new Error("Logo body unavailable");
      if (!ready) host.append(canvas, trigger);
      ready = true;
      resize();
      sync();
    } catch {
      ready = false;
      sync();
    }
  }
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      sync();
    },
    { threshold: 0.05 },
  );
  observer.observe(host);
  const geometry = new ResizeObserver(resize);
  geometry.observe(host);
  trigger.addEventListener(
    "click",
    () => {
      if (!allowed() || burstStart !== null) return;
      burstStart = clock;
      host.dataset.fragmentState = "burst";
      sync();
    },
    options,
  );
  document.addEventListener(motionChange, sync, options);
  reduced.addEventListener("change", sync, options);
  forced.addEventListener("change", sync, options);
  document.addEventListener("visibilitychange", sync, options);
  window.addEventListener(
    "pagehide",
    (event) => {
      suspended = true;
      if (!event.persisted) dispose();
      else sync();
    },
    options,
  );
  window.addEventListener(
    "pageshow",
    () => {
      suspended = false;
      sync();
    },
    options,
  );
  image.addEventListener("load", load, options);
  canvas.addEventListener(
    "contextlost",
    () => {
      ready = false;
      sync();
    },
    options,
  );
  canvas.addEventListener("contextrestored", load, options);
  if (image.complete) load();
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    lifetime.abort();
    observer.disconnect();
    geometry.disconnect();
    host.classList.remove("has-fragments");
    canvas.remove();
    trigger.remove();
    texture.width = texture.height = canvas.width = canvas.height = 0;
    tiles = [];
  }
  return dispose;
}
