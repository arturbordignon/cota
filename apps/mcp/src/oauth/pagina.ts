export type IdiomaPagina = 'pt-BR' | 'en';

export type MotivoErro = 'credenciais' | 'tentativas' | 'expirado' | 'indisponivel';

const TEXTOS = {
  'pt-BR': {
    titulo: 'Conectar ao Cota',
    pedido: (app: string) => `${app} quer montar e salvar propostas na sua conta do Cota.`,
    retorno: (destino: string) => `Depois de entrar, você volta para ${destino}.`,
    conta: 'Endereço da conta',
    contaDica: 'Aparece em Minha conta, no Cota. É o mesmo do login.',
    email: 'E-mail',
    senha: 'Senha',
    entrar: 'Entrar e conectar',
    acesso: 'O assistente vê só esta conta, com as mesmas permissões que você tem no painel. Ele não apaga nada e não envia nada ao cliente sem você pedir.',
    erros: {
      credenciais: 'Conta, e-mail ou senha incorretos.',
      tentativas: 'Muitas tentativas. Espere alguns minutos e tente de novo.',
      expirado: 'Este pedido de conexão expirou. Volte ao assistente e conecte de novo.',
      indisponivel: 'O Cota não respondeu agora. Tente de novo em instantes.',
    },
  },
  en: {
    titulo: 'Connect to Cota',
    pedido: (app: string) => `${app} wants to build and save proposals in your Cota account.`,
    retorno: (destino: string) => `After you sign in, you go back to ${destino}.`,
    conta: 'Account address',
    contaDica: 'Shown under My account in Cota. It is the same one you sign in with.',
    email: 'Email',
    senha: 'Password',
    entrar: 'Sign in and connect',
    acesso: 'The assistant only sees this account, with the same permissions you have in the dashboard. It deletes nothing and sends nothing to the client unless you ask.',
    erros: {
      credenciais: 'Wrong account, email or password.',
      tentativas: 'Too many attempts. Wait a few minutes and try again.',
      expirado: 'This connection request expired. Go back to the assistant and connect again.',
      indisponivel: 'Cota did not answer right now. Try again in a moment.',
    },
  },
};

export function escolherIdioma(cabecalho: string | string[] | undefined): IdiomaPagina {
  const valor = Array.isArray(cabecalho) ? cabecalho[0] : cabecalho;
  if (!valor) {
    return 'pt-BR';
  }
  // Brazil is the main market: anything that isn't clearly English gets Portuguese.
  const primeiro = valor.split(',')[0].trim().toLowerCase();
  return primeiro.startsWith('en') ? 'en' : 'pt-BR';
}

export function lerIdioma(valor: unknown): IdiomaPagina | null {
  if (valor === 'en' || valor === 'pt-BR') {
    return valor;
  }
  return null;
}

export function escapar(valor: string) {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// The host the person returns to, which is what really identifies the app:
// the client name is whatever the app registered, so it is shown next to it.
export function destinoLegivel(redirectUri: string) {
  try {
    const url = new URL(redirectUri);
    return url.host || url.protocol.replace(/:$/, '');
  } catch {
    return redirectUri;
  }
}

export const CABECALHOS_PAGINA = {
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'none'; base-uri 'none'",
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
};

const ESTILO = `
  :root { color-scheme: light; --tinta: #1b1f24; --suave: #5b6570; --linha: #d9dee3; --petroleo: #0a3642; --fundo: #f6f7f8; --perigo: #b42318; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; background: var(--fundo);
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: var(--tinta); }
  main { width: 100%; max-width: 420px; background: #fff; border: 1px solid var(--linha); border-radius: 12px; padding: 28px 24px;
    box-shadow: 0 1px 2px rgb(27 31 36 / .06), 0 8px 24px rgb(27 31 36 / .06); }
  .marca { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 18px; color: var(--petroleo); }
  h1 { font-size: 22px; line-height: 1.2; margin: 18px 0 8px; }
  p { margin: 0 0 8px; color: var(--suave); }
  .app { color: var(--tinta); font-weight: 600; }
  form { margin-top: 20px; display: grid; gap: 14px; }
  label { display: grid; gap: 6px; font-weight: 600; font-size: 14px; }
  small { font-weight: 400; color: var(--suave); }
  input { font: inherit; padding: 10px 12px; border: 1px solid var(--linha); border-radius: 8px; width: 100%; }
  input:focus { outline: 3px solid rgb(10 54 66 / .2); border-color: var(--petroleo); }
  button { font: inherit; font-weight: 600; padding: 11px 14px; border: 0; border-radius: 8px; background: var(--petroleo); color: #fff; cursor: pointer; }
  .erro { background: #fef3f2; border: 1px solid #fecdca; color: var(--perigo); padding: 10px 12px; border-radius: 8px; margin-top: 16px; }
  .nota { font-size: 13px; margin-top: 18px; }
`;

const LOGO = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 21 19H3z" fill="#0a3642"/><path d="M2 21h20" stroke="#0a3642" stroke-width="2"/></svg>`;

export function paginaDeEntrada(opcoes: {
  idioma: IdiomaPagina;
  pedido: string;
  nomeApp?: string;
  redirectUri: string;
  erro?: MotivoErro;
  conta?: string;
  email?: string;
}) {
  const t = TEXTOS[opcoes.idioma];
  const destino = destinoLegivel(opcoes.redirectUri);
  const app = opcoes.nomeApp?.trim() ? `${opcoes.nomeApp.trim()} (${destino})` : destino;
  const erro = opcoes.erro ? `<p class="erro" role="alert">${escapar(t.erros[opcoes.erro])}</p>` : '';

  return `<!doctype html>
<html lang="${opcoes.idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(t.titulo)}</title>
<style>${ESTILO}</style>
</head>
<body>
<main>
  <div class="marca">${LOGO}<span>Cota</span></div>
  <h1>${escapar(t.titulo)}</h1>
  <p><span class="app">${escapar(t.pedido(app))}</span></p>
  <p>${escapar(t.retorno(destino))}</p>
  ${erro}
  <form method="post" action="/entrar" autocomplete="on">
    <input type="hidden" name="pedido" value="${escapar(opcoes.pedido)}">
    <input type="hidden" name="idioma" value="${opcoes.idioma}">
    <label>${escapar(t.conta)}
      <input name="conta" required autocomplete="organization" autocapitalize="none" spellcheck="false" value="${escapar(opcoes.conta ?? '')}">
      <small>${escapar(t.contaDica)}</small>
    </label>
    <label>${escapar(t.email)}
      <input name="email" type="email" required autocomplete="username" value="${escapar(opcoes.email ?? '')}">
    </label>
    <label>${escapar(t.senha)}
      <input name="senha" type="password" required autocomplete="current-password">
    </label>
    <button type="submit">${escapar(t.entrar)}</button>
  </form>
  <p class="nota">${escapar(t.acesso)}</p>
</main>
</body>
</html>`;
}

export function paginaDeAviso(idioma: IdiomaPagina, motivo: MotivoErro) {
  const t = TEXTOS[idioma];
  return `<!doctype html>
<html lang="${idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(t.titulo)}</title>
<style>${ESTILO}</style>
</head>
<body>
<main>
  <div class="marca">${LOGO}<span>Cota</span></div>
  <h1>${escapar(t.titulo)}</h1>
  <p class="erro" role="alert">${escapar(t.erros[motivo])}</p>
</main>
</body>
</html>`;
}
