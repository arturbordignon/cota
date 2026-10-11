import type { AbstractIntlMessages } from 'next-intl';

import { enMessages } from './en';
import { ptBRMessages } from './pt-BR';

export type SupportedLocale = 'en' | 'pt-BR';

export const locales: Record<SupportedLocale, AbstractIntlMessages> = {
  en: enMessages as unknown as AbstractIntlMessages,
  'pt-BR': ptBRMessages as unknown as AbstractIntlMessages,
};

export type LocaleMessages = AbstractIntlMessages;
