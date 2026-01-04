## As-is
- Framework: Next.js 14 App Router in `src/app`, React 18, TypeScript, Tailwind.
- API: Next.js route handlers in `src/app/api/**` delegating to domain logic in `server/api/**`.
- DB: Prisma + PostgreSQL (`prisma/schema.prisma`), migrations in `prisma/migrations`.
- Auth: email/password with bcrypt, session table, httpOnly cookie in `src/server/auth.ts`; admin bootstrap via `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- Domain: time entry imputation, month close with period locks, bordereau generation/signed snapshots, PDF via Playwright, file storage to local `storage/`.
- Tests: vitest unit tests in `tests/` (hours->days, locks, snapshots).
- Repo layout: app lives under `apps/web` with `src/`, `server/`, `prisma/`, `tests/`; root has `README.md`, `DOKPLOY.md`, `docker-compose.yml`.

## Pain points
- Mixed server code locations (`server/**` outside `src/` and `src/server/**`), causing `../../server/*` imports and split mental model.
- No shared packages or workspace setup yet; hard to extract domain/db logic cleanly.
- Paths: alias only for `src/*`; server and prisma code use relative paths.
- Docs for deploy/auth are at repo root only; no dedicated `docs/` structure inside the app.
- Storage, scripts, and runtime concerns are co-located with UI code, increasing coupling.

## To-be
- Consolidate backend/domain code into a clear package or `src/server` and eliminate `../../..` imports with aliases like `@/`, `@db`, `@domain`.
- Introduce workspace structure (root `package.json` + workspace config) to support `packages/db`, `packages/domain`, etc.
- Keep Next.js as the single full-stack app (no separate API service).
- Keep Postgres + Prisma; ensure migrations run on deploy (`prisma migrate deploy`).
- Document deploy (Dokploy), auth, and restructure steps under a `docs/` folder.

## Risks
- Import path regressions after moving files. Mitigation: move in small batches, update TS paths, run build/tests after each batch.
- Next.js server/client boundary issues (server-only code in client components). Mitigation: keep server logic in route handlers/services, verify `runtime = "nodejs"` where needed.
- Prisma client location changes can create multiple instances. Mitigation: keep singleton pattern and verify during move.
- Storage/PDF paths could break in Docker. Mitigation: keep `FILE_STORAGE_PATH` and volume mapping consistent in Dockerfile/Docs.
