import { languageTags, type Locale } from "./data";
import { orchardTranslations } from "./content/orchard";
import {
  ACTIVATION_REFRESH_MS,
  activationState,
  estimateSeconds,
  parseActivation,
  type ActivationSnapshot,
} from "./activation";

export function installActivation(root: HTMLElement, locale: Locale) {
  const c = orchardTranslations[locale];
  const number = new Intl.NumberFormat(languageTags[locale]);
  const date = new Intl.DateTimeFormat(languageTags[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  });
  let snapshot: ActivationSnapshot | undefined;
  let timer = 0;
  let controller: AbortController | undefined;
  let nextFetch = 0;
  let suspended = false;
  let failed = false;
  const jitter = Math.random() * 5000;
  const nodes = Object.fromEntries(
    ["status", "intro", "height", "remaining", "eta", "date", "updated"].map(
      (key) => [
        key,
        root.querySelector<HTMLElement>(`[data-activation-${key}]`)!,
      ],
    ),
  );
  const set = (key: string, text: string) => {
    if (nodes[key].textContent !== text) nodes[key].textContent = text;
  };
  function draw() {
    if (!snapshot) {
      if (failed) set("status", c.unavailable);
      return;
    }
    const state = activationState(snapshot);
    root.dataset.state = failed ? "stale" : state;
    set("status", failed ? c.stale : c[state]);
    set("intro", state === "active" ? c.activeIntro : c.intro);
    set("height", number.format(snapshot.height));
    set("remaining", number.format(snapshot.remaining));
    set("updated", date.format(snapshot.observedAt * 1000));
    nodes.updated.setAttribute(
      "datetime",
      new Date(snapshot.observedAt * 1000).toISOString(),
    );
    const seconds = failed ? null : estimateSeconds(snapshot);
    if (seconds !== null) {
      const minutes = Math.max(1, Math.ceil(seconds / 60));
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      set(
        "eta",
        days
          ? `${number.format(days)} ${c.days} ${number.format(hours)} ${c.hours}`
          : hours
            ? `${number.format(hours)} ${c.hours} ${number.format(minutes % 60)} ${c.minutes}`
            : `${number.format(minutes)} ${c.minutes}`,
      );
      set("date", date.format((snapshot.observedAt + seconds) * 1000));
    } else {
      set("eta", state === "reached" ? c.pending : "—");
      set("date", "—");
    }
  }
  function schedule() {
    clearTimeout(timer);
    if (document.hidden || suspended) return;
    timer = window.setTimeout(refresh, Math.max(0, nextFetch - Date.now()));
  }
  async function refresh() {
    if (document.hidden || suspended || controller) return;
    if (Date.now() < nextFetch) {
      schedule();
      return;
    }
    nextFetch = Date.now() + ACTIVATION_REFRESH_MS + jitter;
    controller = new AbortController();
    const request = controller;
    const timeout = window.setTimeout(() => request.abort(), 8000);
    try {
      // Same-origin static resource; never call the explorer from a visitor's browser.
      const response = await fetch("/data/activation.json", {
        signal: request.signal,
        credentials: "omit",
      });
      if (!response.ok) throw new Error("Activation snapshot unavailable");
      const parsed = parseActivation(await response.json());
      if (!snapshot || parsed.observedAt >= snapshot.observedAt)
        snapshot = parsed;
      failed = false;
      draw();
    } catch {
      if (!document.hidden && !suspended) {
        failed = true;
        draw();
      }
    } finally {
      clearTimeout(timeout);
      controller = undefined;
      schedule();
    }
  }
  function visibility() {
    if (document.hidden) {
      clearTimeout(timer);
      controller?.abort();
    } else {
      draw();
      schedule();
    }
  }
  function hide() {
    suspended = true;
    clearTimeout(timer);
    controller?.abort();
  }
  function show() {
    suspended = false;
    draw();
    schedule();
  }
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", show);
  set("status", c.loading);
  schedule();
  return () => {
    hide();
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", hide);
    window.removeEventListener("pageshow", show);
  };
}
