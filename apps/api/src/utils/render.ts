import mustache from 'mustache';

export function renderProposalHtml(template: string, data: Record<string, unknown>) {
  return mustache.render(template, data, undefined, {
    escape: (text: string) => text
  });
}
