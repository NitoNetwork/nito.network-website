"""Publish one public chain snapshot. Run only from the site systemd timer."""

import argparse
import json
import math
import os
from pathlib import Path
import tempfile
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SOURCE = "https://mempool-explorer.nito.network"
WINDOW = 1440


def fetch(path):
    request = Request(SOURCE + path, headers={"User-Agent": "NitoSiteActivation/1.0"})
    with urlopen(request, timeout=8) as response:
        raw = response.read(256_001)
        if len(raw) > 256_000:
            raise ValueError("Oversized explorer response")
        return json.loads(raw)


def integer(value, minimum=0):
    return type(value) is int and minimum <= value <= 2**53 - 1


def block(value, now):
    if not isinstance(value, dict):
        raise ValueError("Invalid block")
    if not integer(value.get("height"), 1) or not integer(value.get("timestamp"), 1):
        raise ValueError("Invalid block height/time")
    digest = value.get("id", "")
    if not isinstance(digest, str) or len(digest) != 64 or any(c not in "0123456789abcdef" for c in digest):
        raise ValueError("Invalid block hash")
    if value["timestamp"] > now + 7200 or value.get("stale", False):
        raise ValueError("Unusable block")
    return value


def collect(target, now=None, get=fetch):
    now = int(time.time()) if now is None else now
    recent = get("/api/v1/blocks")
    if not isinstance(recent, list) or not recent:
        raise ValueError("Missing chain tip")
    tip = block(recent[0], now)
    historical = get(f'/api/v1/blocks/{tip["height"] - WINDOW}')
    if not isinstance(historical, list) or not historical:
        raise ValueError("Missing estimation window")
    past = block(historical[0], now)
    if tip["height"] - past["height"] != WINDOW:
        raise ValueError("Invalid estimation window")
    rate = (tip["timestamp"] - past["timestamp"]) / WINDOW
    rate = round(rate, 3) if math.isfinite(rate) and 5 <= rate <= 3600 else None
    remaining = max(0, target - tip["height"])
    confirmed = False
    # V3 explorers do not expose this endpoint. Height alone is not confirmation.
    if remaining == 0:
        try:
            pools = get("/api/v1/nito/pools")
            confirmed = (
                isinstance(pools, dict)
                and pools.get("chain") == "main"
                and pools.get("status") == "confirmed"
                and pools.get("source") == "core"
                and pools.get("privateTxActivationHeight") == target
                and pools.get("activated") is True
                and pools.get("blocks") == tip["height"]
                and pools.get("bestblockhash") == tip["id"]
            )
        except HTTPError as error:
            error.close()
        except (OSError, ValueError):
            pass
    return {
        "schema": 1,
        "activationHeight": target,
        "height": tip["height"],
        "bestBlockHash": tip["id"],
        "blockTime": tip["timestamp"],
        "observedAt": now,
        "remaining": remaining,
        "windowBlocks": WINDOW,
        "secondsPerBlock": rate,
        "confirmed": confirmed,
    }


def publish(snapshot, destination):
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", dir=destination.parent, delete=False) as stream:
            temporary = stream.name
            json.dump(snapshot, stream, separators=(",", ":"), allow_nan=False)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, destination)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text())
    target = config.get("activationHeight")
    if not integer(target, 1):
        raise ValueError("Invalid activation configuration")
    # A failed collection never overwrites the last valid snapshot.
    publish(collect(target), args.output)


if __name__ == "__main__":
    main()
