import { getRequestConfig } from "next-intl/server";

import { resolveLocale } from "@/lib/locale";
import { namespaces } from "@/messages/namespaces";

export default getRequestConfig(async () => {
  const locale = resolveLocale();

  const entries = await Promise.all(
    namespaces.map(async (namespace) => {
      const messagesModule = await import(`../messages/${locale}/${namespace}.json`);
      return [namespace, messagesModule.default] as const;
    })
  );

  return {
    locale,
    messages: entries.reduce<Record<string, unknown>>((acc, [namespace, messages]) => {
      acc[namespace] = messages;
      return acc;
    }, {}),
  };
});
