import path from 'node:path';
import { fileURLToPath } from 'node:url';
import i18next, { i18n } from 'i18next';
import Backend from 'i18next-fs-backend';

let cachedInstance: i18n | null = null;

const dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildI18n(): Promise<i18n> {
  if (cachedInstance) {
    return cachedInstance;
  }

  await i18next
    .use(Backend)
    .init({
      fallbackLng: 'pt-BR',
      preload: ['en', 'pt-BR'],
      initImmediate: false,
      backend: {
        loadPath: path.join(dirname, '../locales/{{lng}}/{{ns}}.json')
      },
      interpolation: {
        escapeValue: false
      },
      ns: ['common'],
      defaultNS: 'common'
    });

  cachedInstance = i18next;
  return i18next;
}

export type { i18n } from 'i18next';
