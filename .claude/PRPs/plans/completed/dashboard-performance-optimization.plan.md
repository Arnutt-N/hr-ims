# Plan: Dashboard Performance Optimization (Auth Query Reduction + Settings Cache)

## Summary
Reduce dashboard page-load cost by cutting redundant NextAuth JWT database queries from 2→1 per call, eliminating repeated `auth()` invocations inside a single request via React `cache()`, caching `Settings` lookups in the frontend with `unstable_cache`, adding a single Prisma index for `RolePermission.roleId`, and pausing `NotificationBell` polling when the tab is hidden.

## User Story
As an authenticated HR-IMS user, I want dashboard pages to load faster and put less load on the database, so that navigation feels instant and TiDB/serverless cost stays low.

## Problem → Solution
**Current (measured via code read):** Rendering one dashboard page triggers `auth()` three times (layout + header + page), each firing ≥2 Prisma queries in `jwt` callback (user+roles+permissions), plus a separate `prisma.settings.findFirst()` in the layout — totaling **≥7 DB round-trips per page view** before any feature logic runs.

**Target:** **≤2 DB round-trips per page view** in the steady state — one lightweight `tokenVersion`/`status` check in `jwt` and one cached `settings` read (revalidated only on update).

## Metadata
- **Complexity**: Large (spans auth, caching, schema, client polling; 10+ files; staged in 6 phases)
- **Source PRD**: N/A — originated from user's free-form 6-phase plan, revised per verification findings on 2026-04-14
- **PRD Phase**: N/A
- **Estimated Files**: ~12 files touched across 6 phases

### Plan Revisions Applied (from verification analysis)
1. **Phase 1 scope clarified**: Reduce `jwt` callback from **2 queries → 1 query** (not 3→1). The third query (`ensureUserHasPrimaryRole`) only fires for legacy users with empty `roles`; it is rare in steady state.
2. **Phase 4 scope trimmed**: Add only `@@index([roleId])` on `RolePermission`. The composite `@@unique([role, menu])` already provides a usable leading-column index for `role` — adding `@@index([role])` would be redundant.

---

## UX Design

### Before
```
┌─ User clicks "Inventory" in sidebar ─┐
│  ...waits ~500-900ms (serverless      │
│  cold start + 7 DB queries)...        │
│  Page renders                         │
└───────────────────────────────────────┘
```

### After
```
┌─ User clicks "Inventory" in sidebar ─┐
│  ...waits ~150-300ms (1-2 DB          │
│  queries, cached session+settings)... │
│  Page renders                         │
└───────────────────────────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Dashboard navigation | 7+ DB queries / page | 1-2 DB queries / page | Token-only check in jwt + cached auth() + cached settings |
| Session revoke | Works (tokenVersion mismatch logs out) | Works unchanged | Revoke check kept — do NOT remove |
| Settings update | `revalidatePath('/settings')` only | `revalidatePath('/settings')` + `revalidateTag('settings')` | Frontend cache must be invalidated on write |
| Notification polling | Every 60s always | Every 60s only when tab visible | Reduces background load on backend |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `frontend/next-app/auth.ts` | 1-171 | Core jwt/session callback we are rewriting |
| P0 | `frontend/next-app/app/(dashboard)/layout.tsx` | 1-34 | Calls `auth()` + direct `prisma.settings.findFirst()` |
| P0 | `frontend/next-app/components/layout/header.tsx` | 1-37 | Second independent `auth()` call — must receive session via props |
| P0 | `backend/prisma/schema.prisma` | 506-518 | `RolePermission` model — add `@@index([roleId])` |
| P1 | `frontend/next-app/app/(dashboard)/dashboard/page.tsx` | 7-11 | Third independent `auth()` in same request |
| P1 | `frontend/next-app/app/(dashboard)/logs/page.tsx` | 17-21 | Fourth independent `auth()` in same request |
| P1 | `frontend/next-app/app/(dashboard)/requests/page.tsx` | 13-17 | Fifth independent `auth()` — called inside `Promise.all([..., auth(), ...])` destructure |
| P1 | `frontend/next-app/lib/actions/settings.ts` | 66-96 | Settings update path — add `revalidateTag('settings')` |
| P1 | `frontend/next-app/lib/role-sync.ts` | full | `ensureUserHasPrimaryRole` migrated to one-shot / authorize-time |
| P1 | `frontend/next-app/lib/role-access.ts` | full | `getRoleList` normalization helper — must keep behavior identical |
| P2 | `frontend/next-app/components/layout/notification-bell.tsx` | 1-60 | Polling logic — add `document.hidden` gating |
| P2 | `backend/src/utils/settings.ts` | 1-85 | Existing backend 60s cache pattern to mirror TTL choice |
| P2 | `frontend/next-app/auth.config.ts` | 1-? | Holds `authorized` callback — do NOT break middleware guard |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Next.js 16 `unstable_cache` | https://nextjs.org/docs/app/api-reference/functions/unstable_cache | Supports `tags` + `revalidateTag` for targeted invalidation; survives across requests on the server |
| React `cache()` | https://react.dev/reference/react/cache | Memoizes a function call per-request in React Server Components; exactly matches our "call `auth()` 3x per request" problem |
| NextAuth v5 session strategy | https://authjs.dev/concepts/session-strategies#jwt | Returning `null` from `jwt` callback revokes the session — we must preserve this for `tokenVersion` mismatch |

**GOTCHA**: `unstable_cache` keys include serialized arguments. `prisma.settings.findFirst()` has no args, so the key is stable — good for caching, but means ANY settings record change (even unrelated columns) needs the tag-based invalidation, not path-based.

---

## Patterns to Mirror

### ROLE_NORMALIZATION (existing helper — use unchanged)
```ts
// SOURCE: auth.ts:110-113 — already calls lib/role-access.getRoleList
const normalizedRoles = getRoleList({
    roles,
    role: userDb.role || fallbackRole,
});
```

### SESSION_SHAPE (existing — preserve exactly)
```ts
// SOURCE: auth.ts:160-166
session.user.id = typeof token.id === 'string' ? token.id : '';
(session.user as any).role = sessionRole;
(session.user as any).roles = sessionRoles;
(session.user as any).permissions = Array.isArray(token.permissions) ? ... : [];
(session.user as any).tokenVersion = typeof token.tokenVersion === 'number' ? token.tokenVersion : 1;
```

### TOKEN_REVOCATION (must keep — do NOT remove)
```ts
// SOURCE: auth.ts:87-95
if (!userDb || userDb.status !== 'active') { return null; }
if (typeof token.tokenVersion === 'number' && token.tokenVersion !== userDb.tokenVersion) {
    console.log('Session revoked via tokenVersion mismatch');
    return null;
}
```

### BACKEND_SETTINGS_CACHE (reference for TTL choice)
```ts
// SOURCE: backend/src/utils/settings.ts:10-24
let settingsCache: Settings | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 นาที
// ...
if (settingsCache && (now - cacheTimestamp) < CACHE_TTL) return settingsCache;
```
Use the **same 60s default** but extend to 1 hour with tag-based invalidation in frontend (we can invalidate precisely on update, so TTL only guards against external writes).

### SERVER_ACTION_INVALIDATION (extend this pattern)
```ts
// SOURCE: frontend/next-app/lib/actions/settings.ts:87-89 (current)
revalidatePath('/settings');
return { success: true, settings: payload.settings || validated };
```
Add one line: `revalidateTag('settings')` before return.

### PRISMA_INDEX_PATTERN
```prisma
// SOURCE: schema.prisma:541-546 (existing convention)
  @@index([userId])
  @@index([action])
  @@index([entity])
  @@index([createdAt])
```
New line to add in `model RolePermission { ... }`:
```prisma
  @@index([roleId])
```

### CLIENT_POLLING_WITH_VISIBILITY (new pattern to introduce)
```ts
// SOURCE: pattern adapted from MDN Page Visibility API
useEffect(() => {
  fetchData(); // initial fetch must NOT be gated

  const interval = setInterval(() => {
    if (document.hidden) return; // skip when tab hidden
    fetchData();
  }, 60000);

  // optional: refresh on return-to-visible
  const onVisible = () => { if (!document.hidden) fetchData(); };
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  };
}, [canTriggerLowStockCheck]);
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `frontend/next-app/auth.ts` | UPDATE | Move roles/permissions fetch from `jwt` to `authorize`; slim `jwt` to tokenVersion+status check |
| `frontend/next-app/lib/auth-cache.ts` | CREATE | Export `getCachedAuth = cache(auth)` for per-request memoization |
| `frontend/next-app/lib/settings-cache.ts` | CREATE | Export `getCachedSettings` wrapping `prisma.settings.findFirst()` via `unstable_cache` with tag `'settings'`, TTL 3600s |
| `frontend/next-app/app/(dashboard)/layout.tsx` | UPDATE | Use `getCachedAuth()` + `getCachedSettings()`; pass `session` to `<Header session={session} />` |
| `frontend/next-app/components/layout/header.tsx` | UPDATE | Accept `session` prop instead of calling `auth()` internally |
| `frontend/next-app/app/(dashboard)/dashboard/page.tsx` | UPDATE | Swap `auth()` → `getCachedAuth()` |
| `frontend/next-app/app/(dashboard)/logs/page.tsx` | UPDATE | Swap `auth()` → `getCachedAuth()` |
| `frontend/next-app/app/(dashboard)/requests/page.tsx` | UPDATE | Swap `auth()` → `getCachedAuth()` inside `Promise.all([getRequests(), auth(), getServerT()])` |
| `frontend/next-app/lib/actions/settings.ts` | UPDATE | Add `revalidateTag('settings')` after successful update |
| `backend/prisma/schema.prisma` | UPDATE | Add `@@index([roleId])` to `RolePermission` (roleId only — role already covered by composite unique) |
| `frontend/next-app/components/layout/notification-bell.tsx` | UPDATE | Gate `setInterval` tick on `!document.hidden`; refresh on `visibilitychange` |
| `frontend/next-app/lib/role-sync.ts` | UPDATE (optional) | Extract to an idempotent backfill callable from `authorize` (or leave where it is but no longer call from `jwt`) |

## NOT Building
- **NOT** removing the `tokenVersion` / `status` revocation check from `jwt` — this is a security control, not a perf cost.
- **NOT** adding `@@index([role])` on `RolePermission` — the composite `@@unique([role, menu])` already acts as a leading-column index for `role`.
- **NOT** switching from NextAuth JWT strategy to database sessions — out of scope.
- **NOT** rewriting `lib/actions/settings.ts` to talk to Prisma directly — it currently fetches the backend API by design, we only add cache invalidation.
- **NOT** caching Prisma queries that depend on user identity (e.g., notifications, cart) — those are per-user and change frequently.
- **NOT** implementing live permission liveness inside the request path — **role/permission changes force a session refresh** (via `tokenVersion` bump) instead of re-querying permissions on every request. Admins who edit role/permission mappings MUST bump affected users' `tokenVersion` to apply changes immediately. This is an explicit design trade-off, not a bug.
- **NOT** changing the session shape returned to clients — keep `role`, `roles[]`, `permissions[]`, `tokenVersion` exactly as `auth.ts:160-166`.
- **NOT** moving Vercel region or adding Prisma Accelerate in this plan — infrastructure change, tracked separately.

---

## Step-by-Step Tasks

### Task 1: Slim the `jwt` callback (Phase 1)
- **ACTION**: Rewrite `auth.ts` `authorize` to return `{ id, role, roles, permissions, tokenVersion }` fully populated; rewrite `jwt` to perform only a single lightweight SELECT.
- **IMPLEMENT**:
  - In `authorize` (auth.ts:27-55): after `passwordsMatch`, load `userRoles` + their `rolePermissions` in one Prisma query using `include`. Compute `roles` (slugs) and `permissions` (paths where `canView=true`). Return them on the user object.
  - In `jwt` (auth.ts:62-150): on first login (`user` present) copy `roles`, `permissions` from `user` into `token`. On subsequent calls, replace the big `user.findUnique` + `rolePermission.findMany` with a single `prisma.user.findUnique({ where: { id }, select: { tokenVersion: true, status: true } })`. If `status !== 'active'` or `tokenVersion` mismatches → `return null`.
  - Call `ensureUserHasPrimaryRole` only inside `authorize` (one-shot, at login) — not on every request.
- **MIRROR**: `SESSION_SHAPE`, `TOKEN_REVOCATION`, `ROLE_NORMALIZATION`
- **IMPORTS**: unchanged (`prisma`, `getRoleList`, `ensureUserHasPrimaryRole`)
- **GOTCHA**:
  - NextAuth v5 `jwt` callback fires on every `auth()` call — keep the query tiny but do NOT skip it entirely, or revoke stops working.
  - `token.permissions` / `token.roles` can go stale after a role/permission change until next login. Accept this trade-off; document it. If later we need liveness, add a small `userRoleVersion` column similar to `tokenVersion` and invalidate on role edits.
- **VALIDATE**:
  - Login → session has `role`, `roles[]`, `permissions[]`.
  - Page refresh → DB shows exactly **1** query hit the `User` table (select: tokenVersion, status) and **0** hits on `RolePermission`.
  - Bump `tokenVersion` in DB manually → next request logs user out.

### Task 2: Create `lib/auth-cache.ts` and swap all dashboard callers (Phase 2)
- **ACTION**: Add React `cache()` wrapper and replace every `await auth()` inside the `(dashboard)` segment.
- **IMPLEMENT**:
  ```ts
  // frontend/next-app/lib/auth-cache.ts
  import { cache } from 'react';
  import { auth } from '@/auth';
  export const getCachedAuth = cache(async () => auth());
  ```
  Update `app/(dashboard)/layout.tsx`, `components/layout/header.tsx` (see Task 3), `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/logs/page.tsx`, `app/(dashboard)/requests/page.tsx`.

  **Special case — `requests/page.tsx:15`** uses destructured `Promise.all`:
  ```ts
  // BEFORE
  const [result, session, { t }] = await Promise.all([getRequests(), auth(), getServerT()]);
  // AFTER
  const [result, session, { t }] = await Promise.all([getRequests(), getCachedAuth(), getServerT()]);
  ```
  Any other page using `auth()` inside a `Promise.all` destructure must be updated the same way — grep for `Promise.all` + `auth(` to catch stragglers.
- **MIRROR**: N/A — new utility
- **IMPORTS**: `import { getCachedAuth } from '@/lib/auth-cache';`
- **GOTCHA**:
  - `cache()` memoizes **per React request** in Server Components only. Do not import it in client components — will silently not memoize.
  - Do NOT call `cache(auth)()` once at module scope; it must be `cache(async () => auth())` so each request gets its own memo slot.
- **VALIDATE**:
  - Add temporary `console.log('jwt fired', Date.now())` inside `jwt` callback → should log **once** per dashboard page load, not 3 times.
  - Remove the log after verification.

### Task 3: Pass session to Header via props (Phase 2 cont.)
- **ACTION**: Stop calling `auth()` inside `Header`. Accept `session` from parent.
- **IMPLEMENT**:
  - `components/layout/header.tsx`: change signature to `export async function Header({ session }: { session: Session | null })`. Remove `const session = await auth();`.
  - `app/(dashboard)/layout.tsx`: change `<Header />` to `<Header session={session} />`.
- **MIRROR**: N/A — prop-drilling one level; no context needed.
- **IMPORTS**: `import type { Session } from 'next-auth';` in header.tsx.
- **GOTCHA**: `Sidebar` already takes `user={session?.user}` — mirror that shape if any other child needs the session.
- **VALIDATE**: Header still renders user avatar, profile dropdown, low-stock-check button gated correctly.

### Task 4: Cache `Settings` reads with `unstable_cache` (Phase 3)
- **ACTION**: Wrap the `prisma.settings.findFirst()` used by the layout.
- **IMPLEMENT**:
  ```ts
  // frontend/next-app/lib/settings-cache.ts
  import { unstable_cache } from 'next/cache';
  import prisma from '@/lib/prisma';

  export const getCachedSettings = unstable_cache(
    async () => prisma.settings.findFirst(),
    ['settings-singleton'],
    { tags: ['settings'], revalidate: 3600 },
  );
  ```
  Update `app/(dashboard)/layout.tsx:12` to `const settings = await getCachedSettings() as any;`.
- **MIRROR**: `BACKEND_SETTINGS_CACHE` (same TTL philosophy, different mechanism)
- **IMPORTS**: `import { getCachedSettings } from '@/lib/settings-cache';`
- **GOTCHA**:
  - `unstable_cache` is **not** per-request; it persists on the server. Any place that writes to `Settings` must emit `revalidateTag('settings')` — Task 5 handles the known write path.
  - Backend can also update settings directly (e.g., via the Express API in a different process). That will NOT invalidate Next.js cache — the 3600s TTL is the safety net.
- **VALIDATE**:
  - Open two dashboard pages in a row → second one does not re-query `Settings`.
  - Update footer text via `/settings` → reload dashboard → new footer text shows within one request (thanks to Task 5 tag invalidation).

### Task 5: Emit `revalidateTag('settings')` on settings update (Phase 3 cont.)
- **ACTION**: Ensure writes invalidate the cache from Task 4.
- **IMPLEMENT**: In `lib/actions/settings.ts:87-89`, add `revalidateTag('settings')` next to the existing `revalidatePath('/settings')`.
  ```ts
  import { revalidatePath, revalidateTag } from 'next/cache';
  // ...
  revalidatePath('/settings');
  revalidateTag('settings');
  return { success: true, settings: payload.settings || validated };
  ```
- **MIRROR**: `SERVER_ACTION_INVALIDATION`
- **IMPORTS**: extend existing import: `import { revalidatePath, revalidateTag } from 'next/cache';`
- **GOTCHA**: `revalidateTag` only works for caches declared with matching `tags`. Task 4 must use tag `'settings'` exactly.
- **GOTCHA (Next.js 16)**: In Next.js 16, `revalidateTag(tag)` now requires a second `profile` argument. Use **`updateTag(tag)`** instead — it's the 1-arg replacement designed for Server Actions with read-your-own-writes semantics (see `next/cache.d.ts` and `node_modules/next/dist/server/web/spec-extension/revalidate.d.ts`). The final implementation uses `updateTag(SETTINGS_CACHE_TAG)`.
- **VALIDATE**: Manually update footer text → dashboard footer updates on next navigation without waiting 1h.

### Task 6: Add `@@index([roleId])` to `RolePermission` (Phase 4)
- **ACTION**: Speed up permission lookup joins.
- **IMPLEMENT**: In `backend/prisma/schema.prisma` inside `model RolePermission { ... }`, add:
  ```prisma
    @@index([roleId])
    @@unique([role, menu]) // existing — keep
  ```
- **MIRROR**: `PRISMA_INDEX_PATTERN`
- **IMPORTS**: N/A (schema file)
- **GOTCHA**:
  - After Phase 1, the runtime only hits `RolePermission` during `authorize` (login), not per-request. The index is still useful because `authorize` does an IN(...)/join query, but the perf payoff is smaller than originally scoped.
  - Do **NOT** add `@@index([role])` — the existing `@@unique([role, menu])` already indexes `role` as a leading column.
- **VALIDATE**:
  - `cd backend && npx prisma migrate dev --name rolepermission_roleid_index`
  - On TiDB: confirm via `SHOW INDEX FROM RolePermission;` that a new single-column index on `roleId` exists.
  - `npx prisma generate` from `backend/` (regenerates both clients).

### Task 7: Pause `NotificationBell` polling when tab is hidden (Phase 5)
- **ACTION**: Edit `useEffect` in `components/layout/notification-bell.tsx:34-59`.
- **IMPLEMENT**: See `CLIENT_POLLING_WITH_VISIBILITY` snippet. Keep the **initial** `fetchData()` and the initial `checkLowStock()` unchanged. Only gate the interval tick on `document.hidden`, and optionally refresh on `visibilitychange`.
- **MIRROR**: `CLIENT_POLLING_WITH_VISIBILITY`
- **IMPORTS**: unchanged
- **GOTCHA**:
  - Do NOT gate the initial `fetchData` — users expect fresh state on first render.
  - Safari/mobile may fire `visibilitychange` aggressively; a double-fetch on rapid tab switching is acceptable.
- **VALIDATE**:
  - Open DevTools Network tab → switch to another tab for 3 minutes → observe zero `getNotifications` calls during that period.
  - Switch back → notifications refresh.

### Task 8: Verification pass (Phase 6)
- **ACTION**: Full-stack validation.
- **IMPLEMENT**:
  - Add temporary Prisma query logging: `new PrismaClient({ log: ['query'] })` behind an env flag.
  - Count queries for: (a) login, (b) one dashboard navigation, (c) settings update.
  - Remove logging after verification.
- **MIRROR**: N/A
- **IMPORTS**: N/A
- **GOTCHA**: Don't commit the query logging toggle turned on.
- **VALIDATE**: See **Validation Commands** below.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| `jwt` callback on refresh for active user | token with valid `tokenVersion` | token returned unchanged except refreshed `tokenVersion` | No |
| `jwt` callback on refresh after `tokenVersion` bump | stale token | `null` (logout) | Yes — security critical |
| `jwt` callback when user is `status: 'suspended'` | valid token | `null` | Yes |
| `authorize` returns full role/permission payload | valid creds | user object with `roles[]` and `permissions[]` populated | No |
| `getCachedSettings` returns cached value within request | 2 calls | 1 DB hit | Yes |
| `updateSettings` action invalidates tag | update → read | read sees new value immediately | Yes |
| `NotificationBell` interval skips when hidden | `document.hidden=true` | no fetch call | Yes |
| `NotificationBell` first fetch always fires | mount with `document.hidden=true` | fetchData called once | Yes |

### Edge Cases Checklist
- [ ] Legacy user with `userRoles.length === 0` but `user.role` set — still logs in correctly (backfill now happens in `authorize`).
- [ ] Concurrent `revalidateTag('settings')` + read — next read rebuilds cache.
- [ ] TiDB connection drop during `authorize` — surfaces as login failure, not infinite retry.
- [ ] `document` undefined in SSR — `NotificationBell` is `'use client'`, so guard is unneeded, but confirm no SSR crash.
- [ ] `tokenVersion` absent in older JWTs — treated as `1`; still triggers logout vs DB mismatch.

---

## Validation Commands

### Static Analysis
```bash
cd frontend/next-app && npx tsc --noEmit
```
EXPECT: Zero type errors

### Unit Tests (frontend)
```bash
cd frontend/next-app && npm test
```
EXPECT: All passing; new tests for `getCachedAuth`, `getCachedSettings`, `NotificationBell` polling gate

### Unit Tests (backend)
```bash
cd backend && npm test
```
EXPECT: No regressions (schema change should not affect seed/tests beyond regenerated client)

### Lint
```bash
cd frontend/next-app && npm run lint
```
EXPECT: No new warnings or errors

### Build
```bash
cd frontend/next-app && npm run build
```
EXPECT: Build completes, no type errors, all pages render

### Database Migration
```bash
cd backend && npx prisma migrate dev --name rolepermission_roleid_index
cd backend && npx prisma generate
```
EXPECT: Migration applied, both clients regenerated

### Browser Validation
```bash
# From repo root (Windows bat helpers)
./start_backend.bat
./start_frontend.bat
```
EXPECT: Dashboard loads, navigation is noticeably faster, no console errors

### Manual Validation
- [ ] Login → land on dashboard → Network tab shows single session round-trip
- [ ] Navigate to /inventory → /logs → /settings — each page loads faster than baseline
- [ ] Temporarily enable Prisma `log: ['query']` → confirm ≤2 queries/page in steady state (1 `User` select + 1 cached-miss `Settings`)
- [ ] Update footer in /settings → go to /dashboard → footer updated
- [ ] Bump `tokenVersion` in DB for a live user → next navigation logs them out
- [ ] Revoke a role in DB → user retains old perms until re-login (documented trade-off)
- [ ] Switch tabs away for 3 min → no `getNotifications` traffic; switch back → resumes

---

## Acceptance Criteria
- [ ] Dashboard page load triggers **≤2** Prisma queries in steady state (measured via `log: ['query']`)
- [ ] `auth()` cost is shared across `layout` + `header` + `page` within a single request
- [ ] `jwt` callback contains **no** `rolePermission.findMany` call on non-login requests
- [ ] `Settings` read is cached and invalidated on update
- [ ] `@@index([roleId])` present in schema and applied on TiDB
- [ ] `NotificationBell` stops polling when tab hidden
- [ ] `tokenVersion` revocation still works end-to-end
- [ ] Every Server Action mutating `Role`/`UserRole`/`RolePermission` bumps `tokenVersion` for affected users
- [ ] All tests pass; `tsc`, lint, build clean

## Completion Checklist
- [ ] Code follows discovered patterns (`SESSION_SHAPE`, `TOKEN_REVOCATION`, `SERVER_ACTION_INVALIDATION`)
- [ ] No new `any` types introduced where a concrete type is available
- [ ] No hardcoded TTLs — use named constants
- [ ] No `console.log` left in production code
- [ ] Handoff log at `project-log-md/handoff/logs/YYYY-MM-DD_HHmm_claude_code_to_any.md` and update HANDOFF_BOARD
- [ ] Self-contained — no further codebase searching needed during implementation

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stale `permissions` in JWT after admin edits a role | Medium | Medium | **Required mitigation**: any Server Action that mutates `Role`, `UserRole`, or `RolePermission` MUST bump `tokenVersion` for all affected users (forces re-login on next request). Audit `lib/actions/users.ts` + role/permission actions to ensure this is wired in before shipping. |
| `unstable_cache` API changes in future Next.js | Low | Medium | Track changelog; the helper is isolated in `lib/settings-cache.ts` — single swap point |
| TiDB migration fails on existing data | Low | High | Run on staging first; `@@index` addition is non-destructive |
| `React cache()` silently not memoizing due to client-component import | Medium | Low | Keep `lib/auth-cache.ts` server-only; add comment warning |
| Backend updates `Settings` directly and frontend cache goes stale for up to 1h | Low | Low | Document; reduce TTL if operationally needed |

## Notes
- Infrastructure follow-ups (Prisma Accelerate, Vercel region near TiDB) are out of scope for this plan but should be tracked.
- The original 6-phase plan was verified on 2026-04-14: claims about `jwt` query count (3) and `@@index([role])` necessity were corrected in this revision.
- `lib/actions/settings.ts` reaches the backend via HTTP, not Prisma — an important discovery during exploration that affected Task 5 design (tag invalidation happens on the frontend action, not in any backend controller).
- **Merge source**: This plan was cross-checked against CodeX's independent plan at `PRPs/codex/2026-04-14_141642_codeX_plan_performance-remediation.md` on 2026-04-14. Two independent analyses converged on the same 6-phase breakdown — including both revisions applied above. CodeX additionally caught `app/(dashboard)/requests/page.tsx` (missed in initial exploration because `auth()` was inside a `Promise.all` destructure), which is now incorporated into Mandatory Reading, Files to Change, and Task 2.
- **Follow-up work uncovered**: a standalone audit is needed of every Server Action that touches `Role`, `UserRole`, or `RolePermission` to confirm `tokenVersion` is bumped on mutation. This blocks shipping Phase 1 because JWT-cached permissions go stale otherwise.
