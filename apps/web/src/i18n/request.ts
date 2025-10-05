import { getRequestConfig } from "next-intl/server";

import { resolveLocale } from "@/lib/locale";
import { locales, type SupportedLocale } from "@/messages/locales";

export default getRequestConfig(async () => {
  const locale = resolveLocale();

  return {
    locale,
    messages:
      locales[(locale as SupportedLocale) in locales ? (locale as SupportedLocale) : 'en'],
  };
});
