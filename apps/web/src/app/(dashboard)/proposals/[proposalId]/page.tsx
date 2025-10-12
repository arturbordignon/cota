import { ProposalDetailView } from "@/components/proposals/proposal-detail-view";

interface ProposalDetailPageProps {
  params: { proposalId: string };
}

export default function ProposalDetailPage({ params }: ProposalDetailPageProps) {
  return <ProposalDetailView proposalId={params.proposalId} />;
}
