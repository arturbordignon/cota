import { ProposalDetailView } from "@/components/proposals/proposal-detail-view";

interface ProposalDetailPageProps {
  params: Promise<{ proposalId: string }>;
}

export default async function ProposalDetailPage({ params }: ProposalDetailPageProps) {
  const { proposalId } = await params;
  return <ProposalDetailView proposalId={proposalId} />;
}
