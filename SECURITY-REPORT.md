# Security report — Cota

Pass run on 2026-10-21 following the AI Security Hardening Prompt Pack (`01-master-audit-and-harden`,
web modules 1–12, `21-verify-and-ship`). Stack: Fastify 5 API, BullMQ/Puppeteer PDF worker, Next.js web
app, Prisma/PostgreSQL, Redis, S3 (MinIO locally), Stripe, SMTP. Multi-tenant by `accountId`, taken from
the token on every query. No mobile app.

## Verdict

Safe to ship once the "Cannot fix in code" items below are done. Tenant isolation was already solid (every
probe returned 404). The serious problems were around it:
- **Stripe:** webhooks could be forged when no signing secret was set, and canceled subscriptions kept
  their paid plan.
- **Sessions:** a deactivated member kept access until the token expired, refresh tokens could not be
  revoked, and a template could steal an owner's session through the preview.
- **Production configuration:** sample secrets were accepted, the API docs and localhost CORS were open,
  and the API image did not start at all.
- **Dependencies:** 68 high and 9 critical advisories.

All of these are fixed and proven by tests. The production audit now shows 0 high and 0 critical. The
residual risk is in what code can't settle: secrets, the bucket policy, and session tokens kept in
localStorage (see "Needs your approval").

## Findings

| # | Sev. | Domain | Attack scenario | Where | Change | Proof |
|---|---|---|---|---|---|---|
| 1 | Critical | Payments | With `STRIPE_WEBHOOK_SECRET` empty, an event signed with an empty key was accepted (500 on a bare body, not 400), so anyone could forge subscription events | `routes/v1/billing.ts` | Webhook answers 503 without a secret; production refuses to boot with Stripe on and no secret | `billing.test.ts` signature cases, `config.test.ts` |
| 2 | Critical | Secrets | `JWT_*_SECRET` defaulted to `change-me`: a deploy that forgot them accepts forged tokens | `packages/config` | Production exits on sample/short/equal JWT secrets, MinIO or `cota:cota` passwords, non-https frontend | `config.test.ts` (incl. a real process exiting) |
| 3 | Critical | Deps | Next.js middleware auth bypass, fast-jwt algorithm confusion, basic-ftp, fast-xml-parser, i18next-fs-backend path traversal | lockfile | Fastify 5.12, @fastify/jwt 10.2, Next 15.5 + React 19, puppeteer-core 25, AWS SDK, nodemailer 10, pins | `pnpm audit --prod`: 9 critical/68 high → 0/0 |
| 4 | High | Payments | Canceling kept the paid plan forever; `past_due`/`unpaid` still granted it; out-of-order events could restore it | `billing.ts` | Re-read the subscription from Stripe on every event, grant only `active`/`trialing`, fall back to another paid sub or the default plan, dedupe event ids | `billing.test.ts` "subscription sync" (6 tests) |
| 5 | High | XSS / session | A member with template access saves `<img onerror=…>`; it runs in the owner's dashboard when previewed and reads tokens from localStorage | `templates/[templateId]/page.tsx` | Preview in `<iframe sandbox="">` | UI E2E checks the sandbox attribute |
| 6 | High | Auth | A deactivated member kept full access, and a demoted owner kept owner routes, until the token expired (15 min) | `app.ts` authenticate | User reloaded on every request (active, account, current role); JWT pinned to HS256 | `auth.test.ts` deactivation/demotion |
| 7 | High | Auth | Refresh tokens lived 7 days with no revocation; sign-out only cleared localStorage | `auth.ts`, web provider | Rotating refresh tokens tracked in Redis (30 s grace), `POST /auth/logout`, web calls it | `auth.test.ts` refresh/logout, UI E2E |
| 8 | High | Rate limiting | Behind the ALB every user shared one bucket; per-process counters; a forged `X-Forwarded-For` would have been trusted once a proxy was | `app.ts` | `TRUST_PROXY` address list, counters in Redis | `rate-limit.test.ts` |
| 9 | High | Billing | At 49/50 proposals, 8 parallel creations all succeeded (check then write) | `services/billing.ts` | Single conditional `UPDATE … proposals_used < limit` | `proposal-limit.test.ts` |
| 10 | High | Infra | Production API/worker images crashed on boot (`@cota/config` not found); the worker had a glibc Chromium on Alpine | Dockerfiles | pnpm deploy images, non-root, healthchecks, Alpine Chromium; web on Next standalone | Production compose E2E |
| 11 | Medium | Uploads | Upload URL signed for any type (`text/html`), 5 MB only checked in the browser, attached files never checked | `assets.ts`, `proposals.ts` | PNG/JPEG/WebP only, size in the signature, magic-byte sniff on attach, bad objects deleted | `uploads.test.ts` (13 tests incl. real PUTs to MinIO) |
| 12 | Medium | Privacy | Invite tokens written to request logs (`?token=`) | `app.ts` logger | URL redaction, header redaction, no emails in log lines | `logs.test.ts` |
| 13 | Medium | Injection | Account and inviter names inserted raw into invite email HTML (phishing from our domain) | `lib/mailer.ts` | HTML-escaped | `mailer.test.ts`, Mailhog delivery |
| 14 | Medium | Auth | Login timing revealed which emails exist; per-IP limits only, so distributed guessing of one user worked | `auth.ts` | Always one Argon2 verify; 10 failures per account+email lock 15 min | `auth.test.ts` login |
| 15 | Medium | Abuse | Sign-up, invites, refresh, public answers and PDF generation only had the global limit | routes | Per-route limits | `rate-limit.test.ts` |
| 16 | Medium | Transport | CORS trusted `localhost:3000/3001` with credentials in production | `app.ts` | Only `FRONTEND_BASE_URL`/`CDN_BASE_URL` in production | `http-hardening.test.ts` |
| 17 | Medium | Exposure | Swagger UI and the OpenAPI spec public in production | `app.ts` | Only outside production | `http-hardening.test.ts` |
| 18 | Medium | Headers | Web app had no CSP, frame protection, HSTS or Referrer-Policy | `next.config.mjs` | Full header set | E2E header checks |
| 19 | Medium | SSRF | PDF Chromium loaded any https URL from user templates, including internal hosts | `packages/pdf` | Private/loopback/link-local/internal names blocked | `pdf-requests.test.ts` |
| 20 | Medium | Payments | Checkout `successUrl`/`cancelUrl` could send customers to any site | `billing.ts` | Must be on the frontend origin | `billing.test.ts` checkout |
| 21 | Medium | Infra | Dev compose published Postgres, Redis, MinIO, Mailhog and Adminer on all interfaces with dev passwords; production compose had a hard-coded DB password and Redis without auth | compose files | Dev bound to 127.0.0.1, Adminer behind a profile; prod requires passwords, nothing internal published | compose review, E2E |
| 22 | Medium | LGPD | No way to erase an account's data | — | `DELETE /account` (password + slug) wiping DB, files and the Stripe customer, plus UI | `account-deletion.test.ts`, UI E2E |
| 23 | Low | Integrity | Accept and decline racing could stamp both | `public.ts` | Conditional update on `SENT` | `public-proposals.test.ts` |
| 24 | Low | Runtime | Node 20 is end-of-life (April 2026) | Dockerfiles, `.nvmrc` | Node 22 LTS | builds |

Already fine and covered by tests: every by-id route scopes by the token's account (27 cross-tenant probes
return 404), Argon2id passwords, 256-bit hashed single-use invite tokens, parameterized queries (Prisma;
the report "SQL" strings are display-only), sandboxed public proposal page, private bucket with signed
URLs, no secrets in git history.

## Verification

- **API security suite** (`apps/api/test`, Vitest against Docker Postgres/Redis/MinIO): 111/111 in the last
  full run, plus the 24 tests added afterwards (account deletion, PDF request filter) passing on their own.
  Each fix's test was also run against the old code to confirm it failed there.
- **Production stack end to end** (`docker-compose.aws.yml`, `NODE_ENV=production`, real random secrets,
  behind a TLS proxy): 54/54 checks. Covered headers, CORS, hidden docs, sign-up, login, clients,
  services, templates, a proposal with a photo uploaded to S3, a disguised upload refused, the PDF rendered by
  the worker and served only with a signature, the public page with accept, refused double answers,
  checkout and webhook refusals, an invite by email through Mailhog, member restrictions, refresh, logout,
  the audit trail, and account deletion erasing the stored PDF.
- **Browser run** (Chrome against the production images): sign-up and 18 dashboard pages in pt-BR and en,
  a photo uploaded from the browser under the CSP, sandboxed template preview and public page. It found
  three translation bugs (fixed in `4844c23`). The re-run, and the sign-out, sign-in and delete-from-UI
  steps, were stopped before completion.
- **Dependency audit** (`pnpm audit --prod`): 0 critical, 0 high, 2 moderate (next-intl, not reachable).
- **Builds**: all packages type-check and build; lint has warnings only; API (250MB), worker and web
  (247MB) images build and run as non-root.

## Needs your approval

- **Session tokens in localStorage.** Any XSS in the dashboard can still read them. The real fix is an
  httpOnly, Secure, SameSite refresh cookie set by the API, with CSRF protection. That changes how the web
  app and the MCP sign in. The XSS sinks found are closed and the CSP limits scripts to the app; the cookie
  move is the remaining step.
- **CSP `script-src 'unsafe-inline'`.** Next.js needs it without a nonce middleware. Moving to nonces
  makes every page dynamic.
- **next-intl 3 → 4.** The two remaining moderate advisories are in its routing middleware and an
  experimental option, neither used here; upgrading is a major migration.
- **No password reset flow exists.** Users who forget a password need the owner to re-invite them. Build
  it with single-use, expiring, hashed tokens and the same rate limits as login.
- **Members' personal data.** Active members can be deactivated but not erased individually; only the whole
  account can be deleted.

## Cannot fix in code (do these before going live)

1. Fill `.env.production` from `.env.production.example` with fresh random secrets (`openssl rand -hex 32`)
   for both JWT keys, the Postgres and Redis passwords and S3; the API will refuse to start otherwise.
2. Rotate anything that ever held the local values in a shared environment.
3. Stripe: register `https://<api>/api/v1/billing/webhook`, copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`, subscribe to `customer.subscription.created/updated/deleted`.
4. S3: keep the bucket private (block public access), and add a lifecycle rule that deletes objects under
   `accounts/` that are never attached (signed uploads that were not saved).
5. Put TLS in front (ALB or proxy), set `TRUST_PROXY` to its addresses (`uniquelocal` on private subnets),
   and keep Postgres/Redis on private networks only.
6. Run `docker compose … run --rm migrate` on every deploy before starting the API.
7. Publish a privacy policy and terms naming a data-protection contact (LGPD encarregado) and a retention
   period for audit events and deleted accounts' backups.
8. Your local `.env` has an old `NEXT_PUBLIC_API_TOKEN` (expired JWT, unused by the code): delete it.
9. For a product holding customer pricing and contacts, commission a professional pentest after launch.
