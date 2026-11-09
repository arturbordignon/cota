# MCP do Cota

O servidor MCP em `apps/mcp` deixa o Claude, o ChatGPT ou o Cursor montarem propostas na conta do usuário. A IA
pergunta o que falta, chama as ferramentas e salva a proposta no Cota. Ele só fala com a API; não acessa o banco.

Há dois jeitos de rodar:

| Modo | Para quem | Entrada | Login |
| --- | --- | --- | --- |
| Hospedado (HTTP) | clientes, pelo Claude ou ChatGPT | `src/http-main.ts` | cada pessoa entra com a própria conta (OAuth) |
| Local (stdio) | desenvolvimento, Cursor, Claude Desktop | `src/main.ts` | uma conta fixa do `.env` |

## Como a conversa funciona

1. A IA sempre começa com `preparar_proposta`. A resposta diz:
   - se o plano ainda permite criar proposta (`plano.podeCriar`) e o link de planos;
   - o modo: `guiado` (conta nova ou incompleta) ou `rapido`;
   - `passosQueFaltam`, na ordem: dados da empresa, catálogo de equipamentos, condições padrão, modelo;
   - as condições, a equipe e a validade padrão já salvas.
2. **Modo guiado**: uma pergunta por mensagem. Cada resposta é salva na hora (`salvar_empresa`,
   `registrar_servico`, `salvar_padroes`), então nunca é perguntada de novo. O usuário pode pular.
3. **A proposta**: a IA pergunta só o que falta (cliente, local e período, escopo, equipamento, equipe, valores) e
   chama `montar_proposta` com `apenasPrevia: true`. Nada é salvo e nada conta no plano; volta o resumo com o total
   e os `avisos` (sem escopo, sem condições, cliente sem telefone, CNPJ faltando, diária longe do catálogo...).
4. Com o "pode salvar", chama `montar_proposta` de novo, sem `apenasPrevia`. É aqui que conta uma proposta no plano.
5. Correções vão por `editar_proposta`, que muda a mesma proposta e não conta outra.
6. A IA entrega o link `/p/{slug}`. PDF e "enviada" só se o usuário pedir.

O servidor manda essas regras no `instructions` da conexão e tem dois prompts prontos: `nova_proposta` e
`configurar_conta`.

O que o usuário não disser vem dos **padrões da conta** (Minha conta › Padrões das propostas): condições comerciais,
equipe e validade. No modelo próprio da empresa, os textos do modelo também valem. Os modelos padrão do Cota só têm
texto de exemplo, então nada vem deles.

O texto escrito na proposta (período, capacidade, validade) segue o idioma do modelo, como na tela Nova proposta.

## Ferramentas

| Ferramenta | O que faz |
| --- | --- |
| `preparar_proposta` | Situação da conta, plano e próximos passos. Chamada primeiro. |
| `ver_conta` | Conta, usuário e dados da empresa. |
| `salvar_empresa` | Nome, CNPJ, telefone, e-mail, endereço e slogan do PDF. Só o dono. |
| `salvar_padroes` | Condições, equipe e validade padrão. Quem edita modelos. |
| `listar_clientes` / `ver_cliente` / `registrar_cliente` | Clientes. |
| `listar_servicos` / `registrar_servico` | Catálogo. Não duplica um nome que já existe (ignora acento, caixa e hífen). |
| `listar_modelos` | Modelos da conta e padrão. |
| `listar_propostas` / `ver_proposta` | Propostas salvas. |
| `montar_proposta` | Prévia (`apenasPrevia`) ou salva. Cadastra cliente novo por `nomeCliente`. |
| `editar_proposta` | Corrige uma proposta salva. Aceitas e recusadas não mudam. |
| `revisar_proposta` | Lista o que falta numa proposta salva. |
| `gerar_pdf` / `enviar_proposta` | PDF e marcar como enviada. |

Ficam de fora de propósito: apagar qualquer coisa, editar o HTML do modelo, enviar fotos ou logo, cobrança, equipe
e CRM. Isso continua na tela.

## Planos

Toda conta nova começa num **teste grátis de 14 dias com até 10 propostas**. Depois escolhe um plano: Essencial (50
por mês), Profissional (100) ou Ilimitado, mensal ou anual (anual = 10 meses). O assistente vem em todos os planos:
quem paga a IA é o próprio usuário, na conta dele do Claude ou do ChatGPT.

Uma proposta conta uma vez, feita na tela ou pelo assistente. Prévia, edição, PDF e reenvio não contam. Quando o
teste acaba ou o limite do mês chega, a API responde 402 com `code` (`TRIAL_ENDED` ou `PROPOSAL_LIMIT_REACHED`) e
`plansUrl`, e o MCP repassa o link. O que já foi enviado continua no ar.

## Servidor hospedado

```bash
pnpm dev:mcp:http          # http://localhost:3334, conector em http://localhost:3334/mcp
```

Ele é um servidor de autorização OAuth 2.1 completo para o cliente MCP:

- `/.well-known/oauth-protected-resource/mcp` e `/.well-known/oauth-authorization-server` para a descoberta;
- `/register` (registro dinâmico de cliente), `/authorize`, `/token` (PKCE S256, refresh com rotação), `/revoke`;
- `/authorize` mostra uma página de login do próprio Cota (endereço da conta, e-mail, senha). O login é o mesmo do
  painel: abre uma sessão normal na API, então o assistente tem exatamente as permissões da pessoa;
- `/mcp` recebe as chamadas (Streamable HTTP sem sessão, uma por requisição), então dá para ter várias réplicas.

Os tokens que o Claude ou o ChatGPT recebem só valem neste servidor, não na API. Duram 1 hora; o refresh dura 7
dias, como a sessão do painel, e renova a sessão do Cota junto. Uma semana sem uso pede para conectar de novo.
Desconectar no app revoga o refresh e encerra a sessão do Cota.

Variáveis (veja `.env.example` e `.env.production.example`):

```env
MCP_PUBLIC_URL=https://mcp.cota.app       # obrigatório https em produção
MCP_PORT=3334
COTA_API_URL=http://api:3333/api/v1       # endereço interno da API
COTA_WEB_URL=https://app.cota.app         # ou FRONTEND_BASE_URL; usado nos links
REDIS_HOST=redis                          # sem Redis guarda na memória (só para desenvolvimento)
MCP_TRUST_PROXY=uniquelocal               # quem pode mandar X-Forwarded-For
NEXT_PUBLIC_MCP_URL=https://mcp.cota.app/mcp   # no build do web: aparece em Minha conta
```

Em produção, `docker-compose.aws.yml` sobe o serviço `mcp` (`Dockerfile.mcp`). Ponha o proxy com TLS na frente da
porta 3334 no endereço de `MCP_PUBLIC_URL`.

A API conta o limite de requisições por pessoa quando a chamada vem com token. O servidor MCP manda as chamadas de
todos os usuários do mesmo endereço, então contar por IP travaria todo mundo junto.

### Conectar

- **Claude**: Configurações › Conectores › Adicionar conector personalizado, e cole o endereço `…/mcp`.
- **ChatGPT**: adicione um conector personalizado com o mesmo endereço.
- Ao conectar abre a página do Cota; a pessoa entra com a conta dela e volta para o app.

O endereço aparece para o usuário em **Minha conta › Assistente no Claude ou ChatGPT**.

## Modo local (stdio)

No `.env` da raiz (ou no `env` do cliente MCP). O servidor lê o `.env` da pasta onde roda e o da raiz do projeto:

```env
COTA_API_URL=http://localhost:3333/api/v1
COTA_WEB_URL=http://localhost:3001
COTA_ACCOUNT_SLUG=cota-demo
COTA_EMAIL=admin@cota.local
COTA_PASSWORD=password123
```

```bash
pnpm dev:mcp               # pnpm --filter mcp start
```

O processo usa stdio. Não imprima logs em stdout.

O arquivo `.cursor/mcp.json` já aponta para este servidor. No Claude Desktop, em `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cota": {
      "command": "pnpm",
      "args": ["--filter", "mcp", "start"],
      "cwd": "/caminho/para/cota"
    }
  }
}
```

## Testes

```bash
pnpm --filter mcp test
```

Cobrem os textos e cálculos da proposta, a revisão, os padrões, a edição, o modo guiado, as ferramentas contra uma
API falsa e o fluxo OAuth inteiro (registro, login, troca do código, refresh, revogação, sessão expirada).
