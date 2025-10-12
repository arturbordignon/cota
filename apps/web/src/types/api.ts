export type ProposalStatus = 'DRAFT' | 'PENDING' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface ProposalClientSummary {
  id: string;
  name: string;
  companyName?: string | null;
}

export interface ProposalClientDetail extends ProposalClientSummary {
  email?: string | null;
  phone?: string | null;
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
  viewedAt?: string | null;
  acceptedAt?: string | null;
  declinedAt?: string | null;
  client?: ProposalClientSummary | null;
  template?: ProposalTemplateSummary | null;
  title?: string | null;
  locale?: string;
  publicSlug?: string | null;
}

export interface ProposalAssetSummary {
  id: string;
  s3ObjectKey: string;
  mimeType: string;
  position: number;
}

export interface ProposalDetail extends ProposalSummary {
  updatedAt?: string;
  expiresAt?: string | null;
  pdfObjectKey?: string | null;
  webObjectKey?: string | null;
  payloadJson?: Record<string, unknown> | null;
  totalsJson?: Record<string, unknown> | null;
  publicSlug?: string | null;
  client?: ProposalClientDetail | null;
  template?: TemplateSummary | ProposalTemplateSummary | null;
  assets?: ProposalAssetSummary[];
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

export interface TemplateDetail extends TemplateSummary {
  accountId?: string | null;
  inputSchemaJson?: Record<string, unknown> | null;
  defaultDataJson?: Record<string, unknown> | null;
  htmlBody: string;
  pdfLayoutOptionsJson?: Record<string, unknown> | null;
}

export interface TemplateDetailResponse {
  data: TemplateDetail;
}

export interface CreateProposalResponse {
  data: ProposalDetail;
  message?: string;
}

export interface ProposalDetailResponse {
  data: ProposalDetail;
}

export interface GenerateProposalResponse {
  message?: string;
  pdfObjectKey?: string;
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

export interface PipelineLeadSummary {
  id: string;
  companyName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  estimatedValue?: string | null;
  notes?: string | null;
  metadataJson?: Record<string, unknown> | null;
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
  inviteUrl?: string | null;
  inviteTokenExpiresAt?: string | null;
  invitedAt?: string | null;
}

export interface TeamOverviewResponse {
  data: {
    departments: DepartmentSummary[];
    members: TeamMemberSummary[];
  };
}

export type TeamRankingPeriod = 'month' | 'quarter' | 'year';

export interface TeamRankingEntry {
  memberId: string;
  name: string;
  email: string | null;
  department: string | null;
  acceptedProposals: number;
  totalValue: number;
}

export interface TeamRankingResponse {
  data: {
    period: TeamRankingPeriod;
    range: { start: string; end: string };
    entries: TeamRankingEntry[];
  };
}

export interface InvitePreviewApiResponse {
  data: {
    email: string;
    fullName?: string | null;
    account: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export interface AcceptInviteApiResponse {
  data: {
    email: string;
    account: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export interface DepartmentResponse {
  data: DepartmentSummary;
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
