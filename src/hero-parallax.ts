import { motionChange, motionPaused } from "./motion-preference";

const installedHeroes = new WeakMap<HTMLElement, () => void>();

export function installHeroParallax(root: HTMLElement) {
  installedHeroes.get(root)?.();
  const monogram = root.querySelector<HTMLElement>(".ledger-monogram");
  if (!monogram) return () => {};
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const lifetime = new AbortController();
  const options = { passive: true, signal: lifetime.signal };
  let frame = 0;
  let nextX = 0;
  let nextY = 0;
  let bounds: DOMRect | null = null;
  let suspended = false;
  let disposed = false;

  const write = () => {
    monogram.style.setProperty("--hero-shift-x", `${nextX * 8}px`);
    monogram.style.setProperty("--hero-shift-y", `${nextY * 6}px`);
    monogram.style.setProperty("--hero-tilt-x", `${nextY * -2.5}deg`);
    monogram.style.setProperty("--hero-tilt-y", `${nextX * 4}deg`);
  };

  const reset = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    nextX = 0;
    nextY = 0;
    bounds = null;
    root.removeAttribute("data-interacting");
    write();
  };

  const enabled = () =>
    !disposed &&
    !suspended &&
    !document.hidden &&
    !motionPaused() &&
    !reducedMotion.matches;

  const paint = () => {
    frame = 0;
    if (!enabled()) return reset();
    write();
  };

  const move = (event: PointerEvent) => {
    if (!event.isPrimary || !enabled()) return;
    // Keep the full image footprint stable while its transform follows contact.
    bounds ??= monogram.getBoundingClientRect();
    if (
      bounds.width <= 0 ||
      bounds.height <= 0 ||
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      reset();
      return;
    }
    nextX = Math.max(
      -1,
      Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1),
    );
    nextY = Math.max(
      -1,
      Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1),
    );
    root.dataset.interacting = "true";
    if (!frame) frame = requestAnimationFrame(paint);
  };

  const end = (event: PointerEvent) => {
    if (event.isPrimary) reset();
  };

  const preferenceChanged = () => {
    reset();
    if (reducedMotion.matches || motionPaused())
      root.removeAttribute("data-enhanced");
    else root.dataset.enhanced = "true";
  };

  monogram.addEventListener("pointermove", move, options);
  monogram.addEventListener("pointerdown", move, options);
  for (const event of [
    "pointerleave",
    "pointerup",
    "pointercancel",
    "lostpointercapture",
  ])
    monogram.addEventListener(event, end as EventListener, options);
  window.addEventListener("blur", reset, options);
  window.addEventListener("resize", reset, options);
  window.addEventListener("scroll", reset, { ...options, capture: true });
  document.addEventListener("visibilitychange", reset, options);
  // BFCache suspends this controller; only the explicit disposer ends its lifetime.
  window.addEventListener(
    "pagehide",
    () => {
      suspended = true;
      reset();
    },
    options,
  );
  window.addEventListener(
    "pageshow",
    () => {
      suspended = false;
      preferenceChanged();
    },
    options,
  );
  reducedMotion.addEventListener("change", preferenceChanged, options);
  document.addEventListener(motionChange, preferenceChanged, options);
  preferenceChanged();

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    reset();
    lifetime.abort();
    root.removeAttribute("data-enhanced");
    installedHeroes.delete(root);
  };
  installedHeroes.set(root, dispose);
  return dispose;
}
