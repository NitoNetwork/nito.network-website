import type { Copy } from "./content/en";
import { nodeSystems } from "./data";
import { escape as e, icon } from "./html";
import { nodeDefaults } from "./installers";

export function toolPage(c: Copy): string {
  const defaults = nodeDefaults();
  const input = (
    name: string,
    label: string,
    value: string | number,
    attrs = "",
  ) =>
    `<label class="field">${e(label)}<input name="${name}" value="${e(String(value))}" required ${attrs}></label>`;
  const number = (
    name: string,
    label: string,
    value: number,
    min: number,
    max: number,
  ) =>
    input(
      name,
      label,
      value,
      `type="number" min="${min}" max="${max}" step="1"`,
    );
  const select = (name: string, label: string, items: [string, string][]) =>
    `<label class="field">${e(label)}<select name="${name}">${items.map(([v, t]) => `<option value="${v}">${e(t)}</option>`).join("")}</select></label>`;
  return `<header class="page-heading wrap"><span class="eyebrow">${e(c.tools)}</span><h1>EasyNode<span class="brand-period">.</span></h1><p class="lead">${e(c.toolsIntro)}</p></header>
  <section class="wrap tool-layout"><div class="tool-intro"><h2>${e(c.requirements)}</h2><p>${e(c.requirementsText)}</p><p>${e(c.nodeRequirement)}</p><p class="notice">${e(c.privacyLocal)}</p></div>
  <form class="tool-form" id="installer" autocomplete="off"><noscript><p class="notice">${e(c.javascript)}</p></noscript><fieldset disabled><h2>${e(c.settings)}</h2><div class="fields">
  ${select(
    "os",
    c.os,
    nodeSystems.map((s) => [s.id, s.label]),
  )}
  ${select("arch", c.architecture, [
    ["x86_64", "x86_64"],
    ["aarch64", "aarch64"],
  ])}
  ${select("network", c.networkField, [
    ["mainnet", c.mainnet],
    ["testnet", c.testnet],
  ])}
  ${select("storage", c.storage, [
    ["full", c.full],
    ["pruned", c.pruned],
  ])}
  <label class="check-field"><input type="checkbox" name="txindex">${e(c.txindex)}</label></div>
  <section class="node-settings" aria-labelledby="node-paths"><h3 id="node-paths">${e(c.nodePaths)}</h3><div class="fields">
  ${input("installDir", c.installDir, defaults.installDir, 'type="text" maxlength="180" spellcheck="false" autocapitalize="none"')}
  ${input("dataDir", c.dataDir, defaults.dataDir, 'type="text" maxlength="180" spellcheck="false" autocapitalize="none"')}
  </div><p class="field-note">${e(c.pathsNote)}</p></section>
  <section class="node-settings" aria-labelledby="node-access"><h3 id="node-access">${e(c.nodeAccess)}</h3><div class="fields">
  ${input("serviceUser", c.serviceUser, defaults.serviceUser, 'type="text" maxlength="31" pattern="[a-z_][a-z0-9_\\-]{0,30}" spellcheck="false" autocapitalize="none"')}
  ${input("rpcUser", c.rpcUser, defaults.rpcUser, 'type="text" maxlength="64" pattern="[A-Za-z][A-Za-z0-9_\\-]{0,63}" spellcheck="false" autocapitalize="none"')}
  ${number("p2pPort", c.p2pPort, defaults.p2pPort, 1024, 65535)}
  ${number("rpcPort", c.rpcPort, defaults.rpcPort, 1024, 65535)}
  ${select("rpcPasswordMode", c.rpcPasswordMode, [
    ["random", c.passwordRandom],
    ["prompt", c.passwordPrompt],
  ])}
  </div><p class="field-note">${e(c.accessNote)}</p></section>
  <section class="node-settings" aria-labelledby="node-performance"><h3 id="node-performance">${e(c.nodePerformance)}</h3><div class="fields">
  ${number("dbCacheMiB", c.dbCacheMiB, defaults.dbCacheMiB, 4, 16384)}
  ${number("maxConnections", c.maxConnections, defaults.maxConnections, 8, 1024)}
  <div class="prune-setting" hidden>${number("pruneMiB", c.pruneMiB, defaults.pruneMiB, 550, 16777216)}</div>
  </div><p class="field-note prune-setting" hidden>${e(c.pruneNote)}</p></section>
  <p class="notice" id="source-build-notice" hidden>${e(c.sourceBuildNote)}</p><p class="form-error" id="form-error" role="alert"></p><button type="submit" class="button primary">${icon("terminal")}${e(c.generate)}</button></fieldset></form></section>
  <section class="script-result wrap" id="script-result" hidden tabindex="-1"></section>`;
}
