import { writeFile, readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repos = {
  core: "NitoNetwork/Nito-core",
  mobile: "NitoNetwork/nito-wallet-mobile",
};
export async function refresh() {
  await mkdir("public/data", { recursive: true });
  for (const [name, repo] of Object.entries(repos)) {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repo}/releases/latest`,
        {
          headers: { Accept: "application/vnd.github+json" },
          signal: AbortSignal.timeout(12000),
        },
      );
      if (!response.ok) throw new Error(`GitHub ${response.status}`);
      const release = await response.json();
      if (
        release.draft ||
        release.prerelease ||
        typeof release.tag_name !== "string"
      )
        throw new Error("Invalid stable release");
      const clean = {
        tag: release.tag_name,
        url: release.html_url,
        published: release.published_at,
        checked: new Date().toISOString(),
        assets: release.assets.map((a) => ({
          name: a.name,
          url: a.browser_download_url,
          size: a.size,
          digest: a.digest ?? null,
        })),
      };
      await writeFile(
        `public/data/${name}.json`,
        JSON.stringify(clean, null, 2) + "\n",
      );
      console.log(`${name}: ${clean.tag}`);
    } catch (error) {
      await readFile(`public/data/${name}.json`);
      console.warn(
        `${name}: preserving the last verified release (${error.message})`,
      );
    }
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await refresh();
