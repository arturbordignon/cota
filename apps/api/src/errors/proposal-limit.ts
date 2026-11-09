export type ProposalLimitCode = 'PROPOSAL_LIMIT_REACHED' | 'TRIAL_ENDED';

// Thrown when the account can't create another proposal: the monthly allowance
// is used up, or the free trial is over. The route turns it into a 402.
export class ProposalLimitError extends Error {
  constructor(
    readonly code: ProposalLimitCode,
    readonly limit: number | null,
  ) {
    super(code === 'TRIAL_ENDED' ? 'Free trial ended.' : 'Proposal limit reached.');
    this.name = 'ProposalLimitError';
  }
}
