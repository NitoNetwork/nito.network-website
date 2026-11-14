import { nodeSystems } from "./data";
import type { Asset } from "./releases";
import { sourceBuild, sourceRecipe } from "./source-build";

export type NodeOptions = {
  os: string;
  arch: string;
  network: string;
  storage: string;
  txindex: boolean;
  installDir?: string;
  dataDir?: string;
  serviceUser?: string;
  rpcUser?: string;
  rpcPasswordMode?: string;
  p2pPort?: number;
  rpcPort?: number;
  pruneMiB?: number;
  dbCacheMiB?: number;
  maxConnections?: number;
};
export function nodeDefaults(network = "mainnet") {
  return {
    installDir: "/opt/nito-node",
    dataDir: "/var/lib/nito-node",
    serviceUser: "nito-node",
    rpcUser: "nito-local",
    rpcPasswordMode: "random",
    p2pPort: network === "testnet" ? 8840 : 8820,
    rpcPort: network === "testnet" ? 8845 : 8825,
    pruneMiB: 2048,
    dbCacheMiB: 450,
    maxConnections: 125,
  };
}
export function normalizeNodeOptions(options: NodeOptions) {
  const o = { ...nodeDefaults(options.network), ...options };
  const fail = () => {
    throw new Error("Invalid node settings");
  };
  const path = (value: string) =>
    typeof value === "string" &&
    value.length <= 180 &&
    /^\/(opt|srv|mnt|media|var\/lib|usr\/local)\/[A-Za-z0-9_-][A-Za-z0-9_./-]*$/.test(
      value,
    ) &&
    value
      .split("/")
      .slice(1)
      .every((part) => /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(part));
  if (
    !path(o.installDir) ||
    !path(o.dataDir) ||
    o.installDir === o.dataDir ||
    o.installDir.startsWith(o.dataDir + "/") ||
    o.dataDir.startsWith(o.installDir + "/")
  )
    fail();
  if (
    typeof o.serviceUser !== "string" ||
    typeof o.rpcUser !== "string" ||
    !/^[a-z_][a-z0-9_-]{0,30}$/.test(o.serviceUser) ||
    ["root", "nobody", "daemon"].includes(o.serviceUser) ||
    !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(o.rpcUser) ||
    !["random", "prompt"].includes(o.rpcPasswordMode)
  )
    fail();
  const integer = (value: number, min: number, max: number) => {
    if (!Number.isInteger(value) || value < min || value > max) fail();
  };
  integer(o.p2pPort, 1024, 65535);
  integer(o.rpcPort, 1024, 65535);
  if (o.p2pPort === o.rpcPort) fail();
  integer(o.pruneMiB, 550, 16777216);
  integer(o.dbCacheMiB, 4, 16384);
  integer(o.maxConnections, 8, 1024);
  return o;
}
export const shellQuote = (text: string) =>
  "'" + text.replaceAll("'", "'\\''") + "'";
function preamble(os: string): string {
  const system = nodeSystems.find((s) => s.id === os);
  if (!system) throw new Error("Unsupported OS");
  return `#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ "$(id -u)" = 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
[[ -f /etc/os-release ]] || exit 1
. /etc/os-release
[[ "$ID" = ${shellQuote(system.family)} ]] || { echo 'Operating system does not match.' >&2; exit 1; }
[[ "$VERSION_ID" = ${shellQuote(system.version)} ]] || { echo 'Operating system version does not match.' >&2; exit 1; }
command -v systemctl >/dev/null
systemctl show-environment >/dev/null
WORK=$(mktemp -d /tmp/nito-install.XXXXXXXX)
trap 'rm -rf -- "$WORK"' EXIT
trap 'echo "Installation stopped. Inspect the error before retrying." >&2' ERR
`;
}
function refuseExisting(paths: string[], user: string) {
  return (
    paths
      .map(
        (path) =>
          `[[ ! -e ${shellQuote(path)} && ! -L ${shellQuote(path)} ]] || { echo 'Refusing to overwrite ${path}.' >&2; exit 1; }`,
      )
      .join("\n") +
    `\n! id ${shellQuote(user)} >/dev/null 2>&1 || { echo 'Service account already exists.' >&2; exit 1; }
! getent group ${shellQuote(user)} >/dev/null || { echo 'Service group already exists.' >&2; exit 1; }\n`
  );
}
export function nodeScript(options: NodeOptions, asset: Asset): string {
  const o = normalizeNodeOptions(options);
  if (
    !["x86_64", "aarch64"].includes(o.arch) ||
    !["mainnet", "testnet"].includes(o.network) ||
    !["full", "pruned"].includes(o.storage)
  )
    throw new Error("Invalid options");
  if (o.storage === "pruned" && o.txindex)
    throw new Error("Incompatible storage");
  if (
    !asset.url.startsWith(
      "https://github.com/NitoNetwork/Nito-core/releases/download/",
    ) ||
    !asset.name.endsWith(`-${o.arch}-linux-gnu.tar.gz`) ||
    !/^sha256:[a-f0-9]{64}$/i.test(asset.digest ?? "")
  )
    throw new Error("Verified Linux release required");
  const test = o.network === "testnet",
    rpc = o.rpcPort,
    p2p = o.p2pPort;
  const compile = o.os === "ubuntu-20.04";
  if (
    compile &&
    asset.url !==
      `https://github.com/NitoNetwork/Nito-core/releases/download/${sourceRecipe.tag}/${asset.name}`
  )
    throw new Error("Source build unavailable");
  return (
    preamble(o.os) +
    refuseExisting(
      [o.installDir, o.dataDir, "/etc/systemd/system/nito-node.service"],
      o.serviceUser,
    ) +
    `
[[ "$(uname -m)" = ${shellQuote(o.arch)} ]] || { echo 'Architecture does not match.' >&2; exit 1; }
for directory in ${shellQuote(o.installDir)} ${shellQuote(o.dataDir)}; do
  [[ "$(realpath -m -- "$directory")" = "$directory" ]] || { echo 'Symbolic links in installation paths are not supported.' >&2; exit 1; }
done
check_ports() {
  local listeners
  for port in ${p2p} ${rpc}; do
    listeners=$(ss -H -ltn "sport = :$port") || { echo 'Cannot inspect listening TCP ports.' >&2; exit 1; }
    [[ -z "$listeners" ]] || { echo "TCP port $port is already in use." >&2; exit 1; }
  done
}
if command -v ss >/dev/null; then check_ports; fi
${
  o.rpcPasswordMode === "prompt"
    ? `[[ -t 0 ]] || { echo 'A terminal is required to choose the RPC password.' >&2; exit 1; }
read -r -s -p 'RPC password (16-128 characters: letters, digits or ._~!@%+=:,/-): ' RPC_PASSWORD </dev/tty
printf '\\n' >/dev/tty
read -r -s -p 'Confirm RPC password: ' RPC_CONFIRM </dev/tty
printf '\\n' >/dev/tty
[[ "$RPC_PASSWORD" =~ ^[A-Za-z0-9._~!@%+=:,/-]{16,128}$ && "$RPC_PASSWORD" = "$RPC_CONFIRM" ]] || { echo 'Invalid or mismatched RPC password.' >&2; exit 1; }
unset RPC_CONFIRM`
    : ""
}
${
  compile
    ? sourceBuild()
    : `apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl tar openssl iproute2 libevent-dev libzmq5
curl --fail --location --proto '=https' --tlsv1.2 --retry 2 ${shellQuote(asset.url)} -o "$WORK/core.tar.gz"
printf '%s  %s\n' ${shellQuote(asset.digest!.slice(7))} "$WORK/core.tar.gz" | sha256sum --check --status
mkdir "$WORK/unpacked"
tar -xzf "$WORK/core.tar.gz" -C "$WORK/unpacked" --no-same-owner --no-same-permissions --wildcards '*/bin/nitod' '*/bin/nito-cli'
DAEMON=$(find "$WORK/unpacked" -type f -name nitod -print -quit)
CLI=$(find "$WORK/unpacked" -type f -name nito-cli -print -quit)
[[ -n "$DAEMON" && -n "$CLI" ]] || exit 1
chmod 755 "$DAEMON" "$CLI"
`
}
"$DAEMON" --version && "$CLI" --version || { echo 'The executables cannot run on this host. No node service has been created.' >&2; exit 1; }
check_ports
useradd --system --user-group --home-dir ${o.dataDir} --shell /usr/sbin/nologin ${o.serviceUser}
install -d -m 755 ${o.installDir}/bin
install -m 755 "$DAEMON" ${o.installDir}/bin/nitod
install -m 755 "$CLI" ${o.installDir}/bin/nito-cli
install -d -m 700 -o ${o.serviceUser} -g ${o.serviceUser} ${o.dataDir}
${o.rpcPasswordMode === "random" ? "RPC_PASSWORD=$(openssl rand -hex 32)" : ""}
cat > ${o.dataDir}/nito.conf <<CONFIG
server=1
listen=1
daemon=0
testnet=${test ? 1 : 0}
prune=${o.storage === "pruned" ? o.pruneMiB : 0}
txindex=${o.txindex ? 1 : 0}
dbcache=${o.dbCacheMiB}
maxconnections=${o.maxConnections}
[${test ? "test" : "main"}]
port=${p2p}
rpcbind=127.0.0.1
rpcallowip=127.0.0.1
rpcport=${rpc}
rpcuser=${o.rpcUser}
rpcpassword=$RPC_PASSWORD
CONFIG
unset RPC_PASSWORD
chown ${o.serviceUser}:${o.serviceUser} ${o.dataDir}/nito.conf
chmod 600 ${o.dataDir}/nito.conf
cat > /etc/systemd/system/nito-node.service <<'SERVICE'
[Unit]
Description=Nito full node
After=network-online.target
Wants=network-online.target
RequiresMountsFor=${o.installDir} ${o.dataDir}
[Service]
Type=simple
User=${o.serviceUser}
Group=${o.serviceUser}
ExecStart=${o.installDir}/bin/nitod -datadir=${o.dataDir} -daemon=0
Restart=on-failure
RestartSec=15
TimeoutStopSec=300
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${o.dataDir}
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
UMask=0077
[Install]
WantedBy=multi-user.target
SERVICE
systemctl daemon-reload
systemctl enable --now nito-node.service
systemctl is-active --quiet nito-node.service
echo 'Node started. Allow P2P ${p2p}/tcp only if you want inbound peers. Never expose RPC ${rpc}.'
echo 'RPC credentials are in ${o.dataDir}/nito.conf. Keep this file private.'
echo 'Check synchronization with: ${nodeCheckCommand(o, "getblockchaininfo")}'
`
  );
}

export function nodeCheckCommand(
  options: NodeOptions,
  command: "getconnectioncount" | "getblockchaininfo",
) {
  const o = normalizeNodeOptions(options);
  return `sudo -u ${o.serviceUser} ${o.installDir}/bin/nito-cli -datadir=${o.dataDir} ${command}`;
}
