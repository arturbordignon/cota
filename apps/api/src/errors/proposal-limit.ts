export class ProposalLimitError extends Error {
  constructor(message = 'Limite de propostas atingido.') {
    super(message);
    this.name = 'ProposalLimitError';
  }
}
