// Source recipes are reviewed per release; never build an unreviewed latest branch.
export const sourceRecipe = {
  tag: "v3.0.1",
  commit: "663ed2773928f2381c3f63fbe447fbbf640c89fb",
  sha256: "5fb95fd191919ecf34152cb20474909f810a98ec08ccef3b565c71f8ee18a808",
} as const;

export function sourceBuild(): string {
  return `
[[ $(awk '/MemAvailable:/ {print $2}' /proc/meminfo) -ge 3145728 ]] || { echo 'Compilation needs at least 3 GiB available memory.' >&2; exit 1; }
[[ $(df -Pk "$WORK" | awk 'END {print $4}') -ge 10485760 ]] || { echo 'Compilation needs 10 GiB free temporary storage, in addition to blockchain storage.' >&2; exit 1; }
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl tar openssl iproute2 build-essential gcc-10 g++-10 autoconf automake libtool pkg-config python3 bsdmainutils xz-utils bzip2 patch util-linux
curl --fail --location --proto '=https' --tlsv1.2 --retry 2 'https://codeload.github.com/NitoNetwork/Nito-core/tar.gz/${sourceRecipe.commit}' -o "$WORK/source.tar.gz"
printf '%s  %s\n' '${sourceRecipe.sha256}' "$WORK/source.tar.gz" | sha256sum --check --status
mkdir "$WORK/source"
tar -xzf "$WORK/source.tar.gz" -C "$WORK/source" --strip-components=1 --no-same-owner --no-same-permissions
# Build as an unprivileged account, without changing the host's default compiler.
chmod 755 "$WORK"
chown -R nobody:nogroup "$WORK/source"
runuser -u nobody -- env -i PATH=/usr/bin:/bin HOME="$WORK/source" BUILD_DIR="$WORK/source" bash <<'BUILD'
set -Eeuo pipefail
umask 022
cd "$BUILD_DIR"
HOST=$(./depends/config.guess)
make -C depends -j2 HOST="$HOST" CC=gcc-10 CXX=g++-10 NO_QT=1 NO_WALLET=1 NO_ZMQ=1 NO_UPNP=1 NO_NATPMP=1 NO_USDT=1
./autogen.sh
CONFIG_SITE="$PWD/depends/$HOST/share/config.site" ./configure CC=gcc-10 CXX=g++-10 CXXFLAGS='-O2 -g0' --without-gui --disable-wallet --disable-tests --disable-bench --disable-fuzz-binary --disable-zmq --disable-man
make -j2
BUILD
DAEMON="$WORK/source/src/nitod"
CLI="$WORK/source/src/nito-cli"
`;
}
