import { cookies, headers } from "next/headers";

import { defaultLocale, isLocale, type AppLocale } from "@/i18n/routing";

const COOKIE_NAME = "locale";

function fromAcceptLanguage(header: string | null): AppLocale | null {
  if (!header) return null;

  const languages = header
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean) as string[];

  for (const lang of languages) {
    if (lang.startsWith("pt")) {
      return "pt-BR";
    }
    if (lang.startsWith("en")) {
      return "en";
    }
  }

  return null;
}

export function resolveLocale(): AppLocale {
  const cookieLocale = cookies().get(COOKIE_NAME)?.value;
  if (cookieLocale && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const headerLocale = fromAcceptLanguage(headers().get("accept-language"));
  if (headerLocale) {
    return headerLocale;
  }

  return defaultLocale;
}

export { COOKIE_NAME };
