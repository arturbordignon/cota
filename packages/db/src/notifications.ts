import type { NotificationTone, PrismaClient } from '@prisma/client';

export type ProposalNotificationKey =
  | 'proposalViewed'
  | 'proposalAccepted'
  | 'proposalDeclined'
  | 'proposalPdfReady';

export type NotificationKey = ProposalNotificationKey | 'inviteAccepted';

type NotificationInput = {
  accountId: string;
  recipientIds: string[];
  key: NotificationKey;
  params: Record<string, string>;
  tone: NotificationTone;
  /** Page the notification opens, e.g. /proposals/<slug>. */
  link?: string;
  /** Plain-text fallback for clients that don't translate the key. */
  title: string;
  body: string;
};

const TONS: Record<ProposalNotificationKey, NotificationTone> = {
  proposalViewed: 'INFO',
  proposalAccepted: 'SUCCESS',
  proposalDeclined: 'WARNING',
  proposalPdfReady: 'INFO',
};

const TEXTOS: Record<ProposalNotificationKey, { title: string; body: (titulo: string) => string }> = {
  proposalViewed: { title: 'Proposta visualizada', body: (titulo) => `O cliente abriu a proposta ${titulo}.` },
  proposalAccepted: { title: 'Proposta aceita', body: (titulo) => `O cliente aceitou a proposta ${titulo}.` },
  proposalDeclined: { title: 'Proposta recusada', body: (titulo) => `O cliente recusou a proposta ${titulo}.` },
  proposalPdfReady: { title: 'PDF pronto', body: (titulo) => `O PDF da proposta ${titulo} está pronto para download.` },
};

// One row per person, so each of them reads or clears it on their own.
export async function criarNotificacoes(prisma: PrismaClient, entrada: NotificationInput) {
  const destinatarios = Array.from(new Set(entrada.recipientIds));
  if (destinatarios.length === 0) {
    return;
  }
  await prisma.notification.createMany({
    data: destinatarios.map((recipientId) => ({
      accountId: entrada.accountId,
      recipientId,
      title: entrada.title,
      body: entrada.body,
      tone: entrada.tone,
      metadataJson: { key: entrada.key, params: entrada.params, link: entrada.link ?? null },
    })),
  });
}

// Proposal news goes to whoever wrote the proposal and to the account owners.
export async function notificarProposta(prisma: PrismaClient, proposalId: string, key: ProposalNotificationKey) {
  const proposta = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: { id: true, accountId: true, title: true, publicSlug: true, createdById: true },
  });
  if (!proposta) {
    return;
  }

  const donos = await prisma.user.findMany({
    where: { accountId: proposta.accountId, role: 'OWNER', isActive: true },
    select: { id: true },
  });

  const titulo = proposta.title ?? '';
  await criarNotificacoes(prisma, {
    accountId: proposta.accountId,
    recipientIds: [proposta.createdById, ...donos.map((dono) => dono.id)],
    key,
    params: { proposal: titulo },
    tone: TONS[key],
    link: `/proposals/${proposta.publicSlug ?? proposta.id}`,
    title: TEXTOS[key].title,
    body: TEXTOS[key].body(titulo),
  });
}
