export interface AuditLogEntry {
  id: string;
  actor: string;
  actorEmail: string;
  event: string;
  summary: string;
  summaryKey?: string;
  summaryParams?: Record<string, string | number>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-1',
    actor: 'Ana Souza',
    actorEmail: 'ana.souza@servicepro.io',
    event: 'proposal.accepted',
    summary: 'Proposta #2418 aceita por Atlas Engenharia',
    summaryKey: 'proposalAccepted',
    summaryParams: {
      proposal: '#2418',
      client: 'Atlas Engenharia',
    },
    ipAddress: '201.42.18.11',
    userAgent: 'Chrome 124 / macOS',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    metadata: {
      proposalId: 'prop-2418',
      amount: 45200,
      client: 'Atlas Engenharia',
    },
  },
  {
    id: 'audit-2',
    actor: 'Fernanda Alves',
    actorEmail: 'fernanda@empresa.com',
    event: 'department.updated',
    summary: 'Departamento Operações alterou permissões de CRM',
    summaryKey: 'departmentUpdated',
    summaryParams: {
      department: 'Operações',
      module: 'CRM',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    metadata: {
      departmentId: 'dept-operations',
      module: 'crm',
      edit: true,
    },
  },
  {
    id: 'audit-3',
    actor: 'Marcos Dias',
    actorEmail: 'marcos@empresa.com',
    event: 'user.invited',
    summary: 'Convidou Joana Prado para o departamento Comercial',
    summaryKey: 'userInvited',
    summaryParams: {
      invitee: 'Joana Prado',
      department: 'Comercial',
    },
    ipAddress: '189.90.13.54',
    userAgent: 'Safari 17 / iOS',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    metadata: {
      inviteeEmail: 'joana@empresa.com',
      inviteeName: 'Joana Prado',
      departmentId: 'dept-commercial',
    },
  },
  {
    id: 'audit-4',
    actor: 'Ana Souza',
    actorEmail: 'ana.souza@servicepro.io',
    event: 'billing.plan.changed',
    summary: 'Plano atualizado de Growth para Enterprise',
    summaryKey: 'planChanged',
    summaryParams: {
      from: 'Growth',
      to: 'Enterprise',
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    metadata: {
      previousPlan: 'Growth',
      newPlan: 'Enterprise',
    },
  },
  {
    id: 'audit-5',
    actor: 'Sistema',
    actorEmail: 'no-reply@servicepro.io',
    event: 'notifications.dispatch',
    summary: 'Resumo diário enviado para 5 membros',
    summaryKey: 'notificationsDispatch',
    summaryParams: {
      recipients: 5,
    },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    metadata: {
      recipients: 5,
      channel: 'email',
    },
  },
];
