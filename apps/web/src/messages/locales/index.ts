import { enMessages } from './en';
import { ptBRMessages } from './pt-BR';

export const locales = {
  en: enMessages,
  'pt-BR': ptBRMessages,
} as const;

export type SupportedLocale = keyof typeof locales;
export type LocaleMessages = (typeof locales)[SupportedLocale];
