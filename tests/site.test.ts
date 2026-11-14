import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { translations } from "../src/content/index";
import { en } from "../src/content/en";
import {
  ACTIVATION_HEIGHT,
  HALVING_HEIGHT,
  detectLocale,
  links,
  locales,
  pageUrl,
  pages,
  rewards,
  nodeSystems,
  route,
} from "../src/data";
import { render } from "../src/render";
import { chart } from "../src/chart";
import { nodeScript } from "../src/installers";
import { sourceRecipe } from "../src/source-build";
import { validateRelease } from "../src/releases";
import { anchor } from "../src/html";
import sharp from "sharp";

test("Orchard activation is distinct from the established halving", () => {
  assert.equal(ACTIVATION_HEIGHT, 1165432);
  assert.equal(HALVING_HEIGHT, 1042400);
  assert.notEqual(ACTIVATION_HEIGHT, HALVING_HEIGHT);
});

test("activation copy focuses on activation in every language", () => {
  for (const l of locales) {
    assert.deepEqual(translations[l].upgradeDetail.match(/\{\w+\}/g), [
      "{height}",
    ]);
    const orchard = render(l, "network")
      .split('id="orchard"')[1]
      .split("</section>")[0];
    assert.doesNotMatch(orchard, /halving|1[^\d]?042[^\d]?400/i);
    assert.match(orchard, /1[^\d]?165[^\d]?432/);
    assert.doesNotMatch(orchard, /1[^\d]?110[^\d]?000/);
  }
});

test("resources and downloads open safely without changing internal navigation", () => {
  for (const l of locales)
    for (const p of pages) {
      for (const [, attributes, href] of render(l, p).matchAll(
        /<a\b([^>]*\bhref="([^"]+)"[^>]*)>/g,
      )) {
        if (
          /^(https?:\/\/|\/downloads\/|\/(?:en|fr|de|es|nl|ru|cn)\/whitepaper\/)/.test(
            href,
          )
        ) {
          assert.match(attributes, /target="_blank"/);
          assert.match(attributes, /rel="noopener noreferrer"/);
        } else assert.doesNotMatch(attributes, /target=/);
      }
    }
});

test("mobile wallet presentation stays on Wallets, with a direct home call to action", () => {
  for (const l of locales) {
    const home = render(l, "home");
    assert.doesNotMatch(
      home,
      /class="mobile-band"|class="phone-scene"|data-release="mobile"/,
    );
    assert.ok(
      home.includes(
        anchor(
          pageUrl(l, "wallets"),
          translations[l].getWallet,
          "button primary",
        ),
      ),
    );
    const wallets = render(l, "wallets");
    assert.equal((wallets.match(/class="mobile-band"/g) ?? []).length, 1);
    assert.match(wallets, /class="phone-scene"/);
    assert.doesNotMatch(
      wallets,
      /phone-real-screen|nito-wallet-dashboard\.png/,
    );
    for (const key of [
      "phoneWalletType",
      "phoneConnected",
      "phoneBalance",
      "phoneConfirmed",
      "phonePending",
      "phoneReceive",
      "phoneSend",
    ] as const) {
      assert.ok(wallets.includes(translations[l][key]), `${l}: ${key}`);
    }
    assert.match(wallets, /data-release="mobile"/);
    assert.ok(wallets.includes(`href="${links.mobile}"`));
  }
});

test("home shows issuance, participation and resources without collapsed content", () => {
  for (const l of locales) {
    const home = render(l, "home");
    assert.doesNotMatch(
      home,
      /<details\b|class="principles"|class="next-links"/,
    );
    const sections = ["discover", "home-participate", "home-resources"].map(
      (id) => home.indexOf(`id="${id}"`),
    );
    assert.ok(
      sections[0] > 0 && sections[1] > sections[0] && sections[2] > sections[1],
    );
    for (const url of [
      pageUrl(l, "easynode"),
      links.mining,
      links.mempool,
      links.explorer,
      links.github,
      pageUrl(l, "whitepaper"),
    ]) {
      assert.ok(home.includes(`href="${url}"`), `${l}: ${url}`);
    }
    for (const page of ["home", "network"] as const) {
      const html = render(l, page);
      assert.equal((html.match(/id="reward-chart"/g) ?? []).length, 1);
      assert.equal((html.match(/data-horizon="/g) ?? []).length, 3);
      assert.match(html, /data-horizon="10" aria-pressed="true"/);
      assert.match(html, /data-horizon="200" aria-pressed="false"/);
      assert.match(html, /class="chart-value"[^>]*>64<\/text>/);
      assert.doesNotMatch(html, /x="40"[^>]*text-anchor="end"/);
    }
  }
});

test("official logos and browser icons have stable dimensions and transparency", async () => {
  for (const [name, dimension] of [
    ["nito-logo.png", 256],
    ["nito-logo-64.png", 64],
    ["nito-logo-128.png", 128],
    ["nito-logo-256.png", 256],
    ["nito-hero-256.png", 256],
    ["nito-hero-1024.png", 1024],
    ["nito-hero-3d.png", 1254],
    ["favicon-16.png", 16],
    ["favicon-32.png", 32],
    ["favicon-48.png", 48],
    ["favicon-192.png", 192],
    ["apple-touch-icon.png", 180],
  ] as const) {
    const info = await sharp(`public/media/${name}`).metadata();
    assert.equal(info.width, dimension);
    assert.equal(info.height, dimension);
    assert.equal(info.hasAlpha, true);
    assert.equal(info.exif, undefined);
  }
  const documentShell = readFileSync("index.html", "utf8");
  for (const icon of [
    "favicon-16.png",
    "favicon-32.png",
    "favicon-48.png",
    "favicon-192.png",
    "apple-touch-icon.png",
  ]) {
    assert.match(documentShell, new RegExp(`${icon}\\?v=20261113`));
  }
  for (const l of locales) {
    const html = render(l, "home");
    assert.equal(
      (
        html.match(/class="brand-symbol" src="\/media\/nito-logo-128.png"/g) ??
        []
      ).length,
      2,
    );
    assert.match(html, /nito-logo-64\.png 64w/);
    assert.match(html, /nito-logo-256\.png 256w/);
    assert.match(html, /class="ledger-scene" data-hero-scene/);
    assert.match(
      html,
      /class="ledger-world"[\s\S]*?nito-ledger-world-1680\.avif/,
    );
    assert.match(html, /class="ledger-monogram"[\s\S]*?nito-blocks-1024\.avif/);
    assert.match(html, /nito-blocks-320\.avif\?v=official-colors 320w/);
    assert.equal((html.match(/\?v=official-colors/g) ?? []).length, 7);
    assert.doesNotMatch(html, /class="ledger-canvas"|data-ledger-scene/);
    assert.doesNotMatch(html, /class="upgrade-band"/);
    assert.doesNotMatch(html, /class="hero-particles"/);
    assert.doesNotMatch(html, /class="brand"[^>]*aria-label=/);
  }
  assert.equal(existsSync("public/media/nito-sculpture.webp"), false);
});

test("living ledger loads as a stable optimized composition", async () => {
  const css = readFileSync("src/styles.css", "utf8");
  assert.match(css, /\.ledger-monogram\s*\{[\s\S]*?touch-action:\s*pan-y;/);
  assert.doesNotMatch(css, /\.ledger-canvas|data-ready="true"/);
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.ledger-monogram/,
  );
  assert.match(css, /@media \(forced-colors: active\)[\s\S]*?\.ledger-scene/);
  assert.doesNotMatch(
    css,
    /\.home-issuance:before|\.muted-band:before|\.mobile-band:before/,
  );
  assert.match(
    css,
    /\.living-hero \.hero-content[\s\S]*?pointer-events:\s*none;/,
  );
  assert.match(css, /\.hero-content a,[\s\S]*?pointer-events:\s*auto;/);
  for (const [name, size] of [
    ["nito-blocks-16.png", 16],
    ["nito-blocks-32.png", 32],
    ["nito-blocks-48.png", 48],
    ["nito-blocks-64.png", 64],
    ["nito-blocks-128.png", 128],
    ["nito-blocks-256.png", 256],
    ["nito-blocks-1024.png", 1024],
    ["nito-blocks.png", 1254],
  ] as const) {
    const info = await sharp(`public/media/${name}`).metadata();
    assert.equal(info.width, size);
    assert.equal(info.height, size);
    assert.equal(info.hasAlpha, true);
  }
  for (const [name, width] of [
    ["nito-ledger-world-960.avif", 960],
    ["nito-ledger-world-1680.avif", 1672],
    ["nito-blocks-320.avif", 320],
    ["nito-blocks-640.avif", 640],
    ["nito-blocks-1024.avif", 1024],
  ] as const) {
    const info = await sharp(`public/media/${name}`).metadata();
    assert.equal(info.width, width);
  }
  assert.ok(
    readFileSync("public/media/nito-ledger-world-1680.avif").byteLength <
      200_000,
  );
  assert.ok(
    readFileSync("public/media/nito-blocks-1024.avif").byteLength < 120_000,
  );
});
test("all seven dictionaries contain every English key and matching placeholders", () => {
  const keys = Object.keys(en).sort();
  for (const l of locales) {
    const copy = translations[l];
    assert.deepEqual(Object.keys(copy).sort(), keys, l);
    for (const k of keys as (keyof typeof en)[]) {
      assert.ok(copy[k].trim(), `${l}.${k}`);
      assert.deepEqual(
        copy[k].match(/\{\w+\}/g)?.sort() ?? [],
        en[k].match(/\{\w+\}/g)?.sort() ?? [],
        `${l}.${k}`,
      );
    }
  }
});
test("technical copy is meaningful and localized", () => {
  assert.equal(translations.en.weight, "Block limit");
  assert.equal(translations.fr.weight, "Limite du bloc");
  assert.equal(translations.de.weight, "Blocklimit");
  assert.equal(translations.es.weight, "Límite del bloque");
  assert.equal(translations.nl.weight, "Bloklimiet");
  assert.equal(translations.ru.weight, "Лимит блока");
  assert.equal(translations.cn.weight, "区块上限");
  for (const l of locales) assert.match(translations[l].weightValue, /WU/);

  for (const l of locales) {
    const resources = render(l, "resources");
    assert.ok(
      resources.includes(translations[l].whitepaper),
      `${l}: whitepaper label`,
    );
    const home = render(l, "home");
    assert.ok(
      home.includes(translations[l].whitepaper),
      `${l}: footer whitepaper label`,
    );
  }

  assert.doesNotMatch(translations.fr.mobileText, /\brelease\b/i);
  assert.doesNotMatch(
    translations.es.sourceBuildNote,
    /\bReserve\b|\bMantenga\b/,
  );
  assert.doesNotMatch(
    translations.es.sourceUnavailable,
    /\bUtilice\b|\bconsulte\b/,
  );
  assert.doesNotMatch(translations.nl.classic, /\bexplorer\b/i);
  assert.doesNotMatch(translations.ru.maxSupply, /эмиссия/i);
});
test("browser language matching and English fallback", () => {
  assert.equal(detectLocale(["fr-BE"]), "fr");
  assert.equal(detectLocale(["zh-CN"]), "cn");
  assert.equal(detectLocale(["pt-BR", "de-DE"]), "de");
  assert.equal(detectLocale([]), "en");
  assert.equal(detectLocale(["ja"]), "en");
});
test("script forms are disabled until local event handlers are attached", () => {
  for (const page of ["easynode"] as const) {
    const html = render("en", page);
    assert.match(html, /<fieldset disabled>/);
    assert.match(html, /<noscript>/);
    assert.match(html, /id="script-result" hidden/);
  }
});
test("old tool routes resolve and unknown pages are invalid", () => {
  assert.equal(route("/tools/easynode/").page, "easynode");
  for (const url of [
    "/tools/nitopool/",
    "/tools/stratum/",
    "/fr/stratum/",
    "/tools/easynode/unexpected/",
  ])
    assert.equal(route(url).valid, false, url);
  assert.equal(route("/fr/downloads/").page, "wallets");
  assert.equal(route("/fr/no-such-page/").valid, false);
});
test("every localized page renders one heading and unique IDs", () => {
  for (const l of locales)
    for (const p of pages) {
      const html = render(l, p);
      assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1, `${l}/${p}`);
      const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(new Set(ids).size, ids.length, `${l}/${p}`);
      assert.ok(!html.includes("undefined"));
      assert.ok(!/easy.?explorer|electrumx|stratum|nitopool/i.test(html));
      assert.ok(!/\bARM64\b/.test(html));
    }
});
test("reward intervals cover all scheduled blocks with no gaps", () => {
  for (let i = 1; i < rewards.length; i++)
    assert.equal(rewards[i].block, rewards[i - 1].last + 1);
  assert.equal(rewards.at(-1)!.year, 51);
  assert.equal(rewards.at(-1)!.reward, 2);
  assert.equal(rewards.at(-1)!.end, 200);
  assert.match(chart(en, 200), /Year 51: 2 NITO/);
});
test("reward charts expose their range, state and complete data accessibly", () => {
  const html = render("en", "home");
  assert.match(html, /id="reward-chart" aria-live="polite" aria-atomic="true"/);
  assert.match(html, /aria-labelledby="reward-chart-heading"/);
  assert.equal((html.match(/aria-controls="reward-chart"/g) ?? []).length, 3);

  const graph = chart(en, 10);
  assert.match(
    graph,
    /aria-labelledby="reward-chart-title" aria-describedby="reward-chart-description"/,
  );
  assert.match(graph, /<desc id="reward-chart-description">/);
  assert.match(graph, /Year 4-10: 64 NITO/);
  assert.match(graph, /<table class="sr-only chart-data">/);
  assert.match(graph, /<th scope="col">Years<\/th>/);
  assert.match(graph, /<th scope="row">4-10<\/th><td>64<\/td>/);
});
test("visual system documents its profile and resilient display modes", () => {
  const design = readFileSync("DESIGN.md", "utf8");
  const css = readFileSync("src/styles.css", "utf8");
  assert.match(design, /Cinematic 3D/);
  assert.match(design, /Technical Premium/);
  assert.match(design, /Living Ledger/);
  assert.match(design, /prefers-reduced-motion/);
  assert.match(css, /@media \(forced-colors: active\)/);
  assert.match(css, /\.chart-value\s*\{[\s\S]*?fill:\s*var\(--text\)/);
  assert.match(css, /--danger-text:/);
});
test("release metadata cannot introduce another download origin", () => {
  const data = JSON.parse(readFileSync("public/data/core.json", "utf8"));
  assert.equal(validateRelease(data, "core").tag, data.tag);
  assert.throws(() =>
    validateRelease({ ...data, url: "https://malicious.invalid/x" }, "core"),
  );
  assert.equal(
    validateRelease(
      {
        ...data,
        assets: [{ name: "evil", url: "javascript:alert(1)", size: 1 }],
      },
      "core",
    ).assets.length,
    0,
  );
});
test("node installers require checksums, reject incompatible options, and keep RPC local", () => {
  const data = JSON.parse(readFileSync("public/data/core.json", "utf8"));
  const asset = data.assets.find((a: { name: string }) =>
    a.name.includes("x86_64-linux"),
  );
  const o = {
    os: "ubuntu-24.04",
    arch: "x86_64",
    network: "mainnet",
    storage: "full",
    txindex: false,
  };
  const script = nodeScript(o, asset);
  assert.match(script, /sha256sum --check/);
  assert.match(script, /rpcbind=127.0.0.1/);
  assert.match(script, /Refusing to overwrite/);
  assert.doesNotMatch(script, /ufw enable|apt-get upgrade|rpcallowip=0/);
  assert.throws(() =>
    nodeScript({ ...o, storage: "pruned", txindex: true }, asset),
  );
  assert.throws(() => nodeScript(o, { ...asset, digest: null }));
  assert.match(nodeScript({ ...o, network: "testnet" }, asset), /rpcport=8845/);
  mkdirSync(".cache/tests", { recursive: true });
  writeFileSync(".cache/tests/node.sh", script);
});
test("generated installers have valid Bash syntax", () => {
  const bash =
    process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
  if (!existsSync(bash) && process.platform === "win32")
    throw new Error("Bash needed for installer syntax tests");
  for (const file of ["node"])
    execFileSync(bash, ["-n", `.cache/tests/${file}.sh`]);
});

test("all five systems and both architectures generate checked scripts", () => {
  const data = JSON.parse(readFileSync("public/data/core.json", "utf8"));
  const bash =
    process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
  for (const system of nodeSystems)
    for (const arch of ["x86_64", "aarch64"])
      for (const network of ["mainnet", "testnet"])
        for (const [storage, txindex] of [
          ["full", false],
          ["full", true],
          ["pruned", false],
        ] as const) {
          const asset = data.assets.find((a: { name: string }) =>
            a.name.endsWith(`-${arch}-linux-gnu.tar.gz`),
          );
          const script = nodeScript(
            { os: system.id, arch, network, storage, txindex },
            asset,
          );
          assert.ok(script.includes(`"$VERSION_ID" = '${system.version}'`));
          assert.ok(script.includes(`"$ID" = '${system.family}'`));
          assert.ok(
            script.indexOf('"$DAEMON" --version') <
              script.indexOf("useradd --system"),
          );
          assert.equal(
            script.includes("make -j2"),
            system.id === "ubuntu-20.04",
          );
          assert.doesNotMatch(script, /stratum|zmqpub/);
          execFileSync(bash, ["-n"], {
            input: script,
            stdio: ["pipe", "pipe", "pipe"],
          });
        }
});

test("Ubuntu 20.04 builds verified source without automatically compiling future releases", () => {
  const data = JSON.parse(readFileSync("public/data/core.json", "utf8"));
  const asset = data.assets.find((a: { name: string }) =>
    a.name.includes("x86_64-linux"),
  );
  const options = {
    os: "ubuntu-20.04",
    arch: "x86_64",
    network: "mainnet",
    storage: "full",
    txindex: false,
  };
  const script = nodeScript(options, asset);
  assert.ok(script.includes(sourceRecipe.sha256));
  assert.ok(script.includes(sourceRecipe.commit));
  assert.match(script, /runuser -u nobody/);
  assert.match(script, /--disable-wallet/);
  assert.throws(
    () =>
      nodeScript(options, {
        ...asset,
        url: asset.url.replace(sourceRecipe.tag, "v4.0.0"),
      }),
    /Source build unavailable/,
  );
  assert.throws(
    () => nodeScript({ ...options, os: "ubuntu-18.04" }, asset),
    /Unsupported OS/,
  );
});
test("installer stops immediately without administrator privileges", () => {
  const bash =
    process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
  assert.throws(
    () =>
      execFileSync(
        bash,
        [
          "-c",
          'id() { printf "1000\\n"; }; export -f id; bash .cache/tests/node.sh',
        ],
        { stdio: "pipe" },
      ),
    (error: unknown) => {
      return (
        (error as { status: number; stderr: Buffer }).status === 1 &&
        (error as { stderr: Buffer }).stderr
          .toString()
          .includes("Run with sudo.")
      );
    },
  );
});
test("static builds contain every route, local resource and security fallback", () => {
  const build = JSON.parse(readFileSync("dist/build.json", "utf8")) as {
    origin: string;
    indexable: boolean;
  };
  for (const l of locales)
    for (const p of pages) {
      const path = `dist/${l}/${p === "home" ? "" : p + "/"}index.html`;
      assert.ok(existsSync(path), path);
      const html = readFileSync(path, "utf8");
      assert.match(
        html,
        build.indexable
          ? /index,follow,max-image-preview:large/
          : /noindex,nofollow/,
      );
      assert.ok(
        html.includes(
          `<link rel="canonical" href="${build.origin}${pageUrl(l, p)}">`,
        ),
      );
      assert.match(html, /id="site-particles" aria-hidden="true"/);
      assert.doesNotMatch(html, /stratum|nitopool/i);
      for (const m of html.matchAll(
        /(?:src|href)="(\/(?:assets|media|data|downloads)\/[^"#]+)"/g,
      )) {
        const assetPath = m[1].split("?", 1)[0];
        assert.ok(existsSync("dist" + assetPath), m[1]);
      }
    }
  assert.ok(existsSync("dist/404.html"));
  for (const path of [
    "dist/tools/nitopool",
    "dist/tools/stratum",
    "dist/downloads/source/SHA256SUMS.txt",
    "dist/downloads/source/Nito-Stratum-73a99a8b.zip",
    "dist/downloads/source/Nito-Stratum-73a99a8b.tar.gz",
  ])
    assert.equal(existsSync(path), false, path);
  for (const l of locales) assert.equal(existsSync(`dist/${l}/stratum`), false);
  const scripts = readdirSync("dist/assets").filter((name) =>
    name.endsWith(".js"),
  );
  assert.equal(scripts.length, 2);
  assert.equal(scripts.filter((name) => name.startsWith("index-")).length, 1);
  assert.equal(
    scripts.filter((name) => name.startsWith("whitepaper-reader-")).length,
    1,
  );
});
