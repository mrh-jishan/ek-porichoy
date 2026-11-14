# এক পরিচয় · Ek Porichoy

**One NID. Every entitlement. No new cards.**

Ek Porichoy is a full-stack prototype of a national social-protection platform for Bangladesh. It replaces
~90 programme-specific cards with the existing NID: it links registries, computes eligibility
from published rules, detects leakage, and pays citizens directly through banks and MFS.

**Live demo:** https://ekporichoy.online360.org (demo mode: the OTP is shown on screen, and all data is synthetic)

> Prototype for public-policy demonstration. It is not an official government service.

## Stack
Next.js 16 (App Router, RSC, Server Actions) · TypeScript · Turborepo + pnpm · PostgreSQL + Drizzle ·
Better-Auth (RBAC, phone OTP, admin) · next-intl (বাংলা / English) · Tailwind v4 · Motion ·
TanStack Query · Zustand · Recharts · Zod

## Quick start
```bash
cp .env.example .env              # set DATABASE_URL, BETTER_AUTH_SECRET (openssl rand -base64 32)
docker compose up -d              # Postgres on :5433 (or use any local Postgres)
pnpm install
pnpm db:reset                     # create schema + seed ~3,300 citizens and their history
pnpm dev                          # http://localhost:3000
```

## Demo accounts
Staff password: `Demo@2026!`

| Role | Email |
|---|---|
| Super admin | admin@ekporichoy.test |
| Auditor (read-only) | auditor@ekporichoy.test |
| Programme manager | pm@ekporichoy.test |
| Field officer (Dhaka) | officer@ekporichoy.test, officer2@ekporichoy.test |
| Payer | bkash@, nagad@, rocket@, sonali@ ekporichoy.test |

Citizens sign in with NID + date of birth. The OTP is shown on screen in development.

| NID | DOB | Story |
|---|---|---|
| 1990000001 | 14/03/1956 | Widow on old-age allowance, with payment history |
| 1990000002 | 02/07/1979 | Poor farmer, eligible but excluded, can self-apply |
| 1990000003 | 20/11/1975 | Affluent TCB card holder, flagged by the integrity scan |

## A five-minute walkthrough
1. **Citizen 1990000002**: see eligibility with reasons, then apply for Farmer Input Support.
2. **officer@**: approve it in the verification queue (maker–checker: you can't approve your own proposal).
3. **pm@**: Programmes, then generate this month's TCB batches. Flagged and deceased recipients are blocked automatically.
4. **admin@**: Disbursements, then approve and dispatch. Under Integrity, confirm a flag. Under Audit trail, verify the hash chain.
5. **bkash@**: open the dispatched batch, mark a payment failed, then confirm settlement.

## CI/CD and deployment
GitHub Actions (`.github/workflows/ci-cd.yml`) deploys to Vercel through the Vercel CLI. Vercel's own Git auto-deploy is disabled, so every deploy goes through CI.

| Trigger | What happens |
|---|---|
| Pull request | Typecheck, unit tests, migrate + seed a Postgres service container, production build, then a **preview** deploy with the URL posted on the PR |
| Push to `main` | The same checks, then **migrations on Neon**, then a **production** deploy |
| Manual run (`seed: true`) | Seeds the production database with demo data (skipped if it already has data) |

Required repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
Vercel environment: `DATABASE_URL` / `DATABASE_URL_UNPOOLED` (Neon), `DB_PGBOUNCER=true`, `BETTER_AUTH_SECRET`,
`BETTER_AUTH_URL`, `PAYER_WEBHOOK_SECRET`, `DEMO_MODE=true`.

## Scripts
`pnpm typecheck` · `pnpm test` (domain unit tests + i18n key parity) · `pnpm build` · `pnpm db:migrate` · `pnpm db:reset`

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for design decisions, IAM, and the plan for scaling to 200 M people.
