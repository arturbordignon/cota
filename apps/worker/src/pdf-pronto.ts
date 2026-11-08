type Registro = {
  warn: (dados: object, mensagem: string) => void;
  error: (dados: object, mensagem: string) => void;
};

type Banco = {
  proposal: {
    updateMany: (args: { where: { id: string }; data: { pdfObjectKey: string } }) => Promise<{ count: number }>;
  };
};

export type DependenciasPdfPronto = {
  prisma: Banco;
  logger: Registro;
  notificar: (proposalId: string) => Promise<unknown>;
};

// Saves the finished PDF on the proposal and tells its author. The proposal (or
// its whole account) may have been deleted while the PDF was queued, and an
// error thrown from the worker's event handler would stop it for everyone, so
// problems here are only logged.
export async function registrarPdfPronto(
  { prisma, logger, notificar }: DependenciasPdfPronto,
  job: { id?: string; proposalId: string },
  pdfObjectKey: string,
) {
  try {
    const atualizadas = await prisma.proposal.updateMany({
      where: { id: job.proposalId },
      data: { pdfObjectKey },
    });
    if (atualizadas.count === 0) {
      logger.warn({ jobId: job.id, proposalId: job.proposalId }, 'Proposal deleted before its PDF was ready');
      return false;
    }
    await notificar(job.proposalId);
    return true;
  } catch (err) {
    logger.error({ err, jobId: job.id }, 'Failed to record the finished PDF');
    return false;
  }
}
