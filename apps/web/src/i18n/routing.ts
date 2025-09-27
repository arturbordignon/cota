export const locales = ["pt-BR", "en"] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = "pt-BR";

export const localeLabels: Record<AppLocale, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
};

export function isLocale(value: string): value is AppLocale {
  return locales.includes(value as AppLocale);
}
