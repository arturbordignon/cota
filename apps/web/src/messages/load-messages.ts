import { namespaces } from "@/messages/namespaces";

export async function loadMessages(locale: string) {
  const entries = await Promise.all(
    namespaces.map(async (namespace) => {
      const messagesModule = await import(`@/messages/${locale}/${namespace}.json`);
      return [namespace, messagesModule.default] as const;
    })
  );

  return entries.reduce<Record<string, unknown>>((acc, [namespace, messages]) => {
    acc[namespace] = messages;
    return acc;
  }, {});
}
