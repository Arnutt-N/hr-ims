# Playwright Baseline — DEFERRED

**Status**: not run. Suite presence verified.

## Reason

Running the full Playwright suite requires three dependencies not present in this sandbox:

1. **Browser binaries** — `~/.cache/ms-playwright/` is empty. Need `npx playwright install chromium` (~150 MB download).
2. **Live Next.js dev server** — `playwright.config.ts` auto-starts `npm run dev` with a 180s timeout, but the SQLite DB at `backend/prisma/dev.db` would need to be seeded first.
3. **Seeded test users** — existing specs (`tests/e2e/superadmin-rbac.spec.ts`, `login-debug.spec.ts`) reference accounts that come from `backend/prisma/seed.ts`.

## Suite presence

Confirmed via `ls frontend/next-app/tests/e2e/`:
- `example.spec.ts`
- `locale-verify.spec.ts`
- `login-debug.spec.ts`
- `responsive-tour.spec.ts`
- `screenshot-tour.spec.ts`
- `superadmin-rbac.spec.ts`

Total: **6 specs** (baseline; Phase D adds 8 golden-path specs to `tests/e2e/golden/`).

Playwright version: `1.59.1`. Config projects: `chromium`, `Mobile Chrome` (Pixel 5).

## To unblock (run before Phase D)

```bash
npx playwright install --with-deps chromium
cd backend && npx prisma db push && npx prisma db seed
cd frontend/next-app && npx playwright test
```

Result will be archived as `playwright-report.zip` in this folder.
