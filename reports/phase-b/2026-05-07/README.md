# Phase B — Critical Security & RBAC (2026-05-07)

Closes the highest-risk RBAC bypass surface: legacy single-role fallback in
`proxy.ts` is now gated behind `RBAC_LEGACY_FALLBACK` (default `false`), and
backend RBAC is asserted with a 164-cell matrix test that runs in-memory.

## Scope

| Action | Status |
|---|---|
| Extract testable `authorizeRequest` from `proxy.ts` | ✅ done |
| Add `RBAC_LEGACY_FALLBACK` flag (default `false`) | ✅ done |
| Author backend `rbac-matrix.fixture.ts` | ✅ done (~25 routes) |
| Author backend `rbac-matrix.test.ts` | ✅ done (164/164 green) |
| Author frontend `proxy-rbac.test.ts` | ✅ done (36/36 green) |
| Extend `lib/role-access.test.ts` | ✅ done (3 → 19 tests) |
| Run other security tests (`auth/`, `injection/`, `infra/`, `api/`, `authz/idor`, `authz/privilege-escalation`) | ⚠ deferred — needs docker compose + seeded DB + live :3001 |

## Test counts (before → after)

| Suite | Files | Tests | Δ |
|---|---:|---:|---:|
| Backend Jest (no security) | 7 | 44 | unchanged |
| Backend Jest + matrix only | 8 | **208** | +164 |
| Frontend Vitest | 3 | **56** | +53 (was 3) |

## Files added

| File | Purpose |
|---|---|
| `frontend/next-app/lib/proxy-authorize.ts` | Pure RBAC decision fn (testable, no NextAuth import) |
| `frontend/next-app/tests/integration/proxy-rbac.test.ts` | 36 cases covering matrix-only + legacy-fallback flag modes |
| `backend/src/tests/security/authz/rbac-matrix.fixture.ts` | (role × route × method) → expected allow/deny |
| `backend/src/tests/security/authz/rbac-matrix.test.ts` | Iterates fixture; 164 green cells |

## Files modified

| File | Change |
|---|---|
| `frontend/next-app/proxy.ts` | Delegates to `authorizeRequest`; reads `RBAC_LEGACY_FALLBACK` |
| `frontend/next-app/lib/role-access.test.ts` | Beefed-up coverage (priority order, dedup, edge cases) |
| `backend/src/index.ts` | `export { app }` + `if (require.main === module) app.listen(...)` so Supertest can run in-memory |

## Behavioural change

**Before**: `proxy.ts` allowed access if EITHER the user's `permissions[]`
matched the path OR the user's role appeared in a hard-coded `legacyRoleRules`
allowlist. Net effect: an admin could touch `/settings` even when the
`RolePermission` table didn't grant it.

**After**: `proxy.ts` only consults `permissions[]`. Legacy fallback is
opt-in via `RBAC_LEGACY_FALLBACK=true`. Default off → matrix becomes
authoritative.

> **Migration note**: deployments that have *not* seeded the
> `RolePermission` rows will see admins/approvers redirected to
> `/dashboard?error=access_denied`. Mitigation:
> 1. Confirm `RolePermission` rows exist for the legacy role/path pairs (see
>    `LEGACY_ROLE_RULES` in `lib/proxy-authorize.ts` for the canonical list).
> 2. As an emergency rollback, set `RBAC_LEGACY_FALLBACK=true` in the
>    environment and redeploy.

## RBAC matrix coverage

The fixture covers ~25 representative endpoints across these tiers:

- **Public** (4): `/api/auth/login`, `/api/auth/register`, `/api/health`, `/api/settings/public`
- **superadmin only** (10): `/api/health/admin`, `/api/settings`, `/api/email/test`, `/api/email/verify-connection`, `/api/inventory/:id` DELETE, settings backup/restore/cache
- **admin tier** (9): `/api/inventory` POST/PATCH, `/api/warehouses` POST/PATCH, `/api/stock-levels` POST, `/api/departments/*` (4)
- **approver tier** (3): `/api/stock-levels/.../adjust`, `/api/stock-levels/.../limits`, `/api/stock-transfers/:id` PATCH
- **any auth** (4): `/api/health/detailed`, `/api/email/status`, `/api/stock-transfers` POST, `/api/departments/my-mapping`

Every cell is asserted: `(allowedRoles ✓) → not 401, not 403`; `(allowedRoles ✗) → 401 or 403`.

## How to run

```bash
# Frontend (no infra needed)
cd frontend/next-app
npx vitest run                            # 56/56

# Backend matrix — needs DB schema only
cd backend
DATABASE_URL=file:./prisma/dev.db npx prisma db push
INTERNAL_API_KEY=test-internal-key \
  DATABASE_URL=file:./prisma/dev.db \
  npx jest src/tests/security/authz/rbac-matrix --no-coverage --forceExit
# expect: Tests: 164 passed, 164 total

# Full backend (excl. infra-bound security)
INTERNAL_API_KEY=test-internal-key \
  DATABASE_URL=file:./prisma/dev.db \
  npx jest --testPathIgnorePatterns="security/auth/|security/injection/|security/infra/|security/api/|security/utils/|security/pentest/" \
  --no-coverage --forceExit
```

## Phase B Exit Criteria

- [x] Backend RBAC matrix: 164/164 cells green
- [x] Frontend proxy-rbac: 36/36 cases green covering matrix-only + legacy modes
- [x] `RBAC_LEGACY_FALLBACK` flag in place; default `false`
- [x] `proxy.ts` denies legacy claim when matrix says deny (proven by 2 explicit "before vs after flag" tests)
- [ ] Full security suite (auth / injection / infra / api / pentest) — **deferred** to CI Phase F where `services: redis, mysql` will be provisioned

## Inputs to next phases

- Phase C still needs to start: 24 Server Actions still at 0% coverage
- Phase E `tests/i18n/parity.test.ts` is still pending; Phase A confirmed parity already at 0 diff

## Artifacts

```
reports/phase-b/2026-05-07/
└── README.md           ← this file
```

(no JSON artifacts this phase — coverage delta is captured in the test run summary above; full lcov will refresh in Phase F when CI re-runs)
