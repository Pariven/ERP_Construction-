# BuildTrack

Construction project management MVP: projects, budget lines, schedule tasks,
variation orders (VOs), QA/QC inspections, and the full QS (quantity
surveying) workflow — Bill of Quantities, Interim Payment Certificates, Cost
Value Reconciliation, Extension of Time / LAD, Final Account, subcontractor
procurement (with payment tracking), and a document store for drawings,
contracts, and correspondence.

Three integration points do the actual work rather than just tracking data:

- **VO approval** pushes its cost impact into the linked budget line and
  shifts the linked schedule task's dates, automatically, in one transaction
  (`lib/variations.ts`).
- **IPC valuation** claims a % complete per BQ item, computes gross valuation,
  deducts retention, and nets off the previous certificate to get the amount
  due this period (`lib/bq.ts`). CVR then compares that certified value
  against actual cost (budget lines) as a standing management report.
- **EOT approval** pushes the project's contractual completion date out by
  the approved days, automatically (`lib/eot.ts`). LAD exposure is computed
  against that pushed-out date, so an approved EOT directly reduces it.

## Stack

- Next.js (App Router) + Tailwind CSS
- Prisma ORM, SQLite for local dev (zero setup — no Docker, no account)
- Recharts for the dashboard charts
- Supabase client wired in (`lib/supabase.ts`) but unused until you add
  Storage for inspection photos / VO docs — see below

## Getting started

```bash
npm install
npm run db:seed   # creates dev.db, applies the schema, loads demo data
npm run dev
```

Open http://localhost:3000 — it redirects to `/projects`, seeded with two
demo projects (Riverside Residences, Harbor Point Office Fit-Out) so the
dashboard has real numbers to show from the first run.

## Useful scripts

- `npm run db:seed` — reset and reseed demo data (safe to re-run any time)
- `npm run db:reset` — `prisma migrate reset`, wipes the SQLite DB and
  reapplies migrations (does **not** reseed automatically unless you run
  `db:seed` after)
- `npx prisma studio` — browse/edit the SQLite DB in a GUI

## Project structure

```
prisma/schema.prisma            Data model
prisma/seed.ts                  Demo data
lib/prisma.ts                   Prisma client singleton
lib/variations.ts               VO approval → budget/schedule cascade
lib/bq.ts                       BQ item amount + IPC certificate recompute logic
lib/eot.ts                      EOT approval → project end-date cascade + LAD exposure calc
lib/health.ts                   Budget/schedule health scoring shared by the project and portfolio dashboards
lib/format.ts                   Currency/date formatting + status→badge mapping
app/components/                 Shared UI: Badge, StatTile, BudgetChart, SCurveChart, ScheduleProgressList
app/rates/                      Global rate library (reused across every project's BQ)
app/projects/                   Portfolio dashboard + project list + create form (the app's home page)
app/projects/[id]/              Per-project dashboard (budget vs actual, schedule, VOs, defects)
app/projects/[id]/budget/       Budget lines table + add line
app/projects/[id]/schedule/     Schedule tasks + progress updates
app/projects/[id]/variations/   VO list + submit/approve/dispute/reject actions
app/projects/[id]/qa/           Checklist templates, inspections, defects
app/projects/[id]/bq/           Bill of Quantities — elements → bills → items, provisional/PC sums
app/projects/[id]/valuations/   Interim Payment Certificates — claim %, retention, certify
app/projects/[id]/cvr/          Cost Value Reconciliation — cost vs. value, S-curve, retention release
app/projects/[id]/eot/          Extension of Time log + LAD exposure calculator
app/projects/[id]/final-account/ Final account reconciliation (BQ + approved VOs + fluctuations)
app/projects/[id]/procurement/  Subcontractor packages — tender comparison, award, payment tracking
app/projects/[id]/documents/    Drawings, contracts, correspondence — versioned, filed by category
```

## Not built yet

**Needs a foundational piece first, not just more screen time**: an activity
log / audit trail (who changed a budget line, who approved a VO) isn't built,
and deliberately so — this app has no user/auth concept yet, so there's no
real "who" to attribute a change to. Bolting on a fake "acting as" field would
produce an audit trail that looks real but isn't trustworthy. Worth revisiting
once there's an actual auth system.

**Phase 2/3 territory per the roadmap** (workforce/equipment tracking, a
client/subcontractor portal, e-signature, notifications, BIM, an AI
assistant, deep analytics): deliberately not started — each depends on real
data the "Now" tier above should generate first. See the phased-roadmap note
for why.

## Moving to Supabase / Postgres later

Local dev runs entirely on a SQLite file (`construction-app/dev.db`) — no
external services required. When you're ready to deploy:

1. Create a Supabase project, grab its Postgres connection string.
2. In `prisma/schema.prisma`, change `datasource db { provider = "sqlite" }`
   to `provider = "postgresql"`.
3. Set `DATABASE_URL` in `.env` to the Supabase connection string, and fill
   in `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` for
   Storage (inspection photos, VO docs).
4. `npx prisma migrate dev` against the new database, then `npm run db:seed`
   if you want the demo data there too.

Nothing else in the app needs to change — everything reads/writes through
Prisma, and `lib/supabase.ts` is already guarded to no-op until those env
vars are set.
