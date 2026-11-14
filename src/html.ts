export function escape(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function icon(name: string, className = ""): string {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}
export function interpolate(
  text: string,
  values: Record<string, string | number>,
): string {
  return text.replace(/\{(\w+)\}/g, (_, key) =>
    String(values[key] ?? `{${key}}`),
  );
}
export function anchor(
  href: string,
  label: string,
  cls = "text-link",
  symbol = "arrow-up-right",
): string {
  const external = href.startsWith("https://") || href.includes("/whitepaper/");
  return `<a class="${cls}" href="${escape(href)}" ${linkAttributes(href)}>${escape(label)}${icon(external ? symbol : "arrow-right")}</a>`;
}

export function linkAttributes(href: string): string {
  return /^(https?:\/\/|\/downloads\/|\/(?:en|fr|de|es|nl|ru|cn)\/whitepaper\/)/.test(
    href,
  )
    ? 'target="_blank" rel="noopener noreferrer"'
    : "";
}
