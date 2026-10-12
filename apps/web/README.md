# apps/web – Cota frontend

Next.js 14 (App Router) frontend for the crane proposal generator. Built with TypeScript, Tailwind CSS, next-intl, and TanStack Query. Layout follows the provided ServicePro/Proposteie references with a light, rounded visual system.

## Getting started
```bash
# inside repo root
pnpm dev:web
```
The app runs on `http://localhost:3000`. Middleware detects locale and redirects to `/pt-BR` by default.

### Useful scripts
```bash
pnpm dev:web      # start Next.js in dev mode
pnpm build:web    # production build (requires Node >= 18.17)
pnpm lint:web     # eslint over src/**/*.{ts,tsx}
```

## Project structure
```
src/
├─ app/
│  ├─ (auth)/sign-in, sign-up           # auth screens
│  └─ (dashboard)/...
│        dashboard, clients, proposals, templates, plans, services, team
├─ components/
│  ├─ layout/                           # Sidebar, Topbar, Shell, Locale switcher
│  └─ ui/                               # Button, Card, Badge primitives
├─ config/navigation.ts                 # sidebar routes & icon map
├─ i18n/                                # locale helpers & middleware config
├─ lib/                                 # fonts + cn helper
└─ messages/                            # translation catalogs (pt-BR, en)
```

## Design tokens
- Colors declared as CSS variables in `app/globals.css` and fed into Tailwind via `tailwind.config.ts`.
- Fonts: Inter (body) + Sora (display) – see `lib/fonts.ts`.
- Components follow rounded cards, pill buttons, and soft shadows inspired by the Figma screenshots.

## Next steps
- Hook forms and data hooks to live API endpoints (`apps/api`).
- Flesh out proposal builder (stepper, photo uploader) and template designer.
- Add toasts, modals (Radix UI), and input masks for CPF/CNPJ and phone numbers.
- Expand translation namespaces and integrate with backend i18n keys.
