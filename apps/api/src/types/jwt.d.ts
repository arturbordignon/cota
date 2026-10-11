import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string;
      accountId: string;
      role: string;
      tipo?: 'refresh';
    };
    user: {
      sub: string;
      accountId: string;
      role: string;
    };
  }
}
