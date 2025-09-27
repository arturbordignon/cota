import { getRequestConfig } from "next-intl/server";

import { resolveLocale } from "@/lib/locale";

export default getRequestConfig(async () => {
  const locale = resolveLocale();

  return {
    locale,
    messages: (await import(`../messages/${locale}/common.json`)).default,
  };
});
