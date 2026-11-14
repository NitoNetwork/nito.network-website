import { en, type Copy } from "./en";
import { fr } from "./fr";
import { de } from "./de";
import { es } from "./es";
import { nl } from "./nl";
import { ru } from "./ru";
import { cn } from "./cn";
import type { Locale } from "../data";
export const translations: Record<Locale, Copy> = {
  en,
  fr,
  de,
  es,
  nl,
  ru,
  cn,
};
export function getCopy(locale: Locale): Copy {
  return translations[locale];
}
