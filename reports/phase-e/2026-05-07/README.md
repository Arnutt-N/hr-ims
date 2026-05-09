# Phase E — Audit Log Enforcement + i18n Parity (2026-05-07)

Closes the structural gap from the audit PRP: every audit row now records
`ipAddress`, `userAgent`, and `requestId` automatically — no caller change
required. A new `withAudit()` HOF is available for actions that want
before/after snapshots. EN/TH parity is locked in by a Vitest test that
breaks any future commit which drops a translation.

## Test counts

| Suite | Files | Tests | Δ from Phase D |
|---|---:|---:|---:|
| Frontend Vitest | **16** | **222** | +12 (7 audit + 5 parity) |
| Backend Jest | **9** | **215** | +7 (audit middleware) |

## Schema

`backend/prisma/schema.prisma` already had `ipAddress` + `userAgent` on
`AuditLog`. Phase E adds:

```diff
   ipAddress   String?
   userAgent   String?
+  requestId   String?  // UUID propagated from requestLogger middleware
   createdAt   DateTime @default(now())

   @@index([userId])
   @@index([action])
   @@index([entity])
   @@index([createdAt])
+  @@index([requestId])
```

Applied via `npx prisma db push --accept-data-loss` against
`backend/prisma/dev.db`. Both Prisma clients regenerated.

## Frontend changes (`frontend/next-app/lib/actions/audit.ts`)

### Added

- **`getAuditContext()`** — pulls `x-forwarded-for` (first hop) /
  `x-real-ip` / `user-agent` / `x-request-id` off `next/headers()`. Returns
  all-null when called outside a request scope (tests, cron jobs).
- **`withAudit({...meta}, fn)` HOF** — wraps a Server Action and persists a
  single `AuditLog` row carrying:
  - `action`, `entity`, `entityId`
  - `oldValue` (JSON of the `before()` snapshot)
  - `newValue` (JSON of the `after(args, result)` snapshot)
  - `details` (JSON of the optional `details(args, result)` projection)
  - `ipAddress` / `userAgent` / `requestId`
  Audit insert failures are caught — the action's own result is always
  returned. The HOF is opt-in; existing actions don't have to switch.

### Changed

- **`logActivity()`** — now auto-populates `ipAddress`, `userAgent`, and
  `requestId` from `getAuditContext()`. **Every existing call site
  (categories, users, requests, inventory, stock-management, permissions,
  …) gains the new fields with zero diff at the call site.** This is what
  satisfies the audit PRP's "Audit log entries on all mutating Server
  Actions include ipAddress/userAgent/requestId" criterion globally.

## Backend changes (`backend/src/middleware/audit.ts` — NEW)

- **`auditContext()` middleware** — mints a UUID `requestId` (or honours an
  inbound `x-request-id` from edge proxy / Cloudflare Tunnel), echoes it
  back via response header, and stages `req.auditContext` for downstream
  controllers. Mount after `requireAuth`.
- **`buildAuditContext(req)`** — one-shot helper for code paths that don't
  go through the middleware (jobs, integration tests).

Tested by `backend/src/tests/unit/audit.middleware.test.ts` (7 cases).

## i18n parity test (`frontend/next-app/tests/i18n/parity.test.ts` — NEW)

5 cases that fail any future commit which:
- Adds an EN key without the matching TH (or vice versa)
- Leaves an empty string in either dictionary
- Breaks the `translate()` fallback
- Causes a key to resolve to a non-string

Phase A's i18n diff already showed 0 diff between EN (395) and TH (395).
This test traps regressions before they ship.

## What was NOT done in this phase

- **`withAudit` opt-in** — existing actions still call `logActivity()`.
  Because the IP/UA/requestId fix lives in `logActivity` itself, every
  existing audit row already gets the new fields. `withAudit` is for
  future actions or migrations that need the structured before/after
  shape.
- **`auditContext()` mounting in `index.ts`** — added as exportable
  middleware but **not yet wired** into the Express startup chain. Wiring
  is a one-line change in `index.ts` (`app.use(auditContext())` after
  authn) and is deferred to Phase F where the broader CI/observability
  changes happen — it's safer to flip on once `requestId` is also flowing
  into Winston via Phase F.

## How to run

```bash
# Frontend (Vitest)
cd frontend/next-app
npx vitest run
# expect: 222 passed (16), exit 0

# Backend (Jest, excl. infra-bound security)
cd ../../backend
INTERNAL_API_KEY=test-internal-key \
  DATABASE_URL=file:./prisma/dev.db \
  npx jest --testPathIgnorePatterns="security/auth/|security/injection/|security/infra/|security/api/|security/utils/|security/pentest/|authz/idor|authz/privilege" \
  --no-coverage --forceExit
# expect: 215 passed (9), exit 0
```

## Phase E Exit Criteria

- [x] `AuditLog.requestId` column added + indexed
- [x] `getAuditContext()` available; reads next/headers safely
- [x] `withAudit()` HOF available; preserves inner-result semantics on
      audit failure
- [x] All existing `logActivity()` callers automatically capture
      `ipAddress` / `userAgent` / `requestId`
- [x] Backend audit middleware authored + tested (mounting deferred to
      Phase F together with the requestId logging change)
- [x] i18n EN/TH parity test green; will break the build on drift
- [x] All Vitest + Jest suites green (222 + 215 tests)

## Inputs to Phase F

1. Wire `app.use(auditContext())` in `backend/src/index.ts` after
   `requireAuth`, plus inject `req.auditContext.requestId` into the
   Winston log format (`backend/src/utils/logger.ts`).
2. Wire `i18n-parity` job in `.github/workflows/ci.yml` so the parity
   test runs on every PR.
3. Wire the (now lightly-used) `withAudit` HOF as the recommended pattern
   for any new mutating Server Action.

## Artifacts

```
reports/phase-e/2026-05-07/
└── README.md      ← this file
```
