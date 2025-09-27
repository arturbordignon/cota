import { PrismaClient } from '@prisma/client';
import env from '@crane/config';
const prisma = new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});
export { prisma };
export * from '@prisma/client';
