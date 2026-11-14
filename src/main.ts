import "./styles.css";
import "./finish.css";
import "./logo-fragments.css";
import "./activation.css";
import "./whitepaper.css";
import { whitepaperCopy } from "./content/whitepaper";
import { installActivation } from "./activation-client";
import {
  createIcons,
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Moon,
  Sun,
  Menu,
  X,
  Globe,
  Radio,
  KeyRound,
  Code2,
  Timer,
  Cpu,
  Network,
  ScanLine,
  BatteryFull,
  Plus,
  Server,
  Pickaxe,
  Search,
  Wallet,
  ChartNoAxesCombined,
  BookOpen,
  Download,
  Terminal,
  Copy as CopyIcon,
} from "lucide";
import {
  detectLocale,
  pageUrl,
  route,
  locales,
  languageTags,
  type Locale,
} from "./data";
import { getCopy } from "./content";
import { render } from "./render";
import { anchor, escape as e, icon } from "./html";
import { chart } from "./chart";
import {
  publishedRelease,
  ReleaseUnavailableError,
  type Release,
} from "./releases";
import { downloadsView, checksumsView } from "./downloads-view";
import { installHeroParallax } from "./hero-parallax";
import { installLogoFragments } from "./logo-fragments";
import { installParticles } from "./particles";
import { installIOSSessionRecovery } from "./ios-session-recovery";
import { installPageMotion } from "./page-motion";
import { installMotionPreference, motionPaused } from "./motion-preference";
import {
  nodeScript,
  nodeDefaults,
  normalizeNodeOptions,
  nodeCheckCommand,
  type NodeOptions,
} from "./installers";

const icons = {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  Moon,
  Sun,
  Menu,
  X,
  Globe,
  Radio,
  KeyRound,
  Code2,
  Timer,
  Cpu,
  Network,
  ScanLine,
  BatteryFull,
  Plus,
  Server,
  Pickaxe,
  Search,
  Wallet,
  ChartNoAxesCombined,
  BookOpen,
  Download,
  Terminal,
  Copy: CopyIcon,
};
const paintIcons = () =>
  createIcons({ icons, attrs: { "stroke-width": 1.65 } });
const current = route(location.pathname);
if (
  current.valid &&
  (location.pathname === "/" || location.pathname.startsWith("/tools/"))
) {
  let preferred: Locale = detectLocale(navigator.languages);
  try {
    const saved = localStorage.getItem("nito-language");
    if (locales.includes(saved as Locale)) preferred = saved as Locale;
  } catch {}
  location.replace(pageUrl(preferred, current.page));
} else {
  installIOSSessionRecovery();
}
const c = getCopy(current.locale);
const app = document.querySelector<HTMLElement>("#app")!;
document.documentElement.dataset.page = current.valid
  ? current.page
  : "not-found";
if (!app.firstElementChild || !current.valid)
  app.innerHTML = render(current.locale, current.page, current.valid);
const activation = document.querySelector<HTMLElement>("[data-activation]");
if (activation) installActivation(activation, current.locale);
document.documentElement.lang = languageTags[current.locale];
if (!current.valid) document.title = `${c.notFound} · Nito Network`;
// Intentional product behavior: every reload starts at the top, without a fragment.
history.scrollRestoration = "manual";
if (
  (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming)
    ?.type === "reload"
) {
  history.replaceState(null, "", location.pathname + location.search);
  addEventListener(
    "pageshow",
    () => scrollTo({ top: 0, behavior: "instant" }),
    { once: true },
  );
}
const themeButton = document.querySelector<HTMLButtonElement>("#theme")!;
function theme(mode: string) {
  document.documentElement.dataset.theme = mode;
  const dark = mode === "dark";
  themeButton.innerHTML = icon(dark ? "sun" : "moon");
  themeButton.title = dark ? c.light : c.dark;
  themeButton.setAttribute("aria-label", themeButton.title);
  paintIcons();
}
theme(document.documentElement.dataset.theme ?? "dark");
installMotionPreference(c);
const particles = document.querySelector<HTMLCanvasElement>("#site-particles");
if (particles) installParticles(particles);
const heroScene = document.querySelector<HTMLElement>("[data-hero-scene]");
if (heroScene) {
  installLogoFragments(heroScene, c);
  installHeroParallax(heroScene);
}
themeButton.addEventListener("click", () => {
  const mode =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  theme(mode);
  try {
    localStorage.setItem("nito-theme", mode);
  } catch {}
});
document
  .querySelector<HTMLSelectElement>("#language")
  ?.addEventListener("change", (event) => {
    const l = (event.target as HTMLSelectElement).value as Locale;
    try {
      localStorage.setItem("nito-language", l);
    } catch {}
    location.assign(pageUrl(l, current.valid ? current.page : "home"));
  });
const menu = document.querySelector<HTMLButtonElement>("#menu")!,
  nav = document.querySelector("#navigation")!;
function setMenu(open: boolean) {
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? c.close : c.menu);
  menu.innerHTML = icon(open ? "x" : "menu");
  nav.classList.toggle("is-open", open);
  paintIcons();
}
menu.addEventListener("click", (event) => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  setMenu(open);
  if (open && event.detail === 0)
    nav.querySelector<HTMLAnchorElement>("a")?.focus();
});
addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }
});
document.addEventListener("click", (event) => {
  if (
    !event
      .composedPath()
      .some(
        (el) => el instanceof Element && el.classList.contains("site-header"),
      ) &&
    menu.getAttribute("aria-expanded") === "true"
  )
    setMenu(false);
});
document.addEventListener("focusin", (event) => {
  if (
    menu.getAttribute("aria-expanded") === "true" &&
    event.target instanceof Element &&
    !event.target.closest(".site-header")
  )
    setMenu(false);
});
document
  .querySelectorAll<HTMLButtonElement>("[data-horizon]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const horizon = Number(button.dataset.horizon);
      document
        .querySelectorAll("[data-horizon]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      document.querySelector("#reward-chart")!.innerHTML = chart(c, horizon);
      announce(`${c.chartTitle}: ${horizon} ${c.years}`);
    }),
  );
const announce = (text: string) => {
  document.querySelector("#announcement")!.textContent = text;
};
const copyStatus = document.createElement("p");
copyStatus.className = "copy-status";
copyStatus.setAttribute("role", "status");
copyStatus.setAttribute("aria-atomic", "true");
let copiedButton: HTMLButtonElement | undefined;
document.addEventListener("click", async (event) => {
  const button = (event.target as Element).closest<HTMLButtonElement>(
    "[data-copy]",
  );
  if (!button || button.disabled) return;
  copiedButton?.removeAttribute("data-copy-state");
  copiedButton = button;
  copyStatus.textContent = "";
  (button.closest(".script-actions, .digest-item") ?? button).after(copyStatus);
  button.disabled = true;
  try {
    await navigator.clipboard.writeText(button.dataset.copy ?? "");
    if (!button.isConnected || copiedButton !== button) return;
    button.dataset.copyState = "success";
    button.title = c.copied;
    copyStatus.textContent = c.copied;
  } catch {
    if (!button.isConnected || copiedButton !== button) return;
    button.dataset.copyState = "error";
    button.title = c.copyFail;
    copyStatus.textContent = c.copyFail;
  } finally {
    button.disabled = false;
  }
});

function drawDownloads(r: Release, fresh: boolean) {
  const root = document.querySelector("#core-downloads");
  if (!root) return;
  root.innerHTML = downloadsView(r, c, current.locale, fresh);
  root.setAttribute("aria-busy", "false");
  const sums = document.querySelector("#checksums");
  if (sums) sums.innerHTML = checksumsView(r, c);
  paintIcons();
}
if (document.querySelector('[data-release="mobile"]'))
  void publishedRelease("mobile")
    .then(({ release, fresh }) => {
      document
        .querySelectorAll<HTMLElement>('[data-release="mobile"]')
        .forEach((el) => {
          el.textContent = release.tag;
          el.title = fresh ? c.live : c.cached;
        });
    })
    .catch(() => {});
if (document.querySelector("#core-downloads"))
  void publishedRelease("core")
    .then(({ release, fresh }) => drawDownloads(release, fresh))
    .catch(() => {
      announce(c.unavailable);
    });

const form = document.querySelector<HTMLFormElement>("#installer");
if (form) {
  let previousNetwork = "mainnet";
  const field = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement;
  const syncNodeSettings = () => {
    const network = field("network").value;
    for (const name of ["p2pPort", "rpcPort"] as const) {
      if (field(name).value === String(nodeDefaults(previousNetwork)[name]))
        field(name).value = String(nodeDefaults(network)[name]);
    }
    previousNetwork = network;
    const pruned = field("storage").value === "pruned";
    form
      .querySelectorAll<HTMLElement>(".prune-setting")
      .forEach((el) => (el.hidden = !pruned));
    field("pruneMiB").disabled = !pruned;
  };
  form.addEventListener("change", syncNodeSettings);
  const sourceNotice = document.querySelector<HTMLElement>(
    "#source-build-notice",
  )!;
  const showBuildNotice = () => {
    sourceNotice.hidden = new FormData(form).get("os") !== "ubuntu-20.04";
  };
  form.addEventListener("change", showBuildNotice);
  let script = "",
    filename = "";
  const result = document.querySelector<HTMLElement>("#script-result")!,
    error = document.querySelector<HTMLElement>("#form-error")!,
    submit = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const submitLabel = submit.innerHTML;
  let revision = 0,
    generating = false;
  form.setAttribute("aria-busy", "false");
  form.addEventListener("input", () => {
    revision++;
    if (script) {
      result.hidden = true;
      result.replaceChildren();
      script = "";
      error.textContent = c.changed;
    }
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (generating) return;
    error.textContent = "";
    result.hidden = true;
    result.replaceChildren();
    script = "";
    if (!form.reportValidity()) return;
    const data = new FormData(form),
      generation = revision;
    const value = (name: string) => String(data.get(name) ?? "");
    generating = true;
    form.setAttribute("aria-busy", "true");
    submit.disabled = true;
    submit.textContent = c.loading;
    announce(c.loading);
    try {
      const options: NodeOptions = {
        os: value("os"),
        arch: value("arch"),
        network: value("network"),
        storage: value("storage"),
        txindex: data.has("txindex"),
        installDir: value("installDir"),
        dataDir: value("dataDir"),
        serviceUser: value("serviceUser"),
        rpcUser: value("rpcUser"),
        rpcPasswordMode: value("rpcPasswordMode"),
        p2pPort: Number(value("p2pPort")),
        rpcPort: Number(value("rpcPort")),
        pruneMiB: Number(value("pruneMiB") || 2048),
        dbCacheMiB: Number(value("dbCacheMiB")),
        maxConnections: Number(value("maxConnections")),
      };
      normalizeNodeOptions(options);
      if (options.storage === "pruned" && options.txindex)
        throw new Error(c.conflict);
      const { release } = await publishedRelease("core");
      if (generation !== revision) throw new Error(c.changed);
      const asset = release.assets.find(
        (a) => a.name.endsWith(`-${options.arch}-linux-gnu.tar.gz`) && a.digest,
      );
      if (!asset) throw new Error(c.unavailable);
      try {
        script = nodeScript(options, asset);
      } catch (reason) {
        if (
          reason instanceof Error &&
          reason.message === "Source build unavailable"
        )
          throw new Error(c.sourceUnavailable);
        throw reason;
      }
      filename = "install-nito-node.sh";
      if (generation !== revision) {
        script = "";
        throw new Error(c.changed);
      }
      const service = "nito-node";
      const check =
        nodeCheckCommand(options, "getconnectioncount") +
        "\n" +
        nodeCheckCommand(options, "getblockchaininfo");
      const code = (s: string) =>
        `<pre class="code-block"><code>${e(s)}</code></pre>`;
      result.innerHTML = `<span class="eyebrow">${e(c.generated)}</span><h2>${e(c.steps)}</h2><div class="script-actions"><button type="button" class="button primary" id="download-script">${icon("download")}${e(c.downloadScript)}</button><button type="button" class="button secondary" data-copy="${e(script)}">${icon("copy")}${e(c.copy)}</button></div><details class="disclosure"><summary>${e(c.viewScript)}${icon("plus")}</summary>${code(script)}</details><div class="install-steps"><article><h3>${e(c.step1)}</h3><p>${e(c.step1Text)}</p></article><article><h3>${e(c.step2)}</h3><p>${e(c.step2Text)}</p>${code(`chmod 700 ${filename}\nsudo bash ./${filename}`)}</article><article><h3>${e(c.step3)}</h3><p>${e(c.step3Text)}</p>${code(`sudo systemctl status ${service} --no-pager\nsudo journalctl -u ${service} -n 60 --no-pager`)}</article><article><h3>${e(c.step4)}</h3><p>${e(c.nodeCheck)}</p>${code(check)}</article></div>`;
      result
        .querySelector("#download-script")!
        .addEventListener("click", () => {
          const url = URL.createObjectURL(
            new Blob([script], { type: "text/x-shellscript;charset=utf-8" }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
      result.hidden = false;
      paintIcons();
      result.focus({ preventScroll: true });
      result.scrollIntoView({
        behavior:
          motionPaused() ||
          matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        block: "start",
      });
    } catch (reason) {
      script = "";
      error.textContent =
        reason instanceof Error && reason.message === "Invalid node settings"
          ? c.invalidNode
          : reason instanceof ReleaseUnavailableError
            ? c.unavailable
            : reason instanceof Error &&
                [
                  c.conflict,
                  c.invalid,
                  c.unavailable,
                  c.changed,
                  c.sourceUnavailable,
                ].includes(reason.message)
              ? reason.message
              : c.invalid;
    } finally {
      generating = false;
      form.setAttribute("aria-busy", "false");
      submit.disabled = false;
      submit.innerHTML = submitLabel;
      paintIcons();
      announce("");
    }
  });
  form.querySelector<HTMLFieldSetElement>("fieldset")!.disabled = false;
  showBuildNotice();
  syncNodeSettings();
}
paintIcons();
installPageMotion();
const whitepaperRoot = document.querySelector<HTMLElement>("[data-whitepaper]");
if (whitepaperRoot) {
  void import("./whitepaper-reader")
    .then(({ installWhitepaper }) =>
      installWhitepaper(whitepaperRoot, current.locale),
    )
    .catch(() => {
      whitepaperRoot.querySelector(".paper-status")!.textContent =
        whitepaperCopy[current.locale].unavailable;
    });
}
