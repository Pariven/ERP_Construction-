# BuildTrack

Construction project management MVP: projects, budget lines, schedule tasks,
variation orders (VOs), and QA/QC inspections — with VO approval wired to
automatically update the linked budget line and schedule task, in one
transaction (see `lib/variations.ts`).

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
prisma/schema.prisma          Data model
prisma/seed.ts                Demo data
lib/prisma.ts                 Prisma client singleton
lib/variations.ts             VO approval → budget/schedule cascade (the core integration)
lib/format.ts                 Currency/date formatting + status→badge mapping
app/components/               Shared UI: Badge, StatTile, BudgetChart, ScheduleProgressList
app/projects/                 Project list + create form
app/projects/[id]/            Dashboard (budget vs actual, schedule, VOs, defects)
app/projects/[id]/budget/     Budget lines table + add line
app/projects/[id]/schedule/   Schedule tasks + progress updates
app/projects/[id]/variations/ VO list + submit/approve/dispute/reject actions
app/projects/[id]/qa/         Checklist templates, inspections, defects
```

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
