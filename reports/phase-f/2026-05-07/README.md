# Phase F — Perf, A11y, CI Gating (2026-05-07)

Final phase of the system-wide audit PRP. Wires the Phase B–E
deliverables into CI gates so regressions can't merge, adds the missing
runtime hookups (audit middleware, requestId in logs), and re-enables
the nightly security suite.

## Test counts (Phase E → Phase F)

| Suite | Files | Tests | Δ |
|---|---:|---:|---:|
| Frontend Vitest | 16 | **222** | unchanged |
| Backend Jest | 9 | **215** | unchanged |
| Playwright golden | **9 files** | **94 tests** (47 × 2 projects) | +1 file (axe a11y), +8 tests |

Existing tests still all green. The new spec file (`09-accessibility.spec.ts`)
is gated behind `npm install @axe-core/playwright` — added to package.json
devDependencies, will be picked up by CI's `npm ci`.

## Backend wiring (carry-over from Phase E)

**`backend/src/index.ts`** — mounts `auditContext()` + `requestLogger()` once,
right after `cors()` and before the route table:

```diff
+ app.use(auditContext());
+ app.use(requestLogger());
  app.use('/api/auth', authRoutes);
  ...
```

Result: every inbound request is stamped with a UUID `requestId` (or
honors `x-request-id` from edge proxies). The id is echoed back via
response header AND injected into every Winston log entry for the
request — proven by RBAC matrix test output:

```
info: API Request {"duration":"1ms","ip":"127.0.0.1","method":"GET",
       "path":"/api/departments/my-mapping",
       "requestId":"3a4cfb52-7efa-4067-a6aa-5afbf05ea589", ...}
```

**`backend/src/middleware/requestLogger.ts`** — extended to read
`req.auditContext.requestId` and include it in the Winston meta.
Both `requestLogger` (info path) and `errorLogger` (error path) emit it.

CORS allowlist updated to accept and expose `x-request-id`.

## Accessibility (axe-core)

**New**: `frontend/next-app/tests/e2e/fixtures/a11y.ts` — `runAxeScan(page)`
helper using `@axe-core/playwright` with WCAG 2.1 AA + best-practice rules.

**Budget**:
- 0 *serious* + 0 *critical* violations → **fail**
- minor / moderate → logged via `console.warn` only (a11y backlog)

**New**: `frontend/next-app/tests/e2e/golden/09-accessibility.spec.ts` —
runs the scan against `/login`, `/dashboard`, `/inventory`, `/requests`.

`@axe-core/playwright@^4.10.0` added to `package.json` devDependencies. The
helper uses dynamic import so spec discovery doesn't require the package
present at parse time.

## Lighthouse CI

**New**: `frontend/next-app/.lighthouserc.cjs` — runs against `next start`
on the four priority routes:

| Category | Budget |
|---|---:|
| Performance | ≥ 80 (error) |
| Accessibility | ≥ 95 (error) |
| Best Practices | ≥ 90 (error) |
| SEO | ≥ 85 (warn) |

## CI workflow changes

### `.github/workflows/ci.yml`

**Existing `frontend` job** — `npx vitest run` upgraded to
`npx vitest run --coverage`. The per-file thresholds in
`vitest.config.ts` (Phase C) now break the build on coverage drift for
the 12 priority Server Actions. Coverage artefact uploaded.

**New `e2e-golden` job** — installs both apps, pushes + seeds Prisma DB,
installs Chromium, runs Playwright golden suite. HTML report uploaded
on success or failure.

**New `lighthouse` job** — PR-only (`if: github.event_name == 'pull_request'`),
depends on `vercel-build`. Builds Next.js, then `lhci autorun` against
the four priority routes.

### `.github/workflows/security-e2e.yml`

- **Cron re-enabled**: `schedule: '0 3 * * *'` (10:00 ICT daily). The
  workflow_dispatch trigger is preserved.
- **Matrix excluded**: `--testPathIgnorePatterns=rbac-matrix` because that
  suite (Phase B) already runs in-memory in the main `backend` CI job —
  no need to pay the Redis-services cost twice.
- `continue-on-error: true` retained for the first 7 nightly runs so we
  can establish which legacy security tests reliably pass before
  tightening to a hard fail.

## Documentation

`CLAUDE.md` — `### Audit Logging Pattern` section expanded to document:
- `logActivity()` auto-populating IP / UA / requestId
- `withAudit()` HOF for new mutating Server Actions
- Backend audit middleware + Winston log correlation

## What this PR does NOT do

- Doesn't run Lighthouse / golden Playwright locally — the sandbox can't
  reach Google's CDN to fetch Chromium. CI runners will execute both.
- Doesn't run `npm install @axe-core/playwright` — npm registry blocks
  the sandbox; the dependency is declared, CI's `npm ci` resolves.
- Doesn't tighten `continue-on-error: true` on `security-e2e.yml` —
  deliberate per the PRP: 7 nights of telemetry first, then enforce.

## Phase F Exit Criteria

- [x] `auditContext()` middleware mounted in Express
- [x] `requestId` flows through Winston (verified in RBAC matrix log
      output)
- [x] Lighthouse CI config + budget assertions
- [x] Axe a11y spec + helper
- [x] CI workflow has new `e2e-golden` + `lighthouse` jobs
- [x] CI workflow's existing frontend job now enforces vitest coverage
      threshold gate
- [x] `security-e2e.yml` nightly cron re-enabled
- [x] `withAudit` pattern documented in `CLAUDE.md`
- [ ] 7 nightly green security runs — **pending** (operational milestone,
      not a code deliverable)
- [ ] CI runs green on first push — pending merge

## Total project tally (Phase A → Phase F)

| | Phase A | Phase B | Phase C | Phase D | Phase E | Phase F |
|---|---:|---:|---:|---:|---:|---:|
| Backend tests | 44 | 208 | 208 | 208 | 215 | **215** |
| Frontend Vitest | 3 | 56 | 210 | 210 | 222 | **222** |
| Playwright (planned) | 6 | 6 | 6 | 86 | 86 | **94** |
| **CI gates** | 0 | 0 | 0 | 0 | 0 | **5** |

CI gates added in F:
1. Vitest coverage threshold (lib/actions priority files)
2. E2E golden Playwright suite (chromium + Mobile Chrome)
3. Axe-core a11y violations (serious + critical)
4. Lighthouse perf / a11y / BP budgets (PR-only)
5. Nightly security E2E suite (cron-driven)

## Audit PRP — overall status

| Phase | Status |
|---|---|
| A — Baseline | ✅ |
| B — RBAC matrix + legacy fallback flag | ✅ |
| C — 12 Server Action test files | ✅ |
| D — 8 golden Playwright specs (+ 1 a11y in F) | ✅ |
| E — Audit log enforcement + i18n parity | ✅ |
| F — CI gating + perf/a11y budgets | ✅ |

System-wide audit + testing PRP is **complete** modulo operational
milestones (7 green nightly security runs) and the CI itself going green
on first push.

## Artifacts

```
reports/phase-f/2026-05-07/
└── README.md      ← this file
```
