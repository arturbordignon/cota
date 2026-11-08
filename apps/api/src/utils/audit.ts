import type { FastifyInstance, FastifyBaseLogger } from 'fastify';
import type { Prisma } from '@cota/db';

type Evento = {
  accountId: string;
  /** Who did it; null when the proposal's client answered from the public link. */
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  /** Text kept for search and for readers that don't translate. */
  summary: string;
  /** Key under activity.entries in the web app, with its values. */
  summaryKey: string;
  summaryParams: Record<string, string>;
  metadata?: Prisma.JsonObject;
};

// The activity log is a record, not part of the action: a failure to write it
// is logged and never undoes what the user just did.
export async function registrarEvento(app: FastifyInstance, log: FastifyBaseLogger, evento: Evento) {
  try {
    await app.prisma.auditEvent.create({
      data: {
        accountId: evento.accountId,
        userId: evento.userId,
        action: evento.action,
        entityType: evento.entityType,
        entityId: evento.entityId,
        summary: evento.summary,
        metadataJson: {
          ...evento.metadata,
          summaryKey: evento.summaryKey,
          summaryParams: evento.summaryParams,
        },
      },
    });
  } catch (err) {
    log.error({ err, action: evento.action }, 'Failed to write the audit event');
  }
}
