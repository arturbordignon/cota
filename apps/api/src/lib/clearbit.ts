import { fetch } from 'undici';

const CLEARBIT_AUTOCOMPLETE_URL = 'https://autocomplete.clearbit.com/v1/companies/suggest';

export interface ClearbitSuggestion {
  name: string;
  domain?: string | null;
  logo?: string | null;
}

export async function fetchClearbitSuggestions(query: string): Promise<ClearbitSuggestion[]> {
  const url = new URL(CLEARBIT_AUTOCOMPLETE_URL);
  url.searchParams.set('query', query);

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      body ? `Clearbit request failed with status ${response.status}: ${body}` : `Clearbit request failed with status ${response.status}`,
    );
  }

  const data = (await response.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error('Unexpected response format from Clearbit autocomplete API.');
  }

  return data.map((entry) => {
    const item = entry as Partial<ClearbitSuggestion>;
    return {
      name: typeof item.name === 'string' ? item.name : 'Empresa desconhecida',
      domain: typeof item.domain === 'string' ? item.domain : null,
      logo: typeof item.logo === 'string' ? item.logo : null,
    } satisfies ClearbitSuggestion;
  });
}
