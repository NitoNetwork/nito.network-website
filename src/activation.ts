import { ACTIVATION_HEIGHT } from "./data";

export const ACTIVATION_REFRESH_MS = 60_000;
export const ACTIVATION_STALE_SECONDS = 180;
export type ActivationSnapshot = {
  schema: 1;
  activationHeight: number;
  height: number;
  bestBlockHash: string;
  blockTime: number;
  observedAt: number;
  remaining: number;
  windowBlocks: number;
  secondsPerBlock: number | null;
  confirmed: boolean;
};
export type ActivationState =
  "scheduled" | "stale" | "slow" | "reached" | "active";

export function parseActivation(
  value: unknown,
  now = Date.now() / 1000,
): ActivationSnapshot {
  if (!value || typeof value !== "object")
    throw new Error("Invalid activation snapshot");
  const s = value as ActivationSnapshot;
  const integers = [
    s.height,
    s.blockTime,
    s.observedAt,
    s.remaining,
    s.windowBlocks,
  ];
  if (
    s.schema !== 1 ||
    s.activationHeight !== ACTIVATION_HEIGHT ||
    !integers.every((n) => Number.isSafeInteger(n) && n >= 0) ||
    s.height < 1 ||
    s.blockTime < 1 ||
    s.observedAt < 1 ||
    s.observedAt > now + 120 ||
    s.blockTime > s.observedAt + 7200 ||
    s.remaining !== Math.max(0, s.activationHeight - s.height) ||
    s.windowBlocks !== 1440 ||
    typeof s.bestBlockHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(s.bestBlockHash) ||
    typeof s.confirmed !== "boolean" ||
    (s.confirmed && s.remaining !== 0) ||
    (s.secondsPerBlock !== null &&
      (typeof s.secondsPerBlock !== "number" ||
        !Number.isFinite(s.secondsPerBlock) ||
        s.secondsPerBlock < 5 ||
        s.secondsPerBlock > 3600))
  )
    throw new Error("Invalid activation snapshot");
  return s;
}

export function activationState(
  s: ActivationSnapshot,
  now = Date.now() / 1000,
): ActivationState {
  if (now - s.observedAt > ACTIVATION_STALE_SECONDS) return "stale";
  if (s.confirmed) return "active";
  if (s.remaining === 0) return "reached";
  if (now - s.blockTime > 3600 || s.blockTime > now + 120) return "slow";
  return "scheduled";
}

export function estimateSeconds(
  s: ActivationSnapshot,
  now = Date.now() / 1000,
): number | null {
  if (activationState(s, now) !== "scheduled" || s.secondsPerBlock === null)
    return null;
  return Math.ceil(s.remaining * s.secondsPerBlock);
}
