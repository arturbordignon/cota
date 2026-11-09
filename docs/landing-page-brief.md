# Cota — landing page brief (v2)

Use this as the only source of truth for the marketing landing. Do not invent a new brand. Do not design a generic SaaS template.

## Why there is a v2

The first landing (`landing/index.html`, reference in `landing/reference/landing-design.html`) is correct but thin. It has a hero, three steps, the phone and a short list. It leaves out most of what the product does:

- No FAQ. A yard owner has ten questions before signing up and the page answers none.
- Nothing about asking for a proposal in Claude or ChatGPT.
- Nothing about knowing when the client opened the link, validity, or expired proposals.
- Nothing about the commercial side: pipeline, reports, team, permissions.
- No section that names the problem (the Word file on WhatsApp) before showing the fix.

**Start from the current design. Do not throw it away.** Keep the crane scroll story, the proposal sheet, the phone, the brand and the tone. Add the sections below and make the page feel like a complete product, not a teaser.

Target length: about 10–12 screens on desktop. Every section has one job and one visual. If a section has no visual, it is a short band, not a full screen.

---

## Product

**Cota** is a bilingual (pt-BR first, en-US second) SaaS for companies that rent or operate heavy equipment in Brazil: crane, winch, munck, lifting, industrial assembly.

The operator picks the client, the equipment, the dates and the prices. Cota builds a branded PDF and a public link. The client opens the link on the phone, sees the total, downloads the PDF, and accepts or declines. No account on the client side.

The name has two meanings and both stay visible in the design:

1. **Cotação** — a commercial quote.
2. **Cota** — the elevation mark on a construction drawing: a triangle sitting on a baseline. That mark is the logo.

This is not a CRM, not an invoice tool, not "proposal software for teams". It is the quote that leaves the yard and comes back accepted.

### What the product really does (use only these facts)

| Area | What is true today |
| --- | --- |
| Proposal | Client, title, location, start and end date, scope, one or more equipment items, extra equipment, crew, terms, photos of the operation. |
| Price | Mobilização + diária × número de dias. The total updates while you fill the form. |
| Validity | Default 15 days, editable per proposal. After that the public link tells the client it expired and to ask for a new one. |
| PDF | Company data, logo, CNPJ, scope, equipment, period, prices, terms and photos. |
| Public link | `cota.app/p/0142`. Client sees total, equipment, period, location, downloads the PDF, taps Aceitar or Recusar. No login. |
| Tracking | Each proposal shows when it was created, sent, **viewed by the client**, accepted or declined. Statuses: Rascunho, Enviada, Aceita, Recusada, Expirada. |
| Catalog | Clients (name, company, phone), services and equipment with daily rate and mobilization, company templates with a visual builder. |
| Commercial | Pipeline board with custom stages and potential value per stage. Reports: proposals sent per month, acceptance rate, value in pipeline, average ticket, who on the team closed the most. |
| Team | Invite people, group them in departments, set what each department can see and do. Activity log of who did what. |
| Assistant | The user connects their Cota account to **Claude or ChatGPT** and asks for a proposal in plain words. See the dedicated section below. |
| Plans | Paid by number of proposals per month. There is an unlimited plan. Monthly or annual. New accounts get a 14-day free trial with up to 10 proposals. The assistant is in every plan. Each proposal created counts toward the month, from the dashboard or the assistant; editing, a new PDF or resending does not. Prices are shown inside the app. |
| Language | Interface in Portuguese and English. |

Do not claim anything that is not in this table: no WhatsApp integration (the user pastes the link), no automatic e-mail to the client, no e-signature, no invoicing, no import from spreadsheets, no mobile app to install.

---

## Audience

The buyer is the owner or the commercial person at a small or mid-size heavy-service company. Today they send quotes on WhatsApp as a Word file or a photo of a spreadsheet. They redo the math every time. They do not know if the client opened it. They are not designers and they do not want "workflow automation". They want the client to open the link and say yes.

Write for that person. Short sentences. Concrete nouns: cliente, equipamento, diária, mobilização, PDF, link, aceita. No startup jargon.

**Language of the page: Portuguese (Brazil).** Headings, body, buttons, captions, FAQ — all pt-BR. No English in the UI, except the product names Claude and ChatGPT.

---

## Job of the page

1. Show in one glance what Cota does: a finished proposal the client opens and answers.
2. Name the problem the visitor has today, then show the path: montar → gerar PDF → enviar o link → o cliente responde.
3. Show that the proposal can also be asked for in Claude or ChatGPT.
4. Answer the objections before sign-up (FAQ).
5. Get the visitor to create an account.

Primary CTA: **Criar conta** → `{COTA_APP_URL}/sign-up`
Secondary CTA: **Entrar** → `{COTA_APP_URL}/sign-in`

---

## Brand that already exists — do not replace it

### Logo

The mark is a surveyor's elevation triangle on a baseline.

- Left half of the triangle: `#FFC20E`
- Right half of the triangle + baseline: `#0F4C5C`
- Wordmark: lowercase **cota**, Familjen Grotesk Bold, `#0F4C5C`

Yellow is **only** for the logo mark. Never a background, wash, button, highlight or icon fill.

The file `landing/icon.svg` is the app icon. Use it in the header, the footer and inside the sample proposal.

### Color

| Token | Hex | Use |
| --- | --- | --- |
| Petrol | `#0F4C5C` | Brand, primary buttons, wordmark, closing field |
| Petrol hover | `#0C4150` | Button hover |
| Petrol strong | `#0A3642` | Dark field of the assistant section, brand text on pale fills |
| Petrol soft | `#E7F0F2` | Soft fills, ghost button hover |
| Petrol tint | `#F3F8F9` | Large quiet surfaces |
| Logo yellow | `#FFC20E` | Logo triangle only |
| Ink | `#1B1F24` | Headlines, totals |
| Ink muted | `#404751` | Secondary text |
| Muted | `#6A727E` | Supporting copy |
| White | `#FFFFFF` | Page ground |
| Surface muted | `#F6F7F8` | Alternate sections |
| Surface sunken | `#EDEFF2` | Recessed wells |
| Border | `#E4E7EB` | Rules |
| Outline | `#D0D5DC` | Dashed quote lines, dimension lines |
| Success | `#168046` | Accepted |
| Success soft | `#E8F5ED` | Accepted pill |
| Warning | `#B45309` | Expired (status pill text only) |
| Warning soft | `#FEF3C7` | Expired pill |
| Danger | `#C8281E` | Declined (status pill text only) |
| Danger soft | `#FDECEA` | Declined pill |

White page. Graphite type. Petrol for action. The yellow stays inside the mark.

### Type

- Body / UI: **Barlow** 400–700
- Headlines: **Barlow Semi Condensed** 500–700, tight tracking, short line length
- Wordmark only: **Familjen Grotesk** 700

These faces come from highway and rail signage. Keep that. No display serif, no default grotesque, no monospace labels.

### Shape and motion

- Corners stay modest: 6–14px. No 24px pills on every card.
- Shadows are rare and heavy when used (a sheet of paper), not a grey glow under every block.
- Motion: the crane scroll story is the only motion on the page. Other sections are static. No fade-up on scroll. FAQ open/close may animate height, nothing else.

---

## Visual idea

The page feels like a **field drawing that became a commercial document**.

Real-world references: a stamped quote on a clipboard, a site elevation drawing with dimension lines, a yard at dawn, a phone with a link, an accepted stamp. Bad references: Linear, Notion, Stripe, cream-and-terracotta portfolios, dark pages with acid green, "AI startup" pages with gradients and sparkles.

**Three signature visuals, everything else quiet:**

1. The crane scroll story in the hero (already built).
2. The annotated proposal: the real document with dimension-line callouts, like a technical drawing (new).
3. The conversation in Claude or ChatGPT that ends in a saved proposal (new).

Around them the page stays structured like a drawing set: clear baseline, generous white, petrol ink, few rules.

### The drawing language, used with restraint

The elevation triangle on a baseline is the one recurring mark. Use it in petrol (never yellow) for:

- markers on the proposal timeline (section 7);
- the end points of dimension lines in the annotated proposal (section 5).

Do not use it as a bullet in every list.

### Do not use

- A cream / terracotta / clay palette
- A near-black page with one neon accent
- A newspaper / broadsheet layout
- A grid of identical rounded SaaS cards with the same shadow
- ALL-CAPS eyebrows above every heading
- Middle-dot meta strings (`A · B · C`)
- A single word in the headline set in italic or in a second color
- Numbered `01 / 02 / 03` markers, unless the content is a real sequence (how it works, the timeline, the 3 steps to connect the assistant)
- Arrow suffixes on every link (`→`)
- Abstract 3D shapes, isometric cranes, stock photos of smiling office people
- Stock photos of construction workers in hard hats
- For the assistant: sparkle icons ✨, robot heads, purple or rainbow gradients, glowing orbs, "powered by AI" badges
- Logo walls, fake testimonials, fake customer counts, star ratings

---

## How to talk about the assistant

The feature is built on a technical protocol. **The page never names it.** Do not write MCP, servidor, API, protocolo, conector, integração, ferramentas, LLM, agente, prompt, token.

Talk only about what the user gets:

- Ask for the proposal in Claude or ChatGPT, in your own words.
- The assistant uses your clients, equipment and templates already in Cota.
- It asks only what is missing.
- It creates the client if it is new.
- It saves the proposal in Cota and gives back the link.
- It answers questions about your proposals.
- Nothing goes to the client unless you ask.

Name **Claude** and **ChatGPT** in text. Do not draw their logos and do not copy their interfaces. The chat frame is drawn in Cota's own style: white sheet, Barlow, petrol for the user's bubbles, a small label on top that says `Claude ou ChatGPT`.

---

## Page structure

Keep this order. Refine layout freely. Background rhythm is given per section so the page does not become a stack of white blocks.

### 1. Header — white

Sticky, thin, white, bottom border `#E4E7EB`.

- Left: icon + wordmark
- Center or right: `Como funciona`, `O cliente`, `Assistente`, `Perguntas` (anchors). Hidden under 720px.
- Right: `Entrar` (ghost) and `Criar conta` (petrol, white type)

No Blog, Recursos, Empresa, Preços.

### 2. Hero + crane scroll story — white

Keep the current hero and crane story as they are: headline, supporting line, buttons, the 3D crane lifting the truss, the three steps appearing during the scroll, and the ending `A treliça assentou. A proposta voltou aceita.`

Copy stays:

- Small line, petrol, sentence case: `Guindaste, guincho, munck e outros serviços pesados`
- Headline: `A proposta sai pronta para o cliente abrir e responder.`
- Supporting line: `Cadastre o serviço, monte a operação e envie um link. O cliente vê o valor, baixa o PDF e aceita ou recusa.`
- Buttons: `Criar conta` and `Já tenho conta`

**Add** one quiet line under the buttons, muted, linking to `#assistente`:

`Também dá para pedir a proposta pelo Claude ou pelo ChatGPT.`

The three steps inside the story are the "how it works". Anchor `#como-funciona` points to the story. Do not repeat the steps in another section.

### 3. The problem — white

Headline: `Hoje a proposta sai como dá.`

Two columns separated by a single vertical rule, like a before/after on a drawing sheet. Not cards.

Left column, label `Do jeito de sempre`, muted ink:

- Arquivo de Word no WhatsApp, ou foto da planilha.
- A conta de mobilização e diária é refeita em cada orçamento.
- O cliente pergunta "qual é o total mesmo?".
- Você não sabe se ele abriu.
- O aceite fica perdido numa mensagem de áudio.

Right column, label `Com o Cota`, ink, small petrol check before each line:

- Um link com o total, o equipamento e o PDF.
- O total sai calculado: mobilização mais diária vezes os dias.
- O valor está na primeira linha que o cliente vê.
- A proposta mostra quando o cliente abriu.
- O aceite fica registrado, com data e hora.

The lines pair up across the columns. On mobile, stack left then right.

### 4. How it works

Already inside the crane story (section 2). Nothing new here.

### 5. The document — surface muted `#F6F7F8`

Second signature visual. Anchor `#documento`.

Headline: `É isso que sai do pátio.`
Body: `Um PDF com cara de documento, com os dados da sua empresa e o total já calculado. O mesmo conteúdo vai no link que o cliente abre.`

The proposal sheet, large, flat (not tilted here), with **dimension-line callouts** like a technical drawing: thin `#D0D5DC` leader lines ending in a small petrol triangle, each pointing to one part of the document with a short label.

Callouts (6, no more):

- `Logo, razão social e CNPJ` → document header
- `Cliente, local e período` → job block
- `Equipamento e equipe` → equipment line
- `Mobilização + diária × dias` → price table
- `Fotos da operação` → a photo strip at the bottom of page 1 (add it to the sheet: 3 small grey-toned photo frames of a crane, a truss, a port; no people)
- `Condições e validade de 15 dias` → footer of the sheet

Sample data, keep exactly:

- Sua Empresa Içamentos Ltda., CNPJ 00.000.000/0001-00
- Proposta nº 0142, emitida em 14/10/2026
- Içamento de treliças metálicas
- Cliente Atlântica Montagens, Porto de Santos, SP
- Guindaste 90 t com operador, 21 a 23/10/2026
- Mobilização e desmobilização R$ 6.300,00
- Diária do guindaste 90 t, 3 × R$ 9.000,00 = R$ 27.000,00
- Total R$ 33.300,00

On mobile, callouts become a numbered legend under the sheet (1–6 on the sheet, list below). That is the only place numbers are used as labels outside a sequence, and it is justified because it is a legend.

### 6. What the client sees — white

Anchor `#cliente`. Keep the current phone and copy, and add a short column of facts beside it.

Headline: `O cliente abre no celular e responde.`
Body: `Sem cadastro. Sem login. O link da proposta já chega com o valor, o equipamento e o PDF.`

Phone screen (keep): Sua Empresa Içamentos, Proposta nº 0142, Para Atlântica Montagens, Total da proposta R$ 33.300,00, Mobilização + 3 diárias, Equipamento, Período, Local, `Baixar PDF` (2 páginas), `Aceitar proposta`, `Recusar`.

Facts beside the phone, three short lines, no icons needed:

- **Abre em qualquer celular.** É uma página, não um app.
- **Baixa o PDF.** Para mandar ao financeiro ou imprimir.
- **Responde com um toque.** Aceitar ou recusar. Depois do aceite, a página mostra `Proposta aceita. Obrigado! A empresa entrará em contato.`

Under it, keep the link strip: label `O que você cola na conversa com o cliente`, the link `cota.app/p/0142`, and the line `Um link só. Cabe no WhatsApp, no e-mail ou no SMS.`

### 7. Tracking — petrol tint `#F3F8F9`

Headline: `Você sabe quando o cliente abriu.`
Body: `Cada proposta guarda o caminho dela. Quando o cliente abre o link, fica registrado. Quando ele responde, o status muda sozinho.`

Visual: a horizontal timeline for proposal nº 0142 drawn on a baseline, with the elevation triangle as the marker for each event. On mobile it turns vertical.

- `Criada` 14/10, 09:12
- `Enviada` 14/10, 09:20
- `Visualizada pelo cliente` 14/10, 18:47
- `Aceita` 15/10, 10:42 (success green pill)

Below, one quiet row with the five status pills as they look in the app: `Rascunho`, `Enviada`, `Aceita`, `Recusada`, `Expirada`.

And one line: `Passou da validade, o link avisa o cliente que a proposta expirou e pede uma nova. Ninguém aceita um preço vencido.`

### 8. The assistant — petrol strong `#0A3642`, white type

Third signature visual. Anchor `#assistente`. This is the newest part of the product; give it room.

Headline: `Peça a proposta numa conversa.`
Body: `Conecte o Cota ao Claude ou ao ChatGPT e escreva como você falaria com alguém do escritório. O assistente usa os seus clientes, os seus equipamentos e o seu modelo, pergunta só o que falta e salva a proposta no Cota.`

Visual: a chat frame (white sheet, radius 12px, heavy paper shadow) with the label `Claude ou ChatGPT` at the top. The conversation, exactly:

> **Você:** Monta uma proposta pra Atlântica Montagens. Guindaste 90 t no Porto de Santos, de 21 a 23/10. Mobilização 6.300 e diária 9.000.
>
> **Assistente:** Achei a Atlântica Montagens e o Guindaste 90 t no seu cadastro. Qual é o escopo do serviço?
>
> **Você:** Içamento de treliças metálicas, com operador.
>
> **Assistente:** Proposta nº 0142 salva no Cota, com o seu modelo.
> Mobilização R$ 6.300,00
> 3 diárias × R$ 9.000,00 = R$ 27.000,00
> **Total R$ 33.300,00**
> Link para o cliente: cota.app/p/0142
> Quer que eu gere o PDF?

Render the last assistant message as a small embedded card (title, total, link), so it reads as a real saved proposal, not a block of text. The user's bubbles are petrol with white type; the assistant's are surface muted with ink type.

Beside the frame, six benefits as a two-column list, short bold lead plus one sentence. No icons, or a single thin line icon each if needed (document, user, question, chat, phone, lock — Phosphor, regular weight):

- **Usa o que já está no Cota.** Clientes, equipamentos e modelos da sua conta. Nada de cadastrar de novo.
- **Pergunta só o que falta.** Se você já disse o cliente e as datas, ele não pergunta de novo.
- **Cliente novo entra junto.** Se o cliente ainda não existe, o cadastro sai com a proposta.
- **Responde sobre as suas propostas.** "Quais ainda não foram aceitas?" "Quanto foi a diária da última da Atlântica?"
- **Do escritório ou da obra.** No computador ou no app do Claude e do ChatGPT no celular, digitando ou falando.
- **Nada sai sem você.** O assistente monta e salva. PDF e envio só quando você pedir.

Under that, a row of example requests set as quoted lines (white, 70% opacity), as if pinned to the drawing:

- "Gera o PDF da 0142 e me passa o link."
- "Quais propostas estão esperando resposta?"
- "Cadastra o cliente novo e monta a mesma proposta da Atlântica para ele."
- "Lista os equipamentos que eu tenho com diária."

Then three steps to start (a real sequence, numbers allowed):

1. `Crie a sua conta no Cota.`
2. `Conecte o Cota no Claude ou no ChatGPT com o seu login.`
3. `Peça a primeira proposta.`

Button: `Criar conta` (white button, petrol type).

### 9. What you keep in Cota — white

Headline: `A operação fica registrada. A próxima cota sai mais rápido.`

Short, uneven layout. Not three equal cards. Keep the current mini-UI pieces (client row, catalog rows):

- **Clientes** — nome, empresa, telefone. A próxima proposta não começa do zero. (Show the Atlântica Montagens row with `Última: nº 0142` and the Aceita pill.)
- **Serviços e equipamentos** — guindaste, munck, guincho, diária e mobilização. O catálogo é da sua operação. (Show: Guindaste 90 t diária R$ 9.000,00; Mobilização Santos R$ 6.300,00; Munck por diária; Guincho por diária.)
- **Modelos** — o layout da empresa, com logo, CNPJ e condições. Você monta uma vez no editor visual e todas as propostas saem iguais. (Show a small thumbnail of the template with a color swatch in petrol and the logo slot.)

### 10. The commercial side — surface muted `#F6F7F8`

Headline: `Do primeiro contato ao aceite, tudo no mesmo lugar.`

Two parts, side by side on desktop, uneven widths (pipeline wider).

**Pipeline**, left:

`Organize as oportunidades em etapas e veja quanto está em negociação.`

A compact board with 4 columns: `Contato`, `Proposta enviada`, `Negociação`, `Fechado`. Two or three cards per column, each with client name, equipment and value. Column header shows the sum. Use the Atlântica job (R$ 33.300,00) in `Fechado`. Other cards may use short generic names (Construtora, Terminal, Metalúrgica) with plausible values between R$ 8.000 and R$ 60.000.

`As etapas são suas. Mude os nomes e a ordem.`

**Relatórios**, right:

`Saiba quantas propostas saíram no mês, quantas foram aceitas e quem da equipe mais fechou.`

A small panel with four figures as they appear in the app: `Propostas enviadas no mês`, `Taxa de aceite`, `Valor em pipeline`, `Ticket médio`, plus a tiny bar chart of the last 6 months in petrol. These are product UI, clearly inside a panel frame, not marketing claims under the hero.

### 11. Team and control — white

Headline: `Cada um vê o que precisa.`
Body: `Convide quem monta, quem envia e quem aprova. Separe por departamento e defina o que cada um pode fazer.`

Three short items, inline, not cards:

- **Equipe** — convite por e-mail. Cada pessoa com o próprio acesso.
- **Departamentos e permissões** — comercial cria e envia, operação consulta, financeiro vê o que foi aceito.
- **Registro de atividades** — quem criou, quem mudou, quem enviou. Com data e hora.

Visual, optional: a small permissions matrix (3 departments × 4 actions: criar proposta, enviar, ver relatórios, editar modelos) with petrol checks.

### 12. Who it is for — petrol tint `#F3F8F9`

One line + a tight list, left-aligned. Not persona cards.

`Feito para quem cobra por mobilização e diária.`

- Locação de guindaste
- Guincho e munck
- Içamento e montagem industrial
- Operações em porto, obra e pátio

Closing line, muted: `Se o seu serviço tem equipamento, período e diária, a proposta cabe no Cota.`

### 13. Plans — white

A short band, not a pricing table. **Do not invent prices.**

Headline: `Você paga pelo número de propostas do mês.`

Three facts in a row, separated by vertical rules:

- **Plano por propostas** — escolha quantas propostas por mês a sua operação manda.
- **Plano ilimitado** — para quem manda proposta todo dia.
- **Mensal ou anual** — mude de plano quando precisar.

Line under: `Teste grátis por 14 dias, com até 10 propostas. Os valores aparecem na página de planos assim que você cria a conta.`
Button: `Criar conta`

### 14. FAQ — surface muted `#F6F7F8`

Anchor `#perguntas`. Headline: `Perguntas frequentes`.

Layout: on desktop, the group names in a narrow left column (sticky while scrolling the section), questions on the right. Each question is a `<details>` / `<summary>` with a plus/minus in petrol. All closed by default except the first.

Use this copy exactly.

**O cliente**

- **O meu cliente precisa criar conta ou baixar algum app?**
  Não. Ele abre o link no navegador do celular ou do computador, vê a proposta, baixa o PDF e aceita ou recusa.

- **Como a proposta chega ao cliente?**
  Você copia o link e manda onde já conversa com ele: WhatsApp, e-mail ou SMS. O PDF também fica disponível para baixar e anexar.

- **Eu fico sabendo quando o cliente abre?**
  Sim. A proposta mostra a data e a hora em que o cliente abriu o link pela primeira vez.

- **O que acontece quando ele aceita ou recusa?**
  O status muda no Cota na hora, com data e hora, e entra no painel e nos relatórios. Você não precisa perguntar se ele viu.

- **E se o cliente abrir depois da validade?**
  O link avisa que a proposta expirou e pede para ele solicitar uma nova. Ninguém aceita um preço vencido.

**A proposta**

- **Como o total é calculado?**
  Mobilização mais a diária vezes o número de dias. O total aparece enquanto você preenche, antes de gerar o PDF.

- **A proposta sai com o logo e os dados da minha empresa?**
  Sim. Você monta o modelo uma vez, com logo, razão social, CNPJ e condições comerciais. Todas as propostas saem com ele.

- **Dá para colocar mais de um equipamento e fotos da operação?**
  Sim. Você escolhe um ou mais equipamentos do seu catálogo, descreve a equipe e anexa fotos. As fotos vão no PDF.

- **Qual é a validade da proposta?**
  Quinze dias por padrão. Você muda em cada proposta.

- **Serve só para guindaste?**
  Não. Serve para guincho, munck, içamento, montagem industrial e qualquer serviço cobrado por mobilização e diária.

**Claude e ChatGPT**

- **Como funciona pedir a proposta pelo Claude ou pelo ChatGPT?**
  Você conecta a sua conta do Cota uma vez. Depois é só escrever o pedido na conversa. O assistente usa os seus clientes, equipamentos e modelos, pergunta o que falta e salva a proposta no Cota com o link pronto.

- **O assistente manda a proposta para o cliente sozinho?**
  Não. Ele monta e salva. Gerar o PDF e marcar como enviada só acontece quando você pede. O link quem manda é você.

- **O assistente vê dados de outras empresas?**
  Não. Ele entra com o seu acesso e vê só a sua conta, do mesmo jeito que você vê no painel.

- **Preciso usar o assistente?**
  Não. Tudo o que ele faz também dá para fazer pelo painel do Cota.

- **Preciso pagar o Claude ou o ChatGPT?**
  Você usa a sua própria conta do Claude ou do ChatGPT. O que cada plano deles permite é definido por eles.

**Conta e planos**

- **Preciso instalar alguma coisa?**
  Não. O Cota funciona no navegador, no computador ou no celular.

- **Quanto custa?**
  Você começa com 14 dias grátis, com até 10 propostas. Depois, os planos são pelo número de propostas por mês, e há um plano ilimitado. Você vê os valores na página de planos assim que cria a conta.

- **O que conta como uma proposta no plano?**
  Cada proposta criada no mês conta uma vez, pelo painel ou pelo assistente. Corrigir, gerar o PDF de novo ou reenviar o link não conta outra.

- **Posso colocar a minha equipe?**
  Sim. Você convida por e-mail, separa por departamento e define o que cada pessoa pode ver e fazer.

- **O Cota está em português?**
  Sim. A interface está em português e em inglês. Cada pessoa escolhe o idioma.

Under the list, a small row:

`Ainda com dúvida? Pergunte ao Claude ou ao ChatGPT sobre o Cota.`

Two ghost buttons: `Perguntar ao Claude` and `Perguntar ao ChatGPT`. They open in a new tab with the question already written (see technical notes).

### 15. Closing — petrol `#0F4C5C`, white type

Keep.

Headline: `Manda a próxima proposta pelo Cota.`
Line: `Crie a conta, cadastre o primeiro equipamento e envie o link ainda hoje.`
Buttons: `Criar conta` (white button, petrol type) and `Entrar` (white outline).

### 16. Footer — white

One row on desktop, stacked on mobile:

- Left: icon + wordmark, and the line `Propostas para guindaste, guincho, munck e serviços pesados.`
- Middle: anchors `Como funciona`, `O cliente`, `Assistente`, `Perguntas`
- Right: `Entrar`, `Criar conta`
- Bottom line, muted: `© 2026 Cota`

No social icons, no newsletter, no links to pages that do not exist (no Termos, Privacidade, Blog until they exist).

---

## Copy rules

- Portuguese, sentence case.
- Active voice. Name the thing: proposta, PDF, link, cliente, diária, mobilização.
- No "simples, rápido, poderoso", "all-in-one", "escale seu negócio", "revolucione", "inteligência artificial de ponta", "transforme".
- The word "IA" may appear at most once on the page. Prefer "assistente" and the names Claude and ChatGPT.
- Totals and dates stay specific. Reuse the sample job (Santos, 90 t, nº 0142, R$ 33.300,00) everywhere it fits so the page tells one story from hero to FAQ.
- No invented prices, customer names, testimonials or usage numbers.

---

## Technical notes for the build

The landing is a **static site** in `landing/`, separate from the Next.js app. Keep that.

- `landing/index.html` — the page. Plain HTML + CSS. No framework, no build step.
- `landing/main.js` — buttons, scroll story, and the two "Perguntar" links.
- `landing/config.js` — `window.COTA_APP_URL`. Every `Entrar` goes to `{COTA_APP_URL}/sign-in`, every `Criar conta` to `{COTA_APP_URL}/sign-up`. Keep this mechanism.
- `landing/crane-scene.js` — the 3D crane, three.js from the CDN. Do not touch it beyond what the new layout needs. No other 3D on the page.
- `landing/icon.svg`, `landing/apple-touch-icon.png` — brand icons.
- Fonts from Google Fonts: Barlow, Barlow Semi Condensed, Familjen Grotesk.

Build rules:

- FAQ with native `<details>` / `<summary>`. Works without JavaScript.
- Add `FAQPage` structured data (`<script type="application/ld+json">`) with the same questions and answers as the visible FAQ.
- "Perguntar ao Claude" opens `https://claude.ai/new?q=` and "Perguntar ao ChatGPT" opens `https://chatgpt.com/?q=`, each with this text URL-encoded, where `{url}` is the landing's own address read in `main.js` from `window.location.origin`:
  `Leia {url} e me explique o que o Cota faz, como o cliente recebe a proposta e se serve para uma empresa de locação de guindaste.`
  Open in a new tab with `rel="noopener"`.
- Anchors: `#como-funciona`, `#documento`, `#cliente`, `#assistente`, `#perguntas`. Offset for the sticky header with `scroll-margin-top`.
- Meta: title `Cota — proposta pronta para o cliente`, description `Propostas comerciais para guindaste, guincho, munck e serviços pesados. O cliente abre o link no celular, baixa o PDF e aceita.`, plus Open Graph title, description and image slot.
- Responsive down to 375px. No horizontal scroll. The pipeline board scrolls horizontally inside its own frame on mobile.
- Keyboard focus visible on every link, button and summary (`3px solid #0F4C5C`, white on dark fields).
- Respect `prefers-reduced-motion`: the crane story shows its final state, FAQ opens without animation.
- Contrast AA for all text, including the 70% white lines on the assistant field.
- Images: the three operation photos in the document can be grey placeholders with a crane, truss and port silhouette drawn in SVG. No stock photography.

---

## Success

The page is good when a yard owner can say, after one scroll:

1. "This is the quote I send, and the client answers on the phone."
2. "I'll know when the client opened it."
3. "I can ask for it in ChatGPT, from the job site."
4. "My question was in the FAQ."

If it could be the landing of any B2B SaaS after a find-and-replace, it failed.
