# Plan: System-Wide Audit & Software Testing

## Summary
Establish a measurable baseline of the HR-IMS monorepo, then close the highest-risk testing gaps in dependency order: **Security/RBAC → Server Action unit coverage → E2E golden paths → audit-log enforcement & i18n parity → performance/a11y/CI gating.** Each phase must ship green CI before the next begins. Production code only changes in Phases B/E/F (RBAC fallback removal, audit middleware, i18n key fills, CI workflows).

## User Story
As a maintainer of HR-IMS, I want a runnable, phased audit plan that closes the largest testing blind spots and wires CI gates so regressions can't merge — so I can ship features at the current pace without compounding risk.

## Problem → Solution

**Current (measured via code read):**
- 24 Server Actions in `lib/actions/` — **0 unit tests**
- Backend Jest: ~16 tests, **no coverage threshold**
- Security suite (OWASP Top 10) **excluded from default CI**; nightly cron disabled
- `proxy.ts` + `auth.ts` — legacy single-role fallback coexists with permission matrix → RBAC bypass risk
- `lib/actions/audit.ts` — manual call sites, no IP/UA, no `requestId`, no enforcement
- i18n: ~421 EN keys / ~395 TH keys → ~26-key gap (raw keys visible to TH users)
- `security-e2e.yml` — `workflow_dispatch` only

**Target:**
- Backend Jest lines ≥70% on `src/services/**` and `src/controllers/**`; threshold enforced
- Frontend Vitest lines ≥70% on `lib/actions/**`; threshold enforced
- 8/8 E2E golden paths green on chromium + Mobile Chrome
- 0 RBAC matrix bypass failures; legacy fallback gated and disabled by default
- All mutating Server Actions emit audit log with `ipAddress`/`userAgent`/`requestId`
- TH/EN parity = 0 diff (parity test in CI)
- `security-e2e.yml` nightly cron re-enabled and required; 7 consecutive green nights before plan close
- Lighthouse a11y ≥95, perf ≥80 on `/login`, `/dashboard`, `/inventory`, `/requests`; 0 axe serious/critical violations

## Metadata
- **Complexity**: X-Large (6 phases, ~15+ new test files, 4+ workflow edits, 2 middleware additions, ~12 production touches)
- **Source PRD**: N/A — originated from user's free-form audit request on 2026-05-07
- **Estimated Files**: ~30 files created or touched across 6 phases
- **Estimated Effort**: 11–17 person-days
- **Branch**: implement on a fresh branch off current `claude/add-claude-documentation-dU90q`

### Plan Revisions
Initial draft accepted on 2026-05-07. No revisions yet.

---

## Mandatory Reading

| Priority | File | Why |
|---|---|---|
| P0 | `frontend/next-app/auth.ts` | RBAC hydration + legacy single-role fallback (Phase B) |
| P0 | `frontend/next-app/proxy.ts` | Legacy role-prefix gating to remove (Phase B) |
| P0 | `frontend/next-app/lib/auth-guards.ts` | Permission matrix entry points; reuse in tests |
| P0 | `frontend/next-app/lib/role-access.ts` (+ `role-access.test.ts`) | Source of truth for role normalization |
| P0 | `frontend/next-app/lib/actions/audit.ts` | `logActivity()` shape — refactor to `withAudit` HOF (Phase E) |
| P0 | `backend/src/tests/security/utils/http-client.ts` | Authed HTTP harness — reuse for RBAC matrix test |
| P0 | `backend/src/tests/security/utils/payloads.ts` | Injection payload corpus |
| P0 | `frontend/next-app/lib/i18n/messages.ts` | Parity target (EN vs TH key sets) |
| P0 | `backend/prisma/schema.prisma` | Verify `AuditLog` columns (`ipAddress`, `userAgent`); migrate if missing |
| P1 | `.github/workflows/ci.yml` | Add coverage / golden-path / parity / lighthouse jobs |
| P1 | `.github/workflows/security-e2e.yml` | Re-enable cron; add Redis + DB services |
| P1 | `frontend/next-app/lib/actions/requests.ts` | Stock-reserve flow → priority unit test target |
| P1 | `frontend/next-app/lib/actions/stock-transaction.ts` | Atomic decrement / rollback test target |
| P1 | `backend/jest.config.js` | Add `coverageThreshold` + un-exclude integration |
| P1 | `frontend/next-app/vitest.config.ts` | Add v8 coverage + thresholds scoped to `lib/actions/**` |
| P1 | `frontend/next-app/playwright.config.ts` | Add `golden/` project; preserve `chromium` + `Mobile Chrome` |
| P2 | `backend/src/middleware/{auth.ts,rbac.ts,requestLogger.ts}` | Extension points for `requestId` + audit middleware |
| P2 | `backend/src/utils/logger.ts` | Add `requestId` to Winston format |
| P2 | `frontend/next-app/lib/auth-cache.ts`, `lib/settings-cache.ts` | Mock targets in Server Action unit tests |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Vitest coverage v8 | https://vitest.dev/guide/coverage | `coverage.thresholds` can be scoped to glob (`include`) |
| `vitest-mock-extended` | https://github.com/marchaos/jest-mock-extended | Type-safe `mockDeep<PrismaClient>()` pattern |
| Playwright fixtures | https://playwright.dev/docs/test-fixtures | Per-spec setup/teardown via `test.extend` |
| `@axe-core/playwright` | https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright | `await new AxeBuilder({ page }).analyze()` per route |
| Lighthouse CI | https://github.com/GoogleChrome/lighthouse-ci | `lhci autorun` with `assert.assertions` budgets |
| OWASP Testing Guide | https://owasp.org/www-project-web-security-testing-guide/ | Reference for RBAC matrix + injection coverage |
| NextAuth v5 jwt strategy | https://authjs.dev/concepts/session-strategies#jwt | Mock pattern for `auth()` in Vitest |

---

## Implementation Plan (6 phases)

> Each phase publishes machine-checkable artifacts to `reports/phase-{a..f}/<date>/`. CI must be green before advancing.

### Phase A — Baseline Measurement (1 day, sequential, blocking)

**Goal**: Capture today's metrics before changing anything.

**Actions**:
1. Add placeholder `coverageThreshold` (all 0) to `backend/jest.config.js` so reports always emit.
2. Run `cd backend && npm run test:coverage -- --testPathIgnorePatterns=security`.
3. Add v8 `coverage` block to `frontend/next-app/vitest.config.ts`; run `npm test -- --coverage`.
4. Run `npx playwright test` → archive HTML report.
5. `npm audit --json` in both apps → archive.
6. Lighthouse run on `/login`, `/dashboard`, `/inventory`, `/requests`.
7. One-shot Node script reading `lib/i18n/messages.ts` to emit `key-diff.json`.

**Files created**: `reports/phase-a/2026-05-07/{backend-coverage,frontend-coverage,playwright,npm-audit,lighthouse,i18n-diff}.{json,html}`

**Exit criteria**: All 6 artifacts present; baseline numbers recorded as a comment block at the bottom of this PRP.

---

### Phase B — Critical Security & RBAC (2–3 days)

**Goal**: Prove or disprove RBAC bypass risk; remove the legacy fallback.

**Actions**:
1. `docker compose up -d redis meilisearch`; seed via `npx prisma db seed` from `backend/`.
2. Run `cd backend && npm test -- src/tests/security` — expect failures; triage each.
3. **Create** `backend/src/tests/security/authz/rbac-matrix.test.ts` — iterate `(role × route × method)` using `utils/http-client.ts`. Companion fixture: `rbac-matrix.fixture.ts` defines expected allow/deny matrix.
4. **Create** `frontend/next-app/tests/integration/proxy-rbac.test.ts` — mock `auth()` and exercise `proxy.ts` per role.
5. Reconcile legacy single-role fallback in `auth.ts` + `proxy.ts` with `lib/role-access.ts` matrix. Gate behind env flag `RBAC_LEGACY_FALLBACK` (default `false`); CI sets `false`, dev `.env.example` documents both.
6. Add `frontend/next-app/lib/role-access.test.ts` cases for the new flag-gated path.

**Reuse**: `backend/src/tests/security/utils/{http-client.ts,payloads.ts}`, `lib/auth-guards.ts`, `lib/role-access.ts`, existing `role-access.test.ts`.

**Exit criteria**: 0 failing security tests; RBAC matrix green for all 6 roles × all routes; `proxy.ts` rejects legacy claim when matrix says deny.

---

### Phase C — Server Action Unit Tests (3–4 days)

**Goal**: ≥70% line coverage on `lib/actions/` priority files.

**Actions**:
1. **Create** `frontend/next-app/tests/actions/__mocks__/prisma.ts` exporting `mockDeep<PrismaClient>()` (vitest-mock-extended pattern).
2. **Create** test files (one per action module, in this priority order):
   - `tests/actions/requests.test.ts` (cart→request→approve→reject; reserve stock)
   - `tests/actions/inventory.test.ts`
   - `tests/actions/users.test.ts`
   - `tests/actions/stock-management.test.ts`
   - `tests/actions/stock-transaction.test.ts` — assert `prisma.$transaction` call order + rollback on mid-tx failure
   - `tests/actions/cart.test.ts`
   - `tests/actions/categories.test.ts`
   - `tests/actions/departments.test.ts`
   - `tests/actions/permissions.test.ts`
   - `tests/actions/audit.test.ts`
   - `tests/actions/password-reset.test.ts`
   - `tests/actions/sessions.test.ts`
3. Each test mocks `auth()`, `lib/auth-cache.ts`, `lib/settings-cache.ts`.
4. Add to `frontend/next-app/vitest.config.ts`:
   ```ts
   coverage: {
     provider: 'v8',
     include: ['lib/actions/**'],
     thresholds: { lines: 70, statements: 70, functions: 65, branches: 55 },
   }
   ```

**Exit criteria**: Vitest coverage report ≥70% lines on `lib/actions/`; `stock-transaction.test.ts` asserts atomic decrement + rollback.

---

### Phase D — E2E Golden Paths (2–3 days)

**Goal**: 8 user journeys green, deterministic, in CI.

**Files** (all under `frontend/next-app/tests/e2e/golden/`):
1. `01-login-rbac.spec.ts` — login + role-based redirect
2. `02-request-lifecycle.spec.ts` — cart → request → approve → stock decrement
3. `03-inventory-crud.spec.ts`
4. `04-user-management.spec.ts`
5. `05-stock-transaction.spec.ts` — in/out/adjust with audit log verification
6. `06-reports-export.spec.ts`
7. `07-settings-permission-leak.spec.ts` — non-admin hits each of 8 `/settings/*` sub-routes; assert 403/redirect
8. `08-i18n-switch.spec.ts` — toggle EN↔TH on 3 pages; assert no raw key appears

**Reuse**: existing fixture pattern from `frontend/next-app/tests/e2e/`.

**Create** `tests/e2e/fixtures/users.ts` — seed deterministic accounts via authenticated API calls (no DB writes from spec).

**Exit criteria**: 8/8 green locally and in CI on `chromium` + `Mobile Chrome`; retries ≤1 across 5 consecutive CI runs.

---

### Phase E — Audit Log Enforcement + i18n Gap (1–2 days)

**Goal**: Close two structural gaps the user explicitly flagged.

**Actions**:
1. **Verify schema** — confirm `backend/prisma/schema.prisma` `AuditLog` model has `ipAddress: String?`, `userAgent: String?`, `requestId: String?`. If missing, add migration as the first action of this phase.
2. Refactor `frontend/next-app/lib/actions/audit.ts`:
   - Add helper `getAuditContext()` reading `headers()` from `next/headers` for `x-forwarded-for` + `user-agent`.
   - Add HOF `withAudit(action, fn)` that wraps a Server Action and logs CRUD intent + before/after.
3. Wrap mutating actions (incremental commits, one per file): `requests.ts`, `users.ts`, `inventory.ts`, `stock-management.ts`, `stock-transaction.ts`, `permissions.ts`, `departments.ts`.
4. **Create** `backend/src/middleware/audit.ts` mirroring the HOF for Express; mount after `auth.ts` for mutating verbs (`POST`, `PUT`, `PATCH`, `DELETE`).
5. Fill the ~26-key TH gap in `lib/i18n/messages.ts` (use baseline `key-diff.json` from Phase A).
6. **Create** `frontend/next-app/tests/i18n/parity.test.ts` — fail if `Object.keys(EN).length !== Object.keys(TH).length` or any key missing on either side.

**Exit criteria**: New audit log rows include `ipAddress`/`userAgent`/`requestId`; parity test green; manual smoke shows no raw i18n keys.

---

### Phase F — Perf, A11y, CI Gating (2 days)

**Goal**: Wire enforcement and turn the lights on.

**Actions**:
1. Add `@axe-core/playwright` scan to each golden-path spec; budget: 0 serious/critical violations.
2. Add Lighthouse CI step running on built Next preview; budgets — Performance ≥80, A11y ≥95, Best Practices ≥90.
3. Extend `backend/src/middleware/requestLogger.ts` to mint a `requestId` (UUID v4); inject into Winston format in `backend/src/utils/logger.ts`.
4. Edit `.github/workflows/ci.yml` — add jobs:
   - `frontend-vitest-coverage` (with threshold gate)
   - `frontend-e2e-golden` (Playwright)
   - `i18n-parity`
   - `lighthouse` (PR-only)
5. Edit `.github/workflows/security-e2e.yml`:
   - Re-enable `schedule: cron: '0 3 * * *'`
   - Add `services:` for Redis + MySQL/TiDB
   - Add seed step before tests

**Exit criteria**: All new jobs required on `main`; `security-e2e.yml` posts 7 consecutive green nightly runs before this PRP is moved to `completed/`.

---

## Acceptance Criteria (measurable)

- [ ] Backend Jest line coverage ≥70% on `src/services/**` and `src/controllers/**`; thresholds enforced in `jest.config.js`
- [ ] Frontend Vitest line coverage ≥70% on `lib/actions/**`; enforced in `vitest.config.ts`
- [ ] 8/8 golden-path Playwright specs green in CI on chromium + Mobile Chrome
- [ ] 0 failing tests in `backend/src/tests/security/**` for 7 consecutive nightly runs
- [ ] 0 RBAC matrix bypass test failures across all roles × all routes
- [ ] TH/EN key parity: diff = 0; parity test green in CI
- [ ] Audit log entries on all mutating Server Actions include `ipAddress`, `userAgent`, `requestId` — verified by golden specs 02 + 05
- [ ] Lighthouse a11y ≥95 and perf ≥80 on `/login`, `/dashboard`, `/inventory`, `/requests`
- [ ] 0 axe serious/critical violations on the 4 dashboard routes
- [ ] `security-e2e.yml` cron re-enabled and required on `main`

## Verification (run end-to-end)

```bash
docker compose -f /home/user/hr-ims/docker-compose.yml up -d redis meilisearch

# Backend
cd /home/user/hr-ims/backend
npm ci
npx prisma db push && npx prisma db seed
npm run test:coverage
npm test -- src/tests/security

# Frontend
cd /home/user/hr-ims/frontend/next-app
npm ci --legacy-peer-deps
npm test -- --coverage
npx playwright install --with-deps
npx playwright test
npx lhci autorun                    # Phase F only
```

Expected: all green; reports under `/home/user/hr-ims/reports/`.

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Redis dependency for security suite | `docker compose up -d redis` is a documented prereq; CI job declares `services:` block |
| Playwright flakiness in CI | `retries: 2` already set; deterministic seed users; lint rule disallows `waitForTimeout` |
| Test data drift across specs | Per-spec fixture creates and tears down via API; never reuses across specs |
| Prisma mock divergence from generated types | Regenerate mock on `postinstall` |
| Audit middleware regressions in dev | Ship behind `AUDIT_ENFORCE=true` (default `true` in CI, off in dev `.env.example`) |
| Removing legacy single-role fallback breaks existing sessions | Feature flag `RBAC_LEGACY_FALLBACK` (default `false` after Phase B); remove entirely after one release window |

## Assumptions

- Docker available locally and on CI runners for Redis + MySQL/TiDB.
- NextAuth v5 beta `auth()` API stable through plan execution.
- Implementer authorized to flip `security-e2e.yml` and the new CI jobs to required on `main`.
- No production schema migration required beyond the `AuditLog` column verification (Phase E action #1).

## Deliverables

1. This PRP file (`.claude/PRPs/plans/2026-05-07_system-wide-audit-and-testing.plan.md`).
2. Phase artifacts under `/home/user/hr-ims/reports/phase-{a..f}/`.
3. Production code changes scoped to Phases B (RBAC fallback removal), E (audit middleware + i18n), F (CI workflows + requestId logging).
4. Updated CI workflows with new required jobs.
5. Move this file to `completed/` after acceptance criteria all check.
