import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  nodeScript,
  normalizeNodeOptions,
  nodeCheckCommand,
} from "../src/installers";
const options = {
  os: "ubuntu-24.04",
  arch: "x86_64",
  network: "mainnet",
  storage: "pruned",
  txindex: false,
  installDir: "/srv/nito-custom",
  dataDir: "/mnt/ssd/nito-data",
  serviceUser: "nito-custom",
  rpcUser: "rpc-custom",
  rpcPasswordMode: "prompt",
  p2pPort: 18820,
  rpcPort: 18825,
  pruneMiB: 4096,
  dbCacheMiB: 768,
  maxConnections: 48,
};
const release = JSON.parse(readFileSync("public/data/core.json", "utf8"));
const asset = release.assets.find((a: { name: string }) =>
  a.name.endsWith("-x86_64-linux-gnu.tar.gz"),
);
test("custom node settings reach configuration, permissions, service and verification commands", () => {
  const script = nodeScript(options, asset);
  for (const text of [
    "rpcport=18825",
    "port=18820",
    "prune=4096",
    "dbcache=768",
    "maxconnections=48",
    "rpcuser=rpc-custom",
    "User=nito-custom",
    "Group=nito-custom",
    "ReadWritePaths=/mnt/ssd/nito-data",
    "ExecStart=/srv/nito-custom/bin/nitod -datadir=/mnt/ssd/nito-data",
    "chmod 600 /mnt/ssd/nito-data/nito.conf",
    "RequiresMountsFor=/srv/nito-custom /mnt/ssd/nito-data",
    "read -r -s -p",
    "unset RPC_PASSWORD",
    "check_ports",
  ])
    assert.ok(script.includes(text), text);
  assert.doesNotMatch(script, /RPC_PASSWORD=\$\(openssl/);
  assert.match(
    nodeCheckCommand(options, "getblockchaininfo"),
    /sudo -u nito-custom \/srv\/nito-custom\/bin\/nito-cli -datadir=\/mnt\/ssd\/nito-data getblockchaininfo/,
  );
  const bash =
    process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
  execFileSync(bash, ["-n"], { input: script, stdio: "pipe" });
});
test("untrusted node settings cannot inject shell/config/unit content or target protected directories", () => {
  const rejected = [
    { installDir: "/" },
    { installDir: "/etc/nito" },
    { installDir: "/opt/nito;id" },
    { installDir: "/opt/../etc" },
    { installDir: "/opt//nito" },
    { installDir: "/opt/node%u" },
    { installDir: "/home/user/nito" },
    { installDir: "/opt/nito x" },
    { installDir: "/opt/nito\nBad=1" },
    { dataDir: "/srv/nito-custom/data" },
    { dataDir: "/srv/nito-custom" },
    { dataDir: "/srv" },
    { serviceUser: "root" },
    { serviceUser: "-root" },
    { serviceUser: "nito\nGroup=root" },
    { rpcUser: "rpc\nrpcallowip=0.0.0.0/0" },
    { rpcPasswordMode: "secret-value" },
    { p2pPort: 80 },
    { rpcPort: 65536 },
    { rpcPort: 18820 },
    { p2pPort: NaN },
    { rpcPort: 12.5 },
    { pruneMiB: 549 },
    { dbCacheMiB: 3 },
    { dbCacheMiB: 16385 },
    { maxConnections: 0 },
  ];
  for (const bad of rejected)
    assert.throws(
      () => nodeScript({ ...options, ...bad }, asset),
      /Invalid node settings/,
      JSON.stringify(bad),
    );
});
test("custom settings keep randomized passwords as the default and RPC on loopback", () => {
  const defaults = normalizeNodeOptions({
    os: "debian-13",
    arch: "aarch64",
    network: "testnet",
    storage: "full",
    txindex: true,
  });
  assert.equal(defaults.rpcPort, 8845);
  assert.equal(defaults.p2pPort, 8840);
  const script = nodeScript({ ...options, rpcPasswordMode: "random" }, asset);
  assert.match(script, /RPC_PASSWORD=\$\(openssl rand -hex 32\)/);
  assert.match(script, /rpcbind=127.0.0.1\nrpcallowip=127.0.0.1/);
  assert.doesNotMatch(script, /read -r -s -p/);
});
