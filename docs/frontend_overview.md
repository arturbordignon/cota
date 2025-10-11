# Frontend Overview

## Core Decisions

- **Framework**: Next.js 14 (App Router) with React Server Components for data fetching + streaming.
- **Language**: TypeScript (strict mode) to mirror backend conventions.
- **State/Data**: TanStack Query for client-side caching and optimistic UX, paired with Zod for runtime validation of backend responses.
- **Styling**: Tailwind CSS + CSS variables for theme tokens. Small design-system layer (`ui/` components) to express Proposta/ServicePro look & feel.
- **Icons**: Phosphor Icons (matches Brazilian SaaS aesthetics, supports filled/outlined variants).
- **Internationalization**: `next-intl` with `en-US` and `pt-BR`. Mirrors backend i18n keys (`common`, `dashboard`, `clients`, `proposals`, `templates`).
- **Auth**: Client integrates with API JWT endpoints (`/api/v1/auth`). Access token stored in httpOnly cookies via Next.js server actions; refresh token handled via secure cookie & periodic refresh.
- **Forms**: React Hook Form + Zod resolver for validation (CNPJ/CPF masks via `react-input-mask`).
- **Uploads**: Direct-to-S3 via API-signed URLs (`/api/v1/assets/upload-url`). Use Dropzone component with preview grid and limit enforcement.

## Information Architecture

```
apps/web
 ├─ app/
 │   ├─ (dashboard)/
 │   │   ├─ layout.tsx   // shell with sidebar, header, locale switch
 │   │   ├─ page.tsx     // dashboard cards, quick actions
 │   │   ├─ clients/
 │   │   │   ├─ page.tsx
 │   │   │   └─ new/page.tsx
 │   │   ├─ proposals/
 │   │   │   ├─ page.tsx
 │   │   │   ├─ [proposalId]/page.tsx
 │   │   │   └─ new/page.tsx
 │   │   ├─ templates/
 │   │   │   ├─ page.tsx (tabs: Catalog, My Templates, Upload)
 │   │   ├─ crm/
 │   │   │   └─ page.tsx (kanban board for pipeline)
 │   │   ├─ reports/
 │   │   │   └─ page.tsx (dynamic SQL-like reporting UI)
 │   │   │   └─ new/page.tsx (template builder)
 │   │   └─ plans/page.tsx
 │   ├─ (auth)/sign-in/page.tsx, sign-up/page.tsx
 │   └─ api/...(proxy routes if needed)
 ├─ components/
 │   ├─ layout/Sidebar.tsx, Topbar.tsx, Shell.tsx
 │   ├─ ui/Button.tsx, Card.tsx, Table.tsx, Badge.tsx, Tabs.tsx, EmptyState.tsx
 │   ├─ forms/TextField.tsx, Select.tsx, MaskedInput.tsx
 │   └─ proposals/TemplateCard.tsx, ProposalStatusBadge.tsx, PhotoUploader.tsx
 ├─ hooks/ (useSession, useToast, useUpload)
 ├─ lib/ (api client, auth, theme, intl)
 └─ styles/ (globals.css, tailwind config, tokens.css)
```

## Visual Language

- **Brand Colors**
  - `--color-bg`: `#FBF7EF`
  - `--color-surface`: `#F4F0E5`
  - `--color-primary`: `#F4C400` (CTAs)
  - `--color-primary-dark`: `#D2A800`
  - `--color-text`: `#2E2518`
  - `--color-muted`: `#A4947E`
- **Typography**: Use "Poppins" or "Sora" (rounded, modern). Base sizes: 16px body, 24px section headers, 32px page titles.
- **Elevation**: Soft shadows (`shadow-md` with 12% black). Rounded corners 20px for cards and 9999px for pills.
- **Spacing Scale**: 4px baseline (4, 8, 12, 16, 24, 32, 48, 64).

## Component Patterns

- **Sidebar**: Vertical nav with active highlight pill. Occupies 240px on desktop, collapsible on mobile.
- **Header**: Contains greeting, search, locale toggle, user menu, credit balance indicator.
- **Table**: Borderless rows with zebra hover, `Actions` cell using inline link buttons.
- **Cards**: Quick Action cards (icon + label), Pricing cards (plan name, price, CTA button).
- **Tabs**: Underline accent (#F4C400) for active state.
- **Badges**: Soft pills for statuses (e.g., `status-sent`: text `#2E2518`, background `#F4F0E5`; `status-viewed`: #845DFF background #EFEBFF; `status-accepted`: #2D936C background #E8F7EF).

## UX Flows

1. **Sign-up** → create workspace (account) → auto login, redirect to onboarding wizard (choose language, add first client).
2. **Create Template**: Start from system template or blank builder. Stepper: Details → Sections → Preview → Save. Connects to backend `/api/v1/templates`.
3. **Create Proposal**: Choose template, attach client, configure job data, upload images, review totals, queue generation. On submit, call `/api/v1/proposals` then `/api/v1/proposals/{id}/generate`.
4. **Proposal Detail**: Show PDF status (spinner -> ready). Provide CTA for share/copy link, regenerate, mark accepted/declined.
5. **Plans**: Display credit balance, purchase modal (future integration with payment gateway) + plan comparison cards.

## API Integration Layer

- `lib/api/client.ts`: Rest wrapper with `fetch` using base URL env `NEXT_PUBLIC_API_URL`. Includes reauth handling via refresh endpoint.
- Data hooks per resource (`useClients`, `useTemplates`, etc.) returning TanStack Query results.
- Mutations confirm with toast & route transitions.

## Localization Strategy

- Mirror backend `common.json` keys. Example folder structure: `app/(dashboard)/...` with message bundles in `messages/{locale}/`. Locale comes from the user's cookie (or Accept-Language fallback) and is provided through `next-intl`.

## Access Control

- Protect dashboard routes via middleware that checks session cookie. Unauthenticated users redirected to sign-in. Session stored in server action `getSession()` reading API tokens.

## Testing

- Playwright for e2e (smoke flows: login, create client, create proposal).
- Storybook for component regression (later).

## Deliverables Roadmap

1. Scaffold Next.js app with design tokens + layout shell.
2. Implement Auth screens + session guard.
3. Build Dashboard, Clients list & form with live API integration.
4. Templates index + create form (initial version).
5. Proposal builder (stepper) and detail view.
6. Plans page with credit cards.
7. Add i18n toggles and translation files.
