import { motionChange, motionPaused } from "./motion-preference";

/** Reveal hierarchy without hiding content or depending on animation to read it. */
export function installPageMotion() {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const pending = new Set<Element>();
  const animations = new Set<Animation>();
  const lifetime = new AbortController();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        pending.delete(entry.target);
        if (reduced.matches || motionPaused() || document.hidden) continue;
        const animation = entry.target.animate(
          [{ transform: "translateY(14px)" }, { transform: "translateY(0)" }],
          { duration: 460, easing: "cubic-bezier(.2,.7,.2,1)" },
        );
        animations.add(animation);
        animation.finished
          .catch(() => {})
          .finally(() => animations.delete(animation));
      }
    },
    { threshold: 0.08 },
  );
  document
    .querySelectorAll(
      ".home-section-copy, .split-heading, .participation-row, .resource-item, .tool-intro, .tool-form, .mobile-layout > div, .technical-layout > div",
    )
    .forEach((element) => {
      if (element.getBoundingClientRect().top < innerHeight) return;
      pending.add(element);
      observer.observe(element);
    });
  const stop = () => {
    for (const animation of animations) animation.cancel();
    animations.clear();
  };
  reduced.addEventListener("change", stop, { signal: lifetime.signal });
  document.addEventListener(motionChange, stop, { signal: lifetime.signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) stop();
    },
    { signal: lifetime.signal },
  );
  window.addEventListener(
    "pagehide",
    (event) => {
      stop();
      if (!event.persisted) {
        observer.disconnect();
        pending.clear();
        lifetime.abort();
      }
    },
    { signal: lifetime.signal },
  );
  return () => {
    stop();
    observer.disconnect();
    pending.clear();
    lifetime.abort();
  };
}
