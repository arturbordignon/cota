import { prisma } from '@cota/db';

// The suite runs against the docker compose database, so every account it
// registers would stay there (and show up in Adminer). After the run, accounts
// owned by a test address are removed, proposals first, as the account deletion
// route does. The demo account (@cota.local) is never touched.
const DOMINIOS_DE_TESTE = ['@teste.local', '@test.local'];

export async function teardown() {
  const contas = await prisma.account.findMany({
    where: {
      users: { some: { role: 'OWNER', OR: DOMINIOS_DE_TESTE.map((dominio) => ({ email: { endsWith: dominio } })) } },
    },
    select: { id: true },
  });
  const ids = contas.map((conta) => conta.id);
  if (ids.length > 0) {
    await prisma.$transaction([
      prisma.proposal.deleteMany({ where: { accountId: { in: ids } } }),
      prisma.account.deleteMany({ where: { id: { in: ids } } }),
    ]);
  }
  await prisma.$disconnect();
}
