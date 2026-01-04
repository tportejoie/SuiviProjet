## Strategy
- Move backend/domain code into `src/server` to consolidate server logic under the app and reduce cross-root imports.
- Replace deep relative imports with `@/` aliases for server APIs/services.
- Work in small, verifiable batches; after each batch, check build/tests and fix import issues immediately.

## Target (incremental)
- `src/server/` contains prisma client, server services, and API domain logic.
- `src/app/api/**` route handlers import from `@/server/**`.

## Batch 1 (completed)
- Moved `server/api` -> `src/server/api`.
- Moved `server/services` -> `src/server/services`.
- Moved `server/prisma.ts` -> `src/server/prisma.ts`.
- Updated route handlers and server modules to use `@/server/*` imports.

## Batch 2 (completed)
- Standardized Prisma imports in `src/server/**` to use `@/server/prisma`.

## Batch 3 (completed)
- Replaced relative UI imports (`../types`, `../lib/api`, `../components/*`) with `@/` aliases.

## Validation
- Tests: `npm run test` (vitest) OK.
- Functional check: snapshots flow validated end-to-end (MONTH_END, BORDEREAU_GENERATED, BORDEREAU_SIGNED, RECTIFICATIF) via local Prisma script.
