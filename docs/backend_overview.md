# Backend Overview

## Product Context
- SaaS proposal generator for heavy-services contractors in Brazil/USA.
- Core value: transform structured job data into branded proposal PDFs and hosted pages.
- Users: business owners (account admins) and their team members.

## Guiding Requirements
- Multi-language (pt-BR, en-US) content end-to-end.
- Support multiple proposal templates (system-provided + user uploaded).
- Accept job metadata (dates, equipment, pricing, terms) and optional photo gallery (≤5 images per proposal).
- Persist reusable data (clients, equipment catalog, saved fields).
- Generate PDF and hosted landing page per proposal.
- Allow sharing via secure link with access controls.
- Staging + production deploy targets in AWS, container-first workflow.
- Redis or similar cache to accelerate template rendering/lookups.

## Tech Stack Selection
- Runtime: Node.js 20 LTS with TypeScript (compiled to JavaScript for runtime consistency).
- Web framework: Fastify (lightweight, high-throughput) with `@fastify/swagger` for API docs.
- ORM: Prisma targeting PostgreSQL (managed RDS in AWS, local via docker compose).
- Storage: Amazon S3 (local dev via MinIO) for template assets and uploaded photos.
- Caching: Redis (Amazon ElastiCache in prod, dockerized locally) + Prisma query caching hooks.
- Background jobs: BullMQ (Redis backed) for heavy workloads (PDF generation, image processing, email notifications).
- PDF rendering: Headless Chromium via `@sparticuz/chromium` + `puppeteer-core` to render HTML templates.
- Localization: `i18next` server-side for system copy; proposal field labels come from template definitions.
- Auth: JSON Web Tokens (short-lived access, refresh) with hashed passwords (Argon2). Future SSO ready.
- Configuration: `dotenv` for local, AWS SSM Parameter Store in deploy.

## High-Level Architecture
```
Client Apps (Web, future Mobile)
   | REST/GraphQL (Phase 2)
Fastify API (app server)
   |-- Auth & User Mgmt
   |-- Proposal Service
   |-- Template Service
   |-- File Service (S3)
   |-- Localization Service
   |-- Queue Dispatcher (BullMQ)
   |-- Admin tools (metrics)
   |
Postgres (RDS / docker)    Redis (cache + queue)    S3 (templates/assets)
   |
Worker (BullMQ consumer) handling PDF rendering + notifications
```

## Domain Model (initial)
- **Account**: Company workspace. Fields: id, name, locale_default, settings_json.
- **User**: id, account_id, email, password_hash, role (`OWNER`, `MEMBER`), preferred_locale.
- **Client**: id, account_id, name, company_name, email, phone, notes.
- **Equipment**: id, account_id, name, capacity_tons, daily_rate, specs_json.
- **ProposalTemplate**: id, account_id? (null for system template), name, locale, description, category, input_schema_json (JSON Schema for required fields), default_data_json, html_body (portable markup), pdf_layout_options_json, is_active.
- **Proposal**: id, account_id, template_id, client_id, created_by, title, locale, status (`DRAFT`, `PENDING`, `SENT`, `ACCEPTED`, `DECLINED`, `EXPIRED`), payload_json, totals_json, public_slug, pdf_object_key, web_object_key, expires_at.
- **ProposalAsset**: id, proposal_id, account_id, s3_object_key, mime_type, position.
- **SavedFieldSet**: id, account_id, key, payload_json (reusable groups of values e.g., standard terms).
- **AuditEvent**: id, account_id, user_id, action, entity_type, entity_id, metadata_json.

## API Surface (Phase 1)
- Auth: register, login, refresh, password reset request/confirm.
- Account: fetch/update settings.
- Templates: list system templates, list account templates, create/update/delete custom templates, upload template asset (HTML or PDF).
- Clients: CRUD.
- Equipment Catalog: CRUD.
- Saved Field Sets: CRUD.
- Proposals:
  - Create draft from template (auto-populate defaults).
  - Update draft payload (job info, equipment, pricing, terms, photos metadata).
  - Trigger generation (enqueues job for PDF + static page render).
  - Fetch proposal details + ready asset URLs when done.
  - List proposals with filters (status, client, date range).
- Assets: upload photo (direct S3 signed URL approach) up to 5 images per proposal.
- Webhook ingress (future) for e-signature providers.

## Localization Strategy
- API accepts `Accept-Language` header; default to account locale.
- System strings via `i18next` with `en` and `pt-BR` namespaces (`common`, `emails`, etc.).
- Template data includes localized field labels; fallback to account default.
- Persist user-provided text as-is (do not auto-translate).

## Caching & Performance
- Redis caches frequently-used templates and account settings with TTL.
- Use ETag/Cache-Control headers on static proposal pages served via CDN (CloudFront).
- Rate limiting middleware (per account & IP) using Redis token bucket.

## Deployment Layout
- Mono-repo with `apps/api` (Fastify REST) and `apps/worker` (BullMQ consumers).
- Shared libraries under `packages/*` (`db`, `config`, `i18n`, `pdf`).
- Docker images built with multi-stage `Dockerfile` (builder -> runtime, AWS Lambda-ready optional stage).
- Infrastructure via Terraform (Phase 2) or AWS CDK; initially provide `docker-compose.aws.yml` for EC2/ECS test deploy.
- CI/CD suggestion: GitHub Actions pipeline (lint/test/build, push to ECR, deploy via CD).

## Local Development Flow
1. `cp .env.example .env` in repo root.
2. `docker compose up` brings Postgres, Redis, MinIO, LocalStack (optional), Mailhog for email previews.
3. `pnpm install` (or `yarn`).
4. `pnpm prisma migrate dev` to sync DB.
5. `pnpm dev:api` runs Fastify API with hot reload; `pnpm dev:worker` for background jobs.
6. Use seeded templates/clients for QA.

## Next Steps (Backend build)
1. Scaffold repo structure (pnpm workspace) with API + Worker apps.
2. Configure linting, formatting, tsconfig (if TypeScript) or Babel for pure JS.
3. Define Prisma schema + migration baseline.
4. Implement shared config/i18n modules.
5. Build Auth + Account modules.
6. Implement Template + Proposal services incrementally.
7. Add PDF generation worker (stubbed for now) and S3 integration.
8. Document AWS deployment + staging strategy.
