import type { PublicProposalResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333/api/v1";

async function lerResposta<T>(response: Response): Promise<T> {
  const dados = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((dados as { message?: string }).message || `Request failed with status ${response.status}`);
  }
  return dados as T;
}

export function buscarPropostaPublica(slug: string) {
  return fetch(`${API_BASE_URL}/public/proposals/${encodeURIComponent(slug)}`).then((response) =>
    lerResposta<PublicProposalResponse>(response),
  );
}

export function responderPropostaPublica(slug: string, resposta: "accept" | "decline") {
  return fetch(`${API_BASE_URL}/public/proposals/${encodeURIComponent(slug)}/${resposta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }).then((response) => lerResposta<{ data: { status: string } }>(response));
}
