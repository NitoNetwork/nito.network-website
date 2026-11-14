import type { Copy } from "./content/en";

export const motionChange = "nito:motion-change";
export const motionPaused = () =>
  document.documentElement.dataset?.motion === "paused";

export function installMotionPreference(copy: Copy) {
  const toggle = document.querySelector<HTMLInputElement>("#motion-toggle");
  if (!toggle) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const lifetime = new AbortController();
  const options = { signal: lifetime.signal };
  const sync = () => {
    toggle.checked = !motionPaused() && !reduced.matches;
    toggle.disabled = reduced.matches;
    toggle.title = reduced.matches ? copy.motionSystem : copy.motionSetting;
    document.dispatchEvent(new Event(motionChange));
  };
  const read = () => {
    try {
      document.documentElement.dataset.motion =
        localStorage.getItem("nito-motion") === "paused" ? "paused" : "active";
    } catch {}
    sync();
  };
  toggle.addEventListener(
    "change",
    () => {
      document.documentElement.dataset.motion = toggle.checked
        ? "active"
        : "paused";
      try {
        localStorage.setItem(
          "nito-motion",
          document.documentElement.dataset.motion,
        );
      } catch {}
      sync();
    },
    options,
  );
  reduced.addEventListener("change", sync, options);
  window.addEventListener(
    "storage",
    (event) => {
      if (event.key === "nito-motion" || event.key === null) read();
    },
    options,
  );
  window.addEventListener("pageshow", read, options);
  window.addEventListener(
    "pagehide",
    (event) => {
      if (!event.persisted) lifetime.abort();
    },
    options,
  );
  toggle.closest<HTMLElement>(".motion-setting")!.hidden = false;
  read();
}
