import { buscarTamanhoDoObjeto, lerInicioDoObjeto } from '@cota/storage';

export const EXTENSOES_DE_FOTO = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const;

export type TipoDeFoto = keyof typeof EXTENSOES_DE_FOTO;

export const TIPOS_DE_FOTO = Object.keys(EXTENSOES_DE_FOTO) as [TipoDeFoto, ...TipoDeFoto[]];

export const TAMANHO_MAXIMO_FOTO = 5 * 1024 * 1024;

export function montarPrefixoFotos(accountId: string, proposalId: string) {
  return `accounts/${accountId}/proposals/${proposalId}/photos/`;
}

// Only keys handed out by /assets/upload-url for this exact proposal are accepted.
export function chaveDeFotoValida(chave: string, accountId: string, proposalId: string) {
  const prefixo = montarPrefixoFotos(accountId, proposalId);
  if (!chave.startsWith(prefixo)) {
    return false;
  }
  return /^[a-z0-9]{12}(\.(png|jpg|webp))?$/.test(chave.slice(prefixo.length));
}

// Identifies the image by its first bytes, never by the name or the type the
// browser claimed.
export function detectarTipoDeImagem(bytes: Uint8Array): TipoDeFoto | null {
  const comeca = (assinatura: number[], deslocamento = 0) =>
    assinatura.every((byte, indice) => bytes[deslocamento + indice] === byte);

  if (comeca([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (comeca([0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (comeca([0x52, 0x49, 0x46, 0x46]) && comeca([0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp';
  }
  return null;
}

export async function verificarFotoEnviada(chave: string): Promise<TipoDeFoto | null> {
  const tamanho = await buscarTamanhoDoObjeto(chave);
  if (!tamanho || tamanho > TAMANHO_MAXIMO_FOTO) {
    return null;
  }
  const inicio = await lerInicioDoObjeto(chave, 12);
  if (!inicio) {
    return null;
  }
  return detectarTipoDeImagem(inicio);
}
