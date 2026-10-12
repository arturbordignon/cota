import { PrismaClient } from '@prisma/client';
import env from '@cota/config';

const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

export { prisma };
export * from '@prisma/client';
export default prisma;
