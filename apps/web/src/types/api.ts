export type ProposalStatus = 'DRAFT' | 'PENDING' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface ProposalClientSummary {
  id: string;
  name: string;
  companyName?: string | null;
}

export interface ProposalTemplateSummary {
  id: string;
  name: string;
}

export interface ProposalSummary {
  id: string;
  status: ProposalStatus;
  createdAt: string;
  sentAt?: string | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  client?: ProposalClientSummary | null;
  template?: ProposalTemplateSummary | null;
  title?: string | null;
  locale?: string;
}

export interface ProposalsResponse {
  data: ProposalSummary[];
}

export interface TemplateSummary {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  locale: string;
  accountId?: string | null;
  createdAt: string;
}

export interface TemplatesResponse {
  data: TemplateSummary[];
  cached?: boolean;
}

export interface BillingOverviewResponse {
  data: {
    usage: {
      used: number;
      total: number | null;
    };
    plan: {
      isUnlimited: boolean;
      proposalsPerMonth: number | null;
    } | null;
  };
}

export interface EquipmentSummary {
  id: string;
  name: string;
  capacityTons?: number | null;
  dailyRate?: string | null;
  specsJson?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentResponse {
  data: EquipmentSummary[];
}

export interface ProspectSummary {
  id: string;
  name: string;
  segment?: string | null;
  region?: string | null;
  city?: string | null;
  state?: string | null;
  opportunity?: string | null;
  email?: string | null;
  phone?: string | null;
  notesJson?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProspectsResponse {
  data: ProspectSummary[];
}

export interface PipelineLeadSummary {
  id: string;
  companyName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  estimatedValue?: string | null;
  notes?: string | null;
  metadataJson?: Record<string, unknown> | null;
  prospect?: ProspectSummary | null;
  proposals?: Array<{
    id: string;
    title: string | null;
    status: string;
    totalsJson: Record<string, unknown> | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStageSummary {
  id: string;
  name: string;
  color: string;
  position: number;
  leads: PipelineLeadSummary[];
}

export interface PipelineStagesResponse {
  data: PipelineStageSummary[];
}

export interface DepartmentPermission {
  view: boolean;
  edit: boolean;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  description?: string | null;
  permissionPreset?: string | null;
  permissions: Record<string, DepartmentPermission>;
}

export interface TeamMemberSummary {
  id: string;
  email: string;
  role: string;
  fullName?: string | null;
  jobTitle?: string | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  isActive: boolean;
  createdAt: string;
}

export interface TeamOverviewResponse {
  data: {
    departments: DepartmentSummary[];
    members: TeamMemberSummary[];
  };
}

export interface AuditEventEntry {
  id: string;
  actor: string;
  actorEmail: string | null;
  event: string;
  category: string;
  summary: string;
  summaryKey?: string | null;
  summaryParams?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | PrismaJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface AuditEventsResponse {
  data: AuditEventEntry[];
}

type PrismaJsonValue =
  | string
  | number
  | boolean
  | null
  | PrismaJsonValue[]
  | { [key: string]: PrismaJsonValue };

export type ReportsOverviewResponse = {
  range: { start: string; end: string };
  kpis: {
    receitaAceita: number;
    taxaConversao: number; // %
    ticketMedioAceitas: number;
    propostasAbertas14dMais: number;
  };
  proposalsByStatus: Record<string, number>;
  topClients: Array<{ client: string; value: number }>;
  propostasPorMembro: Array<{ createdById: string | null; total: number; aceitas: number }>;
  receitaPorCidade: Array<{ city: string; value: number }>;
  recentProposals: Array<{
    id: string;
    title: string | null;
    status: string;
    client: string | null;
    createdAt: string;
  }>;
  pipelineSummary: Array<{ stageId: string; name: string; leadCount: number; totalValue: number }>;
};
