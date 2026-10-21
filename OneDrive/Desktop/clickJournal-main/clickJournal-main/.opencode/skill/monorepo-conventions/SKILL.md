---
name: monorepo-conventions
description: Use when reasoning about the monorepo structure, package boundaries, or where new code belongs. The architecture of the ClickJournal monorepo.
---

# Monorepo Conventions

This is a pnpm + Turborepo monorepo. Code is split into apps (deployable) and packages (shared).

## Apps (deployable processes)
- `apps/web` — Next.js app. Uses `@clickjournal/db`, `@clickjournal/services`, `@clickjournal/domain`, `@clickjournal/auth`, `@clickjournal/log`.
- `apps/worker` — background worker. Uses `@clickjournal/db`, `@clickjournal/services`, `@clickjournal/log`. Does NOT use `@clickjournal/domain` or `@clickjournal/auth` (today).
- `apps/db-server` — dev-only Postgres host. Uses `@clickjournal/db`, `@clickjournal/log`. Replaced by Azure Postgres in production.
- `apps/migrate` — migration CLI + seed. Uses `@clickjournal/db`.

## Packages (shared libraries)
- `@clickjournal/db` — Prisma schema, migrations, generated client, `applyMigrations`. Imported by all apps.
- `@clickjournal/services` — Azure adapters (queue, storage, notify). Imported by web and worker.
- `@clickjournal/domain` — Zod schemas and queries. Web-only.
- `@clickjournal/auth` — `currentUserId()` dev stub; web-only today. Replaced with real auth in Week 8.
- `@clickjournal/log` — pino wrapper. Imported by all packages and apps.

## Rules
- Apps never import from other apps.
- Packages depend on each other via `workspace:*` only.
- The Prisma client is imported from `@clickjournal/db` only — never from `@prisma/client` directly.
- `@clickjournal` is the workspace package scope.
