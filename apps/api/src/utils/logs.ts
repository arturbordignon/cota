import type { FastifyRequest } from 'fastify';

const PARAMETROS_SECRETOS = /([?&](?:token|refreshToken|accessToken|password|code)=)[^&#]*/gi;

// Invite links carry their token in the query string; request logs must never
// keep it, or anyone with log access could accept the invite.
export function ocultarSegredosDaUrl(url: string) {
  return url.replace(PARAMETROS_SECRETOS, '$1[redacted]');
}

export function serializarPedido(request: FastifyRequest) {
  return {
    method: request.method,
    url: ocultarSegredosDaUrl(request.url),
    hostname: request.hostname,
    remoteAddress: request.ip,
  };
}

export function criarOpcoesDeLog(level: string) {
  return {
    level,
    serializers: { req: serializarPedido },
    redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["stripe-signature"]'],
  };
}
