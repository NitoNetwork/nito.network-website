export const ACTIVATION_HEIGHT = 1_165_432;
export const HALVING_HEIGHT = 1_042_400;
export const MAX_SUPPLY = "1,284,565,890";
export const locales = ["en", "fr", "de", "es", "nl", "ru", "cn"] as const;
export type Locale = (typeof locales)[number];
export const languageNames: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  nl: "Nederlands",
  ru: "Русский",
  cn: "中文",
};
export const languageTags: Record<Locale, string> = {
  en: "en",
  fr: "fr",
  de: "de",
  es: "es",
  nl: "nl",
  ru: "ru",
  cn: "zh-Hans",
};
export const pages = [
  "home",
  "wallets",
  "network",
  "participate",
  "resources",
  "easynode",
  "whitepaper",
] as const;
export type Page = (typeof pages)[number];
export const links = {
  core: "https://github.com/NitoNetwork/Nito-core/releases",
  coreLatest: "https://github.com/NitoNetwork/Nito-core/releases/latest",
  mobile: "https://github.com/NitoNetwork/nito-wallet-mobile/releases/latest",
  webwallet: "https://wallet.nito.network/",
  mempool: "https://mempool-explorer.nito.network/",
  explorer: "https://explorer.nito.network/",
  mining: "https://miningpoolstats.stream/nitocoin",
  github: "https://github.com/orgs/NitoNetwork/repositories",
  whitepaper: "https://nitonetwork.github.io/Nito-Whitepaper/",
  market: "https://coinpaprika.com/coin/nito-nito-coin/",
  discord: "https://discord.gg/wBcfKE8nPy",
  telegram: "https://t.me/Nito_Network",
  x: "https://x.com/Nito_Network",
} as const;
export const nodeSystems = [
  {
    id: "ubuntu-24.04",
    family: "ubuntu",
    version: "24.04",
    label: "Ubuntu 24.04",
  },
  {
    id: "ubuntu-22.04",
    family: "ubuntu",
    version: "22.04",
    label: "Ubuntu 22.04",
  },
  {
    id: "ubuntu-20.04",
    family: "ubuntu",
    version: "20.04",
    label: "Ubuntu 20.04",
  },
  { id: "debian-13", family: "debian", version: "13", label: "Debian 13" },
  { id: "debian-12", family: "debian", version: "12", label: "Debian 12" },
] as const;
export const rewards = [
  { year: 1, end: 1, reward: 512, block: 0, last: 529999 },
  { year: 2, end: 2, reward: 256, block: 530000, last: 1042399 },
  { year: 3, end: 3, reward: 128, block: 1042400, last: 1576799 },
  { year: 4, end: 10, reward: 64, block: 1576800, last: 5255999 },
  { year: 11, end: 20, reward: 32, block: 5256000, last: 10511999 },
  { year: 21, end: 50, reward: 16, block: 10512000, last: 26279999 },
  { year: 51, end: 200, reward: 2, block: 26280000, last: 105120000 },
] as const;
export function pageUrl(locale: Locale, page: Page = "home") {
  return `/${locale}/${page === "home" ? "" : page + "/"}`;
}
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const key = language.toLowerCase().split("-")[0];
    if (key === "zh") return "cn";
    if (locales.includes(key as Locale)) return key as Locale;
  }
  return "en";
}
export function route(path: string): {
  locale: Locale;
  page: Page;
  valid: boolean;
} {
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "tools")
    return {
      locale: "en",
      page: "easynode",
      valid: parts.length === 2 && parts[1] === "easynode",
    };
  const locale = locales.includes(parts[0] as Locale)
    ? (parts[0] as Locale)
    : "en";
  const aliases: Record<string, Page> = {
    downloads: "wallets",
    mobile: "wallets",
    mining: "participate",
  };
  const page = (aliases[parts[1]] ?? parts[1] ?? "home") as Page;
  return {
    locale,
    page,
    valid:
      (parts.length === 0 || locales.includes(parts[0] as Locale)) &&
      pages.includes(page) &&
      parts.length <= 2,
  };
}
