# Cota (proposals for heavy services)

Mono-repo for the bilingual (pt-BR/en-US) Cota proposal SaaS. The workspace houses the Fastify API, BullMQ worker, shared packages, and the new Next.js frontend inspired by the provided layouts.

## Repository layout
- `apps/api` – Fastify REST API
- `apps/worker` – BullMQ worker for background jobs (PDF generation, notifications)
- `apps/web` – Next.js 15 (App Router) frontend with Tailwind design system & next-intl
- `apps/mcp` – MCP server so an AI can list clients and save a full proposal from the user's words. See `docs/mcp.md`.
- `packages/*` – shared configuration, database access, i18n, PDF stub, storage helpers
- `docker-compose.yml` – local dev stack (Postgres, Redis, MinIO, Mailhog), bound to 127.0.0.1
- `docker-compose.aws.yml` – production stack (see "Production stack" below)
- `Dockerfile.*` – production containers for the API, worker and web app
- `docs/backend_overview.md` / `docs/frontend_overview.md` – architecture notes

## Prerequisites
- Node.js 22 LTS (use `nvm use 22` or `.nvmrc`). The frontend build requires ≥ 18.17.
- pnpm 8+ (`corepack enable pnpm`)
- Docker Desktop (for local database/cache/object storage)

## First-time setup
```bash
cp .env.example .env
# start infra (Postgres, Redis, MinIO, Mailhog)
docker compose up -d
# install workspace dependencies
pnpm install
# generate Prisma client + run initial migration
pnpm --filter @cota/db prisma:generate
pnpm --filter @cota/db prisma:migrate
```

You can also use the local helper scripts:

```bash
pnpm local:up    # starts local Docker services, runs Prisma setup, starts API + worker
pnpm local:down  # stops the local Docker services
```

Every service gets its usual host port (Postgres `5433`, Redis `6379`, API `3333`, web `3001`, MinIO `9000`/`9001`,
Mailhog `1025`/`8025`, Adminer `5555`); when one is already taken by something else on your machine, the helper
picks the next free port, saves it in `.env` and prints the final URLs at the end. It keeps `DATABASE_URL`,
`REDIS_PORT`, `S3_ENDPOINT`, `SMTP_PORT` and `NEXT_PUBLIC_API_URL` in `.env` aligned with the selected ports.

## Local development
```bash
# Frontend (Next.js + Tailwind)
pnpm --filter web exec next dev -p 3001
```

> ℹ️ **Frontend ↔ API integration**: the web app reads the REST API base URL from environment variables and authenticates through the sign-in screen. Copy `.env.example` to `.env` and set, at minimum:
>
> ```env
> NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
> ```

- API served on `http://localhost:3333` with Swagger UI at `/docs`.
- Web app served on `http://localhost:3000` (auto locale detection via middleware).
- Mailhog UI: `http://localhost:8025`
- MinIO console: `http://localhost:9001` (credentials in `.env.example`).

## Testing & linting
```bash
pnpm lint     # eslint across packages + frontend
pnpm build    # compiles all packages
pnpm test     # API security suite (needs the Docker Postgres, Redis and MinIO running)
```
The API suite in `apps/api/test` covers tenant isolation, sessions, rate limits, uploads, Stripe webhooks,
the proposal limit, public proposals and account deletion. It talks to the real services from
`docker compose up -d postgres redis minio`.

## Docker builds
The images run as the unprivileged `node` user and contain only production dependencies:
`Dockerfile.api` (API), `Dockerfile.worker` (PDF worker with Alpine Chromium) and `Dockerfile.web`
(Next.js standalone server). `Dockerfile.api` also has a `migrate` target that applies Prisma migrations.

```bash
docker build -f Dockerfile.api -t cota-api .
docker build -f Dockerfile.worker -t cota-worker .
docker build -f Dockerfile.web --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 -t cota-web .
```

### Production stack
1. Copy `.env.production.example` to `.env.production` and fill every value. The API refuses to start in
   production with sample or short secrets, the local MinIO/database passwords, a non-https frontend, or
   Stripe without a webhook secret.
2. Build, migrate and start:
   ```bash
   docker compose -f docker-compose.aws.yml --env-file .env.production build
   docker compose -f docker-compose.aws.yml --env-file .env.production run --rm migrate
   docker compose -f docker-compose.aws.yml --env-file .env.production up -d
   ```
3. Put a TLS-terminating proxy or load balancer in front: the API and web publish only on `127.0.0.1`.
   Set `TRUST_PROXY` to the proxy addresses (`uniquelocal` for an ALB on private subnets) so rate limits
   see the real client IP.

Postgres and Redis are never published; Redis requires `REDIS_PASSWORD`. The S3 bucket must stay private:
photos and PDFs are always served through signed URLs.

## Frontend notes
- See `docs/frontend_overview.md` for navigation map, design tokens, and component strategy.
- Localization handled by `next-intl` with `pt-BR` default + `en` fallback.
- Locale detection is cookie-based (with Accept-Language fallback) so routes stay clean: `/dashboard`, `/proposals`, etc.
- Stripe billing targets proposal-based plans (BR/US) rather than credits; see `/plans` for UI and expect to configure `price_` ids per tier.
- Design system components live under `apps/web/src/components/ui` & `layout`.
- Core dashboard routes already scaffolded (Dashboard, Clients, Proposals, Templates, Plans, Services, Team, Auth).
- Catálogo de templates já inclui um modelo de proposta para serviços pesados (duplicável e editável pelos clientes).

## AWS deployment outline
1. **Infrastructure** – RDS (PostgreSQL), ElastiCache (Redis), S3 for assets, ECS Fargate services for API & worker, optional CloudFront for proposal pages.
2. **Images** – Build & push Docker images to ECR.
3. **Runtime** – Deploy ECS services, configure secrets via SSM/Secrets Manager, attach IAM roles for S3 + CloudWatch.
4. **Networking** – ALB + HTTPS termination, private subnets for workers, CDN for static proposal pages.
5. **Observability** – CloudWatch logs/metrics, alarms for queue depth, error rates, and DB capacity.

## Data flow quick reference
1. Auth registration creates account + owner with hashed password (Argon2).
2. Templates cached in Redis (`templates:<account>:<scope>:<locale>`).
3. Proposals render HTML with Mustache and queue PDF generation (BullMQ).
4. Worker updates proposal status when PDF is ready (S3 upload stubbed for now).
5. Assets uploaded via signed URLs generated by the API (`/api/v1/assets/upload-url`).

## Roadmap
- Implement real PDF rendering + S3 uploads in `@cota/pdf` and worker.
- Wire frontend forms to backend APIs (clients, templates, proposals) using TanStack Query.
- Add automated testing (Vitest, Playwright) and CI pipeline.
- Expand localization namespaces (`emails`, `proposals`, `billing`), add in-app notifications, and template builder UX enhancements.

## Stripe & Billing
- Preencha as variáveis `STRIPE_API_KEY` e `STRIPE_WEBHOOK_SECRET` no `.env`, além dos price IDs (`STRIPE_PRICE_*`) gerados no painel da Stripe para cada plano (BRL e USD).
- O endpoint de checkout (`POST /api/v1/billing/checkout`) cria uma sessão com o preço escolhido; o portal de gerenciamento está em `POST /api/v1/billing/portal`.
- Configure o webhook da Stripe apontando para `/api/v1/billing/webhook` (método POST) e utilize o secret correspondente.
- O backend atual atualiza assinaturas e uso mensal de propostas (`ProposalUsage`) automaticamente via webhook.
- O limite de propostas é aplicado na criação de novos registros — ao atingir o teto mensal o endpoint responde com `402 Payment Required`.
