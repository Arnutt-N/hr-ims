# Implementation Report: Dashboard Performance Optimization

## Summary
Reduced dashboard page-load cost by slimming the NextAuth `jwt` callback to a single lightweight DB select, memoizing `auth()` per request via React `cache()`, caching frontend `Settings` reads with `unstable_cache` + targeted invalidation, adding a Prisma index on `RolePermission.roleId`, pausing `NotificationBell` polling when the tab is hidden, and wiring `tokenVersion` bumps into every role/permission mutation to keep revocation correct.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Large | Large |
| Confidence | 8/10 | 8/10 (one Next.js 16 API gotcha discovered at build time) |
| Files Changed | ~12 | 16 code files + 2 new helpers + 1 TiDB migration + plan/report |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Slim `jwt` callback — move roles/permissions fetch to `authorize`, lightweight select in `jwt` | Complete | `auth.ts`: `buildAuthenticatedUser()` loads full payload at login; `jwt` only selects `{role, status, tokenVersion}` |
| 2 | `getCachedAuth` via React `cache()` + swap callers | Complete | `lib/auth-cache.ts` created; swapped in `layout`, `dashboard`, `logs`, `requests`, plus `audit.ts`, `dashboard.ts` (extra files caught during implementation) |
| 3 | Header receives `session` via prop | Complete | `header.tsx` now `async function Header({ session })` |
| 4 | `getCachedSettings` via `unstable_cache` | Complete | `lib/settings-cache.ts` created, TTL 3600s, tag `settings` |
| 5 | Tag invalidation on settings update | Complete — DEVIATION | Plan called for `revalidateTag('settings')`; Next.js 16 now requires 2-arg signature. Replaced with **`updateTag('settings')`** (1-arg, designed for Server Actions with read-your-own-writes). See Deviations. |
| 6 | Add `@@index([roleId])` on `RolePermission` | Complete | `schema.prisma:517`; applied to TiDB Cloud via `prisma db execute` with idempotent SQL |
| 7 | `NotificationBell` visibility gating | Complete | `startPolling()` guarded by `!document.hidden`, resumes on `visibilitychange` |
| Req. mitigation | Bump `tokenVersion` on role/permission mutations | Complete | `lib/actions/users.ts` + `lib/actions/permissions.ts` increment `tokenVersion` on role changes |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis (`tsc --noEmit`) | Pass | Zero errors |
| Lint (`npm run lint`) | Pass | Zero errors |
| Frontend Tests (`vitest --run`) | Inconclusive | Pre-existing vitest pool infrastructure issue on Windows: "Timeout waiting for worker to respond" — `no tests` ran, exit 0. NOT a regression from this plan. Should be fixed separately. |
| Backend Tests (`jest`) | 106 failed / 45 passed | Pre-existing failures in stock/reserved logic (`createRequest.test.ts`: "Stock level not found for item Pen in warehouse Central Warehouse"). These originate from commit `f778360 feat(requests): implement reserve stock for pending requests` and are NOT caused by this plan. Plan only touched the schema by adding one index. |
| Frontend Build (`next build`) | Pass | Caught the `revalidateTag` API change; fixed; clean rebuild |
| TiDB Migration | Pass | Both `StockLevel.reserved` and `RolePermission_roleId_idx` applied; idempotent re-run confirms; `SELECT SUM(reserved)` + `FORCE INDEX` smoke test passed |

## Files Changed

| File | Action | Notes |
|---|---|---|
| `backend/prisma/schema.prisma` | UPDATED | `@@index([roleId])` on `RolePermission` |
| `backend/prisma/migrations/manual/2026-04-14_tidb_sync.sql` | CREATED | Idempotent SQL with `information_schema` guards for `StockLevel.reserved` + `RolePermission_roleId_idx` |
| `backend/prisma/migrations/manual/verify.sql` | CREATED | Smoke test queries (fail fast if changes missing) |
| `frontend/next-app/auth.ts` | UPDATED | `authorize` returns full user; `jwt` does lightweight select only |
| `frontend/next-app/lib/auth-cache.ts` | CREATED | `getCachedAuth = cache(() => auth())` |
| `frontend/next-app/lib/settings-cache.ts` | CREATED | `unstable_cache(prisma.settings.findFirst, …, { tags: ['settings'], revalidate: 3600 })` |
| `frontend/next-app/app/(dashboard)/layout.tsx` | UPDATED | `Promise.all([getCachedAuth(), getCachedSettings()])`, passes `session` to Header |
| `frontend/next-app/components/layout/header.tsx` | UPDATED | Accepts `session` prop, no internal `auth()` |
| `frontend/next-app/components/layout/notification-bell.tsx` | UPDATED | `startPolling/stopPolling`, `visibilitychange` listener, initial fetch preserved |
| `frontend/next-app/app/(dashboard)/dashboard/page.tsx` | UPDATED | `getCachedAuth()` |
| `frontend/next-app/app/(dashboard)/logs/page.tsx` | UPDATED | `getCachedAuth()` |
| `frontend/next-app/app/(dashboard)/requests/page.tsx` | UPDATED | `getCachedAuth()` inside `Promise.all` destructure |
| `frontend/next-app/lib/actions/audit.ts` | UPDATED | `auth()` → `getCachedAuth()` |
| `frontend/next-app/lib/actions/dashboard.ts` | UPDATED | `auth()` → `getCachedAuth()` |
| `frontend/next-app/lib/actions/requests.ts` | UPDATED | `auth()` → `getCachedAuth()` |
| `frontend/next-app/lib/actions/settings.ts` | UPDATED | `updateTag('settings')` (Next.js 16 API) + `revalidatePath('/settings')` |
| `frontend/next-app/lib/actions/users.ts` | UPDATED | `tokenVersion: { increment: 1 }` on role changes |
| `frontend/next-app/lib/actions/permissions.ts` | UPDATED | Bulk `tokenVersion` bump on role/permission mutations |
| `frontend/next-app/lib/auth-guards.ts` | UPDATED | Adjusted for new session shape with `roles[]` + `permissions[]` |
| `frontend/next-app/types/next-auth.d.ts` | UPDATED | Extended Session/User with `roles`, `permissions`, `tokenVersion` |
| `.claude/PRPs/plans/dashboard-performance-optimization.plan.md` | CREATED | Source plan (revised, merged with CodeX independent analysis) |
| `.claude/PRPs/reports/dashboard-performance-optimization-report.md` | CREATED | This report |

## Deviations from Plan

1. **`revalidateTag` → `updateTag`** — Next.js 16 changed `revalidateTag` to require a second `profile` argument. The new `updateTag(tag)` function is the 1-arg replacement intended for Server Actions (provides read-your-own-writes semantics). Discovered during `next build`. Plan updated with a Next.js 16 GOTCHA line.

2. **Extra files swapped to `getCachedAuth`** — The plan listed 4 dashboard pages; the actual implementation also swapped `lib/actions/audit.ts`, `lib/actions/dashboard.ts`, `lib/actions/requests.ts`. These additions are consistent with the plan's intent (stop redundant `auth()` calls) and are welcome.

3. **TiDB migration mechanism** — Plan assumed `prisma migrate dev` / `prisma db push` from the backend workspace. Actual: schema provider is `sqlite` (local), so `prisma db push` cannot target MySQL/TiDB. Used `prisma db execute --url … --file …` with an idempotent SQL file guarded by `information_schema` lookups. Also bundled `StockLevel.reserved` (pending from prior commit) into the same sync file at user's request.

## Issues Encountered

1. **Windows vitest forks pool timeout** — frontend test runner failed to start worker processes (pre-existing, unrelated to this plan). Exit code misleadingly 0. Needs separate investigation.

2. **Backend test suite has 106 failing tests** — pre-existing, related to the stock-reserved feature (`createRequest.test.ts` + related). Traced to commit `f778360`, not this plan. Out of scope for this work but should be tracked.

3. **TiDB SSL required** — plain URL rejected with "Connections using insecure transport are prohibited". Fixed by appending `?sslaccept=strict` to the connection string at execute time (not committed to any tracked file).

4. **Secret hygiene** — TiDB credentials live only in `secrets/secret-keys.txt` which is `.gitignore`d and has never been tracked. No credentials were written to any committed file during this work.

## Tests Written
No new tests were added in this session. Existing tests were used for regression signal. Behavioral edge cases from the plan (tokenVersion revoke, visibility polling, settings cache invalidation) remain candidates for follow-up test additions.

## Next Steps
- [ ] Commit + push + open PR (in progress)
- [ ] Investigate vitest forks pool timeout on Windows
- [ ] Triage backend stock-reserved test failures (pre-existing, commit `f778360`)
- [ ] Add unit tests for `getCachedAuth`, `getCachedSettings`, NotificationBell visibility gating
- [ ] Measure actual query count in staging with `prisma.$on('query', …)` to confirm steady-state ≤2 DB hits per dashboard page view
