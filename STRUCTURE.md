# ClickJournal — repository structure

A pnpm + Turborepo monorepo. One repo holds several **apps** (things you run)
and **packages** (code those apps share). Everything runs locally: no Docker,
no cloud account.

## Top level

```
clickjournal/
├── apps/                  # deployable processes — things that run
├── packages/              # shared libraries — things that get imported
├── tests/integration/     # cross-package tests against in-memory Postgres (PGlite)
├── docs/                  # specs, ADRs, postmortems, runbooks (empty scaffolding + templates)
├── .github/               # CI workflow, issue forms, PR template, Copilot instructions
├── .opencode/             # OpenCode agent + skill definitions (optional AI tooling)
├── AGENTS.md              # conventions for any coding agent (CLAUDE.md just points here)
├── CONTRIBUTING.md        # issue → spec → implement → PR workflow
├── STRUCTURE.md           # this file
├── package.json           # root scripts (pnpm dev, test, build…) + shared dev tools
├── pnpm-workspace.yaml    # declares apps/* and packages/* as workspaces
├── turbo.json             # task pipeline: build/typecheck/test run deps first
├── tsconfig.base.json     # strict TS settings every workspace extends
├── vitest.config.ts       # root test runner config (tests/**)
└── .env.example           # every env var knob, all optional in local dev
```

## Apps (`apps/`)

| App | Package | What it is |
|---|---|---|
| `web/` | `@clickjournal/web` | Next.js 15 (App Router) + Tailwind 4. Pages in `app/`, API routes in `app/api/`. Ships `/` and `/api/health`. |
| `worker/` | `@clickjournal/worker` | Long-running loop that polls the `jobs` queue and dispatches on `message.type`. Add handlers in `src/index.ts`. |
| `db-server/` | `@clickjournal/db-server` | **Dev only.** Boots a real embedded Postgres on `:5433`, data in `.pgdata/`, auto-applies migrations. Replaced by `DATABASE_URL` in production. |
| `migrate/` | `@clickjournal/migrate` | One-shot CLI: apply migrations over the wire (`src/index.ts`) and seed demo data (`src/seed.ts`). |

## Packages (`packages/`)

| Package | What it owns | Used by |
|---|---|---|
| `db` | Prisma schema (`prisma/schema.prisma`), the singleton client, `applyMigrations` (at `@clickjournal/db/migrate`). Generated client lands in `src/generated/` (gitignored). | everything |
| `services` | Adapters for external services: blob storage, queue, Postgres `LISTEN/NOTIFY`. Azurite locally, real Azure when `AZURE_STORAGE_CONNECTION_STRING` is set. | web, worker |
| `domain` | Zod validation schemas + database queries. Empty today — your features go here. | **web only** |
| `auth` | `currentUserId()` — a dev stub (header → `DEV_USER_ID` → `demo-user`). Throws in production. | web |
| `log` | Shared pino logger. The bottom of the dependency graph. | everything |

## Dependency graph

```
            apps/web ─────────┬──────────┬─────────┬────────┐
                              ▼          ▼         ▼        ▼
                           domain      auth    services    log
                              │                    │        ▲
                              ▼                    │        │
apps/worker ──────────────▶  db  ◀─────────────────┼────────┤
apps/db-server ──────────▶  db                     │        │
apps/migrate ────────────▶  db                     └────────┘
                             └──────────────────────────────▶ log
```

Rules:

- **Apps never import from other apps.** Shared code moves into a package.
- **Packages reference each other with `"@clickjournal/<name>": "workspace:*"`.**
- **`domain` and `auth` are web-only.** The worker gets already-validated data
  from queue messages and talks to `db` directly.
- **Import Prisma from `@clickjournal/db`, never `@prisma/client`.** Same for
  cloud SDKs: go through `@clickjournal/services`.

## The "seam" idea

Every external dependency has a local default and a production switch set by
one env var — the code doesn't change:

| Dependency | Local (default) | Tests | Production |
|---|---|---|---|
| Postgres | `apps/db-server` on `127.0.0.1:5433` | PGlite in memory (`PGLITE_DATA_DIR`) | `DATABASE_URL` |
| Blob + queue | Azurite (`.azurite/`) | — | `AZURE_STORAGE_CONNECTION_STRING` |
| Identity | `auth` dev stub | header / env | real auth (not built yet) |

The three database doors live in `packages/db/src/client.ts`.

## What `pnpm dev` starts

```
pnpm dev
├── turbo dev (parallel, all workspaces except migrate)
│   ├── web        → http://localhost:3000
│   ├── worker     → polls the jobs queue
│   └── db-server  → Postgres :5433, runs pending migrations
└── azurite        → local blob + queue emulator
```

Sanity check: `http://localhost:3000/api/health` → `{"status":"ok","db":"ok"}`.

## Where a new feature's code goes

1. **Model** — add to `packages/db/prisma/schema.prisma`, create a migration,
   `pnpm prisma:generate`. Migrations are append-only.
2. **Validation + queries** — `packages/domain/src/`, exported from `index.ts`.
   Every query takes the current user id.
3. **HTTP / UI** — `apps/web/app/api/<route>/route.ts` and `apps/web/app/<page>/`.
4. **Background work** — enqueue from web via `@clickjournal/services`, handle
   in `apps/worker/src/index.ts`.
5. **Tests** — package unit tests in `packages/<name>/tests/`; cross-package
   tests in `tests/integration/` (PGlite, no services needed).
6. **Docs** — spec at `docs/specs/<domain>/<feature>.md` from
   `docs/specs/_template-feature.md`, in the same PR.

## Docs folder

```
docs/
├── specs/         # how the system behaves (evergreen) — _template-feature.md, _template-infrastructure.md
├── adr/           # why we decided X (write-once)
├── postmortems/   # fixed-bug history (write-once) — _template.md
└── runbooks/      # what to do when it breaks — _template.md
```

## Local-only state (gitignored, never commit)

`.pgdata/` (dev database), `.azurite/` (storage emulator), `.env*`,
`packages/db/src/generated/`, `.next/`, `.turbo/`, `node_modules/`.

## Commands

| Command | What it does |
|---|---|
| `pnpm install` | Install all workspaces |
| `pnpm prisma:generate` | Regenerate the typed DB client after schema changes |
| `pnpm dev` | web + worker + Postgres + Azurite |
| `pnpm test` | Unit + integration tests (no services needed) |
| `pnpm typecheck` / `pnpm build` | What CI runs, with `test` |
| `pnpm db:migrate` | Apply migrations over the wire |
| `pnpm db:reset` | Delete `.pgdata/`; restart dev to re-create |
