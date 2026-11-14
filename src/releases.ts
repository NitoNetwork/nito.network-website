export interface Asset {
  name: string;
  url: string;
  size: number;
  digest: string | null;
}
export interface Release {
  tag: string;
  url: string;
  published: string;
  checked: string;
  assets: Asset[];
}
export type Product = "core" | "mobile";
export class ReleaseUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("No release available", { cause });
    this.name = "ReleaseUnavailableError";
  }
}
const repos = {
  core: "NitoNetwork/Nito-core",
  mobile: "NitoNetwork/nito-wallet-mobile",
};
export function validateRelease(value: unknown, product: Product): Release {
  const r = value as Release;
  const prefix = `https://github.com/${repos[product]}/releases/`;
  if (
    !r ||
    typeof r.tag !== "string" ||
    r.tag.length > 64 ||
    !r.url?.startsWith(prefix) ||
    !Array.isArray(r.assets) ||
    !Number.isFinite(Date.parse(r.published))
  )
    throw new Error("Invalid release");
  return {
    ...r,
    assets: r.assets
      .filter(
        (a) =>
          typeof a.name === "string" &&
          a.url?.startsWith(prefix + "download/") &&
          Number.isFinite(a.size),
      )
      .map((a) => ({
        ...a,
        digest: /^sha256:[a-f0-9]{64}$/i.test(a.digest ?? "") ? a.digest : null,
      })),
  };
}
export async function publishedRelease(
  product: Product,
): Promise<{ release: Release; fresh: boolean }> {
  const cacheKey = `nito-release-${product}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey) ?? "null");
    if (cached && Date.now() - cached.at < 600_000 && cached.at <= Date.now()) {
      return {
        release: validateRelease(cached.release, product),
        fresh: cached.fresh === true,
      };
    }
  } catch {
    /* Storage can be disabled; release checks still work. */
  }
  const remember = (result: { release: Release; fresh: boolean }) => {
    try {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ ...result, at: Date.now() }),
      );
    } catch {
      /* No persistent state is required. */
    }
    return result;
  };
  try {
    const response = await fetch(
      `https://api.github.com/repos/${repos[product]}/releases/latest`,
      { signal: AbortSignal.timeout(6500), referrerPolicy: "no-referrer" },
    );
    if (!response.ok) throw new Error("GitHub unavailable");
    const r = await response.json();
    if (r.draft || r.prerelease) throw new Error("Not a stable release");
    return remember({
      fresh: true,
      release: validateRelease(
        {
          tag: r.tag_name,
          url: r.html_url,
          published: r.published_at,
          checked: new Date().toISOString(),
          assets: r.assets.map((a: Record<string, unknown>) => ({
            name: a.name,
            url: a.browser_download_url,
            size: a.size,
            digest: a.digest,
          })),
        },
        product,
      ),
    });
  } catch {
    try {
      const response = await fetch(`/data/${product}.json`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error("No release available");
      return remember({
        fresh: false,
        release: validateRelease(await response.json(), product),
      });
    } catch (cause) {
      throw new ReleaseUnavailableError(cause);
    }
  }
}
