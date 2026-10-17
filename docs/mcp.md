# MCP do Cota

O servidor MCP em `apps/mcp` fala com a API que você já tem. A IA pergunta o que falta, chama as ferramentas e salva a proposta na conta.

O usuário só descreve a operação. O MCP resolve cliente, modelo, serviços e totais.

## O que a API já tem

| Área | Rotas | Entrou no MCP? |
| --- | --- | --- |
| Conta e sessão | `GET /auth/me`, `GET /account` | Sim — `ver_conta` |
| Clientes | listar, ver, cadastrar, editar, apagar | Sim — listar, ver, cadastrar. Editar e apagar ficam na tela. |
| Serviços / equipamentos | CRUD em `/equipment` | Sim — só listar. Cadastro de serviço fica na tela. |
| Modelos | listar e CRUD em `/templates` | Sim — só listar. O HTML do modelo não vai no MCP. |
| Propostas | criar, ver, listar, gerar PDF, enviar | Sim — o fluxo inteiro de montar e salvar. |
| PDF e link público | `POST /:id/generate`, `POST /:id/send`, `/p/:slug` | Sim |
| Fotos | upload assinado | Não. MCP não envia arquivo. |
| Equipe, departamentos | `/team` | Não. Não entra na montagem da proposta. |
| CRM / pipeline | `/pipeline` | Não. Outro fluxo. |
| Relatórios e atividade | `/reports`, `/audit-events` | Não. |
| Planos e Stripe | `/billing` | Não. |

## Ferramentas

1. `ver_conta`
2. `listar_clientes` / `ver_cliente` / `registrar_cliente`
3. `listar_servicos`
4. `listar_modelos`
5. `listar_propostas` / `ver_proposta`
6. `montar_proposta` — ferramenta principal
7. `gerar_pdf`
8. `enviar_proposta`

`montar_proposta` usa o mesmo payload da tela Nova proposta: `job`, `equipment`, `team`, `terms`, `pricing` e totais de mobilização + diária × dias.

## Como a IA deve usar

1. Se faltar contexto, chama `listar_clientes`, `listar_servicos` e `listar_modelos`.
2. Pergunta só o que ainda não tem: cliente, local, período, equipamento, valores, escopo.
3. Chama `montar_proposta`. Se o cliente não existir, manda `nomeCliente` que o MCP cadastra.
4. Devolve o link `/p/{slug}`.
5. Só gera PDF ou marca como enviada se o usuário pedir.

## Configuração

No `.env` da raiz (ou no `env` do cliente MCP):

```env
COTA_API_URL=http://localhost:3333/api/v1
COTA_WEB_URL=http://localhost:3001
COTA_ACCOUNT_SLUG=cota-demo
COTA_EMAIL=admin@cota.local
COTA_PASSWORD=password123
```

A API precisa estar no ar. O MCP entra com slug + e-mail + senha e renova o JWT sozinho.

## Cursor

O arquivo `.cursor/mcp.json` já aponta para este servidor. Depois de `pnpm install`, recarregue os MCPs no Cursor.

Para testar no terminal:

```bash
pnpm --filter mcp start
```

O processo usa stdio. Não imprima logs em stdout.

## Claude Desktop

Em `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cota": {
      "command": "pnpm",
      "args": ["--filter", "mcp", "start"],
      "cwd": "/Users/arturbordignon/Projects/cota"
    }
  }
}
```

## O que ficou de fora de propósito

- Apagar cliente, serviço ou proposta
- Editar HTML de modelo
- Upload de foto
- Cobrança, equipe e CRM

Essas peças não são o caminho “usuário fala → proposta salva”. Dá para acrescentar ferramenta por ferramenta depois, sem mudar o servidor.
