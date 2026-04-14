# Plan: Performance Remediation for Auth, Dashboard, and Settings

**Metadata**
- Agent: CodeX (OpenAI)
- Timestamp: 2026-04-14 14:16:42 +07:00
- Repo: D:\genAI\hr-ims
- Target Output: PRPs/codex

## 1) Summary

This plan addresses real performance hotspots confirmed in the current codebase:
- `frontend/next-app/auth.ts` performs database work inside the `jwt` callback on repeated `auth()` usage.
- Dashboard routes call `auth()` from multiple server components in the same request path.
- `app/(dashboard)/layout.tsx` reads `Settings` from Prisma on every navigation.
- `notification-bell.tsx` keeps polling even when the tab is hidden.

The recommended execution order is:
1. Reduce database work in the `jwt` callback
2. Deduplicate `auth()` in dashboard requests
3. Cache frontend settings reads
4. Improve notification polling behavior
5. Optimize permission query and supporting indexes
6. Validate with tests, lint, build, and targeted behavior checks

## 2) Current Ground Truth

The following findings are grounded in the current repo:
- `frontend/next-app/auth.ts`
  - `jwt` callback loads the user with roles from Prisma on each run
  - `jwt` callback also queries `rolePermission`
  - `jwt` callback still runs `ensureUserHasPrimaryRole()` as part of the request path
- `frontend/next-app/app/(dashboard)/layout.tsx`
  - calls `auth()`
  - calls `prisma.settings.findFirst()`
- `frontend/next-app/components/layout/header.tsx`
  - calls `auth()` again
- additional dashboard pages also call `auth()`, including:
  - `app/(dashboard)/dashboard/page.tsx`
  - `app/(dashboard)/logs/page.tsx`
  - `app/(dashboard)/requests/page.tsx`
- `backend/src/utils/settings.ts`
  - already has a 1 minute in-memory cache on the backend side
  - frontend dashboard layout does not use that backend cache
- `backend/prisma/schema.prisma`
  - `RolePermission` currently has `@@unique([role, menu])`
  - there is no dedicated index on `roleId`
- `frontend/next-app/components/layout/notification-bell.tsx`
  - fetches immediately on mount
  - starts a fixed polling interval regardless of tab visibility

## 3) Implementation Plan

### Phase 1: Reduce DB Queries in JWT Callback

**Goal**
- Keep revoke support intact while removing most repeat database work from the auth path.

**Changes**
- Update `authorize` in `frontend/next-app/auth.ts` so that, after password verification, it loads:
  - `id`
  - `role`
  - `tokenVersion`
  - `userRoles.role.slug`
  - permissions needed for sidebar and session
- Return a user object that already contains:
  - `roles`
  - `permissions`
  - `tokenVersion`
- Update `jwt` callback so that:
  - on initial login it copies those fields into the token
  - on later runs it reads `roles` and `permissions` from the token directly
  - it performs only a lightweight user lookup for `status` and `tokenVersion`
- Remove `ensureUserHasPrimaryRole()` from the runtime request path.
- Move primary-role backfill into a one-time migration or repair script.

**Important Constraints**
- Do not remove the `tokenVersion` check.
- Do not leave permission freshness undefined. This plan assumes forced session refresh when role or permission assignments are changed.

**Expected Impact**
- Largest app-layer reduction in repeated auth-related queries.
- Faster login follow-up requests and dashboard navigations that depend on `auth()`.

### Phase 2: Deduplicate `auth()` in Dashboard

**Goal**
- Ensure dashboard request trees resolve authentication once per request.

**Changes**
- Create `frontend/next-app/lib/auth-cache.ts`.
- Implement a request-scoped helper using React `cache(() => auth())`.
- Replace direct `auth()` usage in dashboard server components with the cached helper.
- Change `components/layout/header.tsx` to accept `session` via props instead of calling `auth()` internally.
- Keep `Sidebar` on prop-driven session data from layout as it already accepts `user`.

**Target Files**
- `frontend/next-app/app/(dashboard)/layout.tsx`
- `frontend/next-app/components/layout/header.tsx`
- `frontend/next-app/app/(dashboard)/dashboard/page.tsx`
- `frontend/next-app/app/(dashboard)/logs/page.tsx`
- `frontend/next-app/app/(dashboard)/requests/page.tsx`
- Any other dashboard page discovered to call `auth()` directly

**Important Constraints**
- Do not wrap or modify the exported NextAuth `auth()` implementation itself.
- Keep the cache helper as a separate app-level wrapper.

**Expected Impact**
- High impact on dashboard response cost where multiple server components currently repeat auth resolution.

### Phase 3: Cache Settings in Frontend

**Goal**
- Stop reading `Settings` from Prisma on every dashboard navigation.

**Changes**
- Create `frontend/next-app/lib/settings-cache.ts`.
- Use `unstable_cache` to wrap the frontend-side settings read.
- Use:
  - TTL: 1 hour
  - tag: `settings`
- Update `app/(dashboard)/layout.tsx` to read settings through the cached helper.
- Update `frontend/next-app/lib/actions/settings.ts` to call `revalidateTag('settings')` after a successful settings update.
- Keep `revalidatePath('/settings')` as needed for UI consistency.

**Important Constraints**
- Do not cache forever.
- Cache must be clearable immediately after settings updates.
- Preserve behavior when no settings row exists yet.

**Expected Impact**
- Moderate but broad improvement on dashboard navigations and shared layout rendering.

### Phase 4: Optimize Permission Query and Database Indexing

**Goal**
- Reduce permission lookup cost and improve production DB behavior.

**Changes**
- Add an index on `roleId` in `backend/prisma/schema.prisma` for `RolePermission`.
- Review whether the current `OR` permission query can be narrowed toward `roleId`-based lookup.
- Keep compatibility with the legacy `role` string path until data is fully normalized.

**Important Note**
- A new standalone index on `role` may provide limited value because `@@unique([role, menu])` already creates an index led by `role` in most databases.
- The higher-value improvement is likely:
  - index on `roleId`
  - query rewrite away from mixed legacy lookup

**Expected Impact**
- Moderate improvement, especially in production databases where permission tables grow and OR conditions become more expensive.

### Phase 5: Improve Notification Bell Polling

**Goal**
- Reduce unnecessary background activity while preserving first-load behavior.

**Changes**
- Keep the initial fetch on mount exactly as it works now.
- Pause the polling interval when `document.hidden === true`.
- When the tab becomes active again:
  - perform an immediate refresh
  - restart the interval once
- Ensure interval lifecycle is safe across repeated visibility changes.

**Important Constraints**
- Do not stop the first fetch on mount.
- Do not break low-stock checks for users allowed to trigger them.

**Expected Impact**
- Lower impact than auth work, but useful for reducing idle background load across open sessions.

### Phase 6: Verification and Regression Checks

**Goal**
- Confirm the optimizations work and do not weaken auth, settings, or session behavior.

**Checks**
- Run backend tests related to auth, settings, and notifications.
- Run frontend lint.
- Run frontend build.
- Test login and logout behavior.
- Test dashboard navigation and header/sidebar rendering.
- Test settings update and cache invalidation.
- Test session revoke by changing `tokenVersion`.
- Test permission change flow with forced session refresh.

## 4) Infrastructure Follow-up

If production uses TiDB Cloud and Vercel in different regions, investigate:
- Prisma Accelerate
- TiDB connection pooling options
- moving the Vercel deployment region closer to the database

This should be evaluated after app-layer fixes so latency from network placement can be measured separately from application query overhead.

## 5) Deliverables

- Updated auth flow with reduced repeat database access
- Request-scoped cached auth helper for dashboard server components
- Cached frontend settings reader with explicit invalidation
- Notification polling improvement that respects tab visibility
- Prisma schema update for permission lookup support
- Verification results for tests, lint, build, and manual auth/session checks

## 6) Test Scenarios

### Authentication
- User can log in successfully.
- Session contains `id`, `role`, `roles`, `permissions`, and `tokenVersion`.
- User with inactive status is rejected.
- Changing `tokenVersion` invalidates the active session.

### Dashboard
- Layout, header, and pages render correctly with a shared cached auth result.
- Navigating across dashboard routes does not throw auth-related errors.
- Header still shows the correct user and notification state.

### Settings
- Footer text still renders correctly from cached settings.
- Updating settings causes the new value to appear after cache invalidation.
- Missing settings row still resolves safely.

### Notifications
- First fetch still occurs on mount.
- Polling pauses while the tab is hidden.
- Polling resumes cleanly when the tab becomes active again.

### Permissions
- Sidebar permissions still match the session permission set.
- Permission changes trigger forced session refresh behavior as designed.

## 7) Acceptance Criteria

This plan is complete when:
- auth-related repeat queries are materially reduced
- dashboard auth resolution is deduplicated per request
- settings are no longer fetched uncached on every dashboard layout render
- notification polling no longer runs continuously in hidden tabs
- revoke-by-`tokenVersion` still works
- frontend lint and build pass
- relevant backend tests pass

## 8) Assumptions

- The system accepts storing `roles` and `permissions` in JWT/session state.
- Role and permission changes are allowed to force a session refresh instead of being reflected live on every request.
- Production performance matters more than SQLite-local behavior when choosing index strategy.
- The main priority is application-layer performance before infrastructure tuning.
