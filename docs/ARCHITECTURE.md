# Ek Porichoy — Architecture

> **One NID instead of ninety cards.** An interoperability platform that links the existing EC NID
> server with banks, MFS, land, tax, utility and health registries so that eligibility is computed,
> fraud is detected and money is paid directly, without printing new cards.

## 1. Problem → design response

| Finding (status quo) | Design response in this codebase |
|---|---|
| 90 programmes / 25 ministries, each with its own card | One `programs` table + **rules-as-data** (`packages/domain/eligibility.ts`). A new programme is a JSON rule set, not a card, survey or code change. |
| 5.7 M of 10 M TCB cards fake/duplicate | `unique(nid, program_id)` makes duplicate enrolment structurally impossible; legacy cards are matched to NIDs (`matchLegacyCards`) and ghosts are retired. |
| ৳637 cr poverty survey unusable | No survey: `person_signals` is populated from **linked registries** (NBR, land, utility, BRTA, DGHS) keyed by NID, with per-field provenance (`sources`). |
| 62 % of poor excluded | Outreach finder (`excludedEligible`) ranks eligible-but-unserved citizens by need. Citizens can also self-apply. |
| 31 % of rich included | Universal **affluence guard** applied to every poverty-targeted programme, plus integrity flags that block payment. |
| Bribery by middlemen | Direct-to-account G2P via bank/MFS, citizen grievance channel visible to auditors, maker–checker everywhere, hash-chained audit. |
| Ministries not coordinating (Family card vs Farmer card vs "Ek ID") | One platform and one RBAC matrix. Each ministry is a tenant of the same rule engine and payment rail. |

## 2. Monorepo layout (Turborepo + pnpm, modular monolith)

```
apps/web            Next.js 16 (App Router, RSC, Server Actions, next-intl, Better-Auth handler)
packages/domain     Pure TS business rules — no I/O. Roles, RBAC matrix, eligibility engine,
                    fraud detectors, batch state machine, audit hash chain. Unit-tested.
packages/db         Drizzle schema + pooled client (postgres-js). Single schema source.
packages/core       Application services (use-cases) — the ONLY layer that touches the DB.
                    Takes an `Actor`, re-checks permissions (defense in depth), writes audit atomically.
packages/auth       Better-Auth config (admin + phoneNumber plugins), AC derived from domain RBAC.
packages/i18n       bn/en catalogues, typed keys, Bangla-numeral formatters, parity check.
packages/ui         Design system (flag-derived tokens, components, Motion primitives).
packages/seed       Realistic simulation of the leaky status quo, driven through core services.
```

Dependency direction is strictly one-way: `web → core → db → domain` and `auth → db/domain`.
`domain` depends on nothing, so it can be reused in workers, a mobile backend, or a future
microservice extraction without change.

### DRY seams (one place for each concern)

| Concern | Single source |
|---|---|
| Who can do what | `domain/permissions.ts` → Better-Auth AC, `defineAction`, core `authorize()`, sidebar nav |
| Server-action plumbing | `web/server/action.ts::defineAction` (auth → permission → Zod → service → error key → revalidate) |
| Form UX (pending, toast, i18n errors) | `web/components/action-form.tsx` |
| Status colours | `web/lib/status.ts` + `<StatusBadge/>` |
| Portal chrome / gating | `portalLayout(portal)` + `requirePortal(portal)` |
| Number, money and date formatting | `i18n/index.ts` (`formatMoney`, `formatCrore`, `formatPeriod`) |
| Tables | `ui/DataTable` (+ `BatchTable` shared by the payer and admin portals) |

## 3. State management

| Kind of state | Tool | Example |
|---|---|---|
| Server data (read) | React Server Components | every dashboard and list |
| Server mutations | Server Actions + `revalidatePath` | approve, settle, apply |
| Client-cached server data | **TanStack Query** | officer NID lookup (cached per NID, invalidated after enrolment) |
| Shareable UI state | URL search params | `?status=open`, `?nid=…` |
| Local UI preferences | **Zustand** (persisted) | text size, high contrast, mobile sidebar |

## 4. Identity & access management

* **Citizens:** NID + date of birth (knowledge factor, checked against the EC record), then an OTP
  sent **only to the EC-registered phone** (possession factor). On first verification Better-Auth
  creates the identity, and a DB hook binds it to the NID that owns the phone. A citizen can never
  choose which NID they are.
* **Staff:** email + password, provisioned by admins only (`disableSignUp`). Sessions last 8 h.
  Better-Auth rate limits apply (5 sign-in attempts per minute).
* **Scopes:** `jurisdiction` (division) for officers, `payerOrg` for bank/MFS desks. Enforced in
  core queries, not just the UI.
* **Roles:** `citizen · field_officer · program_manager · payer · auditor · super_admin`.
  The auditor is read-only by construction (no mutating grants).
* **Maker–checker:** enrolments (proposer ≠ verifier) and batches (creator ≠ approver).
* **Machine identities:** payer callbacks use HMAC-SHA256 with timestamp and a replay window.
  Production should add per-payer keys in KMS/HSM and mTLS.
* **Identity admin:** suspend/restore through Better-Auth's admin plugin, audited.
* **Federation path:** add an OIDC provider (EC / national SSO) as a Better-Auth social/generic-OAuth
  provider. The `Actor` contract stays the same.

## 5. Integrity pipeline

```
registries ──► person_signals ──► eligibility (rules + affluence guard)
                                     │
enrolments ──► detectFindings() ──► fraud_flags (idempotent fingerprint)
                                     │ high severity
                                     ▼
generateBatches()  INSERT…SELECT excludes deceased, non-KYC, flagged  ──► payer
```
Every state change appends to `audit_log` **in the same transaction** (advisory-locked hash
chain, canonical JSON). Auditors can verify the chain from the UI.

## 6. Scaling to 200 million people

The MVP runs on one Postgres. The national deployment keeps the same code and boundaries and
changes the infrastructure underneath:

| Layer | National-scale plan |
|---|---|
| **Web tier** | Stateless Next.js (`output: "standalone"`) behind a load balancer. Scale out horizontally in Bangladesh DCs (BDCCL/Tier-IV), with a CDN for static and ISR pages. |
| **Sessions / rate limits** | Better-Auth `secondaryStorage` on Redis Cluster, so limits and cookie-cache hold across all replicas. |
| **Database** | Postgres 18 + PgBouncer (transaction mode; `DB_PGBOUNCER=true` disables prepared statements). Read replicas serve dashboards and lookups. `disbursements` is **RANGE-partitioned by `period`** and HASH sub-partitioned by `nid` (≈ 200 M × 12 rows/yr). `audit_log` is partitioned by month. Citus or regional shards keyed by `nid` hash if one primary saturates. |
| **Batch generation** | Already set-based (`INSERT … SELECT`). At scale it runs per division and partition inside queue workers (BullMQ or Temporal), with checkpoints and idempotency through `unique(batch_id, enrollment_id)`. |
| **Integrity scans** | Per-row detectors run per partition in workers. Group detectors (shared accounts) run as SQL aggregates. Nightly plus event-driven (a death registration triggers a re-scan of that NID). |
| **Registry sync** | CDC/API adapters (EC, NBR, land, utilities, BRTA, DGHS) write to `person_signals` with provenance. Outbox + workers handle delivery. |
| **Analytics** | Materialised views or a columnar replica (ClickHouse) refreshed by workers. The OLTP primary never serves national aggregates per request. |
| **Audit** | Sharded hash chains (per region or day) anchored into a daily root hash published for public verifiability. DB role has `REVOKE UPDATE, DELETE`. |
| **Messaging** | Transactional `outbox` → SMS gateway (A2P) and payer dispatch, at-least-once delivery with idempotent consumers. |
| **Observability** | OpenTelemetry traces (Next supports it natively), `/api/v1/health` for probes, SLOs on lookup and settlement latency. |
| **Security** | CSP/HSTS headers, field-level encryption for NID and phone at rest (pgcrypto/KMS), masked NIDs in every non-owner view, data-protection-act alignment. |

Capacity sketch: 200 M citizens, ~50 M beneficiaries, monthly payout ≈ 50 M rows/period →
~600 M rows/yr in `disbursements` across 12 monthly partitions × 64 hash sub-partitions ≈ 780 K
rows per leaf partition per year, which stays comfortably in Postgres territory.

## 7. What is simulated in this MVP

* The EC/registry feeds (seeded data stands in for CDC adapters).
* The SMS gateway (OTP is written to `outbox` and shown on screen in development).
* Payer core-banking (UI and signed callback are real; no money moves).
