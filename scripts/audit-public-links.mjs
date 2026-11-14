import { mkdir, writeFile } from "node:fs/promises";
import { links } from "../.cache/data.mjs";

const results = [];
for (const [name, url] of Object.entries(links)) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    results.push({
      name,
      url,
      status: response.status,
      finalUrl: response.url,
    });
  } catch (error) {
    results.push({ name, url, error: error.message });
  }
}
const origin = process.env.AUDIT_ORIGIN ?? "https://nito.network";
for (const path of [
  "/fr/",
  "/audit-nonexistent-20261114/",
  "/build.json",
  "/media/nito-ledger-world-960.avif",
]) {
  try {
    const response = await fetch(origin + path, {
      headers: { "accept-encoding": "gzip" },
      signal: AbortSignal.timeout(15000),
    });
    const names = [
      "content-security-policy",
      "strict-transport-security",
      "x-frame-options",
      "x-content-type-options",
      "referrer-policy",
      "permissions-policy",
      "x-robots-tag",
      "cache-control",
      "content-encoding",
      "server",
    ];
    results.push({
      name: "staging",
      path,
      status: response.status,
      headers: Object.fromEntries(
        names.map((name) => [name, response.headers.get(name)]),
      ),
    });
    await response.body?.cancel();
  } catch (error) {
    results.push({ name: "staging", path, error: error.message });
  }
}
await mkdir(".cache/audit/public", { recursive: true });
await writeFile(
  ".cache/audit/public/report.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
