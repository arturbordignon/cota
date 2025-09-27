import type { FastifyRequest } from 'fastify';

export function resolveLocale(request: FastifyRequest) {
  const header = request.headers['x-locale'] ?? request.headers['accept-language'];
  const locale = Array.isArray(header) ? header[0] : header?.split(',')[0];
  if (!locale) {
    return 'pt-BR';
  }
  if (locale.startsWith('pt')) {
    return 'pt-BR';
  }
  return 'en';
}
