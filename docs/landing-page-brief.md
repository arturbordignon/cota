# Cota — landing page brief

Use this as the only source of truth for a marketing landing page. Generate a distinctive, production-ready page. Do not invent a new brand. Do not design a generic SaaS template.

The current page lives at `apps/web/src/app/page.tsx`. It is too short: header, hero, three steps. Replace it with a full landing that still feels like Cota, not like a new product.

---

## Product

**Cota** is a bilingual (pt-BR first, en-US second) SaaS for companies that rent or operate heavy equipment in Brazil: crane, winch, munck, lifting, industrial assembly.

The product turns a job into a branded commercial proposal. The operator picks the client, the equipment, the dates and the prices. Cota builds the PDF and a public link. The client opens the link on the phone, sees the total, downloads the PDF, and accepts or declines. No account required on the client side.

The name has two meanings and both should stay visible in the design:

1. **Cotação** — a commercial quote.
2. **Cota** — the elevation mark on a construction drawing: a triangle sitting on a baseline. That mark is the logo.

This is not a CRM, not an invoice tool, not a generic “proposal software for teams”. It is the quote that leaves the yard and comes back accepted.

---

## Audience

The buyer is the owner or the commercial person at a small or mid-size heavy-service company. They send quotes on WhatsApp today, often as a Word file or a photo of a spreadsheet. They are not designers. They do not want “workflow automation”. They want the client to open the link and say yes.

Write for that person. Short sentences. Concrete nouns: cliente, equipamento, diária, mobilização, PDF, link, aceita. No startup jargon.

**Language of the page: Portuguese (Brazil).** Headings, body, buttons, captions — all pt-BR. Do not mix English into the UI.

---

## Job of the page

1. Make it obvious what Cota does in one glance: a finished proposal the client can open.
2. Show the path: montar → gerar PDF → enviar o link → o cliente responde.
3. Get the visitor to create an account.

Primary CTA: **Criar conta** → `/sign-up`  
Secondary CTA: **Entrar** → `/sign-in`

---

## Brand that already exists — do not replace it

### Logo

The mark is a surveyor’s elevation triangle on a baseline.

- Left half of the triangle: `#FFC20E`
- Right half of the triangle + baseline: `#0F4C5C`
- Wordmark: lowercase **cota**, Familjen Grotesk Bold, `#0F4C5C`

Yellow is **only** for the logo mark. Do not use yellow as a page background, a section wash, a button, or a highlight stripe.

Existing components you may reuse or redraw:

- `apps/web/src/components/brand/logo.tsx` — `CotaSymbol`, `Logo`
- `apps/web/src/components/brand/proposal-sheet.tsx` — fake proposal card already used in the hero (“Içamento de treliças metálicas”, Guindaste 90 t, Porto de Santos, total R$ 33.300,00, status Aceita)

### Color

| Token | Hex | Use |
| --- | --- | --- |
| Petrol | `#0F4C5C` | Brand, primary buttons, wordmark |
| Petrol hover | `#0C4150` | Button hover |
| Petrol strong | `#0A3642` | Brand text on pale fills |
| Petrol soft | `#E7F0F2` | Soft fills |
| Petrol tint | `#F3F8F9` | Large quiet surfaces |
| Logo yellow | `#FFC20E` | Logo triangle only |
| Ink | `#1B1F24` | Headlines, totals |
| Ink muted | `#404751` | Secondary text |
| Muted | `#6A727E` | Supporting copy |
| White | `#FFFFFF` | Page ground |
| Surface muted | `#F6F7F8` | Alternate sections |
| Surface sunken | `#EDEFF2` | Recessed wells |
| Border | `#E4E7EB` | Rules |
| Outline | `#D0D5DC` | Dashed quote lines |
| Success | `#168046` | Accepted |
| Success soft | `#E8F5ED` | Accepted pill |

White page. Graphite type. Petrol for action. The yellow stays inside the mark.

### Type

- Body / UI: **Barlow** 400–700
- Headlines: **Barlow Semi Condensed** 500–700, tight tracking, short line length
- Wordmark only: **Familjen Grotesk** 700

These faces come from highway and rail signage. Keep that. Do not switch to a display serif, a grotesque default, or a monospace for labels.

### Shape and motion

- Corners stay modest: 6–14px. Not 24px pills on every card.
- Shadows are rare and heavy when used (a sheet of paper), not a grey glow under every block.
- Motion: one entrance in the hero is enough. No fade-up on every section.

---

## Visual idea

The page should feel like a **field drawing that became a commercial document**.

Good references in the real world: a stamped quote on a clipboard, a site elevation, a yard at dawn, a WhatsApp chat with a link, an accepted stamp. Bad references: Linear, Notion, Stripe Atlas, cream-and-terracotta portfolios, dark pages with acid green.

Spend the boldness on **one** thing: a large, believable proposal in the hero — the document the client actually receives. Around it, keep the page quiet and structured, like a drawing set: clear baseline, generous white, petrol ink, few rules.

Do **not** use:

- A cream / terracotta / clay palette
- A near-black page with one neon accent
- A newspaper / broadsheet layout
- A grid of identical rounded SaaS cards with the same shadow
- ALL-CAPS eyebrows above every heading
- Middle-dot meta strings (`A · B · C`)
- A single word in the headline set in italic or in a second color
- Numbered `01 / 02 / 03` markers unless the content is a real sequence (the “how it works” steps may use 1 2 3, nothing else)
- Arrow suffixes on every link (`→`)
- Abstract 3D shapes, isometric cranes, or stock photos of smiling office people
- Stock photos of construction workers in hard hats unless they are secondary and specific

---

## Page structure

Keep this order. You may refine layout, not the story.

### 1. Header

Sticky or static, thin, white, bottom border `#E4E7EB`.

- Left: logo + wordmark
- Right: Entrar (ghost) and Criar conta (petrol, white type)

Optional in-page links if they help: Como funciona, O que o cliente vê. Do not add Blog, Recursos, Empresa.

### 2. Hero

Two columns on desktop. Stack on mobile.

Left:

- Small line, petrol, sentence case: `Guindaste, guincho, munck e outros serviços pesados`
- Headline, display face, ~40–56px:

  `A proposta sai pronta para o cliente abrir e responder.`

- Supporting line:

  `Cadastre o serviço, monte a operação e envie um link. O cliente vê o valor, baixa o PDF e aceita ou recusa.`

- Buttons: `Criar conta` (primary) and `Já tenho conta` (secondary)

Right: the proposal sheet as the main visual. It should look like a real quote, slightly off-axis is fine. Behind it, a petrol plane — not a yellow plane. Caption under or beside it is optional, and if used should be specific, e.g. `Proposta nº 0142 · Aceita pelo cliente`.

Do not put a row of logos or fake metrics under the hero.

### 3. How it works

Three steps, in this sequence, so numbers are justified:

1. **Monte a proposta**  
   Escolha o cliente, o equipamento, o período e os valores. O total sai da mobilização mais a diária.

2. **Gere o PDF**  
   O documento sai com os dados da sua empresa, o escopo e as fotos da operação.

3. **Envie o link**  
   O cliente abre a proposta, baixa o PDF e aceita ou recusa sem criar conta.

Quiet section on `#F6F7F8`. No icons of rockets or magic wands. If you use icons, keep them to equipment / document / link.

### 4. What the client sees

This is the second important visual. Show the public proposal on a phone-sized frame: total, equipment, dates, Aceitar / Recusar, download PDF.

Headline: `O cliente abre no celular e responde.`  
Body: `Sem cadastro. Sem login. O link da proposta já chega com o valor, o equipamento e o PDF.`

This section should make WhatsApp feel inevitable without drawing a fake chat UI full of lorem.

### 5. What you keep in Cota

A short, uneven layout — not four equal cards. Content:

- **Clientes** — nome, empresa, telefone. A próxima proposta não começa do zero.
- **Serviços e equipamentos** — guindaste, munck, diária, mobilização. O catálogo é da sua operação.
- **Modelos** — um layout da empresa, com CNPJ, logo e condições.
- **Equipe** — quem monta, quem envia, quem vê o que foi aceito.

Headline: `A operação fica registrada. A próxima cota sai mais rápido.`

### 6. Who it is for

One line + a tight list, left-aligned. Not persona cards.

`Feito para quem cobra por mobilização e diária.`

- Locação de guindaste
- Guincho e munck
- Içamento e montagem industrial
- Operações em porto, obra e pátio

### 7. Closing

Petrol or graphite field, white type, no yellow wash.

Headline: `Manda a próxima proposta pelo Cota.`  
Button: `Criar conta`

Footer: wordmark, © 2026, Entrar. Nothing else.

---

## Copy rules

- Portuguese, sentence case.
- Active voice. Name the thing: proposta, PDF, link, cliente.
- No “simples, rápido, poderoso”. No “all-in-one”. No “scale your business”.
- Totals and dates stay specific when you show a sample quote. Prefer the existing sample (Santos, 90 t, R$ 33.300,00) over new invented jobs.
- Do not invent plan prices. There is a plans page inside the app. This landing does not need a pricing table. If you feel a gap, end with the account CTA, not fake numbers.

---

## Technical notes for the build

- Next.js App Router page, TypeScript, Tailwind.
- Use the existing color tokens (`primary`, `ink`, `muted`, `surface-muted`, `success`) and fonts (`font-display`, `font-sans`, `font-brand`).
- Reuse `Logo` and `Button`. Rebuild `ProposalSheet` only if the new hero needs a richer document; keep the same job data.
- Links: `/sign-in`, `/sign-up`.
- Responsive to 375px. Keyboard focus visible. Respect `prefers-reduced-motion`.
- No `<script>` in the page. No new illustration library. Phosphor icons are already in the project if a small icon is needed.

---

## Success

The page is good when a yard owner can say, in one look: “this is the quote I send, and the client answers on the phone.” If it could be the landing of any B2B SaaS after a find-and-replace, it failed.
