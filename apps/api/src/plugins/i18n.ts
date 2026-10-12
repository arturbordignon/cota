import fp from 'fastify-plugin';
import { buildI18n } from '@cota/i18n';

declare module 'fastify' {
  interface FastifyInstance {
    i18nReady: boolean;
  }
}

export default fp(async (app) => {
  const i18n = await buildI18n();
  app.decorate('i18n', i18n);
  app.decorate('i18nReady', true);
});
