import { locales, type SupportedLocale } from "@/messages/locales";

export async function loadMessages(locale: string) {
  const key = (locale as SupportedLocale) in locales ? (locale as SupportedLocale) : 'en';
  return locales[key];
}
