# Phase A — Baseline Measurement (2026-05-07)

Captured before any Phase B/C/D/E/F changes. Source of record for "before/after" comparisons in subsequent phases.

## Test Suites

| Suite | Files | Tests | Pass | Lines | Statements | Functions | Branches |
|-------|------:|------:|------:|------:|-----------:|----------:|---------:|
| Backend Jest (`backend/`, ex-security) | 7 | 44 | 44 | **10.21%** | 10.49% | 7.62% | 11.40% |
| Frontend Vitest (`frontend/next-app/`) | 2 | 3 | 3 | **0.45%** | 0.45% | 0.82% | 0.38% |

Notable backend hot-spots already covered: `src/utils/passwordPolicy.ts` (95.83% lines), `src/utils/prisma.ts` (100%), `src/routes/settings.ts` (73.21%).

Notable frontend hot-spot: `lib/role-access.ts` (89.47% lines from existing `role-access.test.ts`).

**24 Server Actions in `lib/actions/`: 0% coverage across the board** — confirms the largest gap targeted by Phase C.

## Security Suite

Excluded from this baseline run (per `--testPathIgnorePatterns=security`). Files exist but require Redis + seeded DB; included in Phase B.

Counted: 9 security test files across `auth/` (3), `authz/` (2), `api/` (1), `injection/` (2), `infra/` (1).

## i18n Parity

| | Count |
|--|------:|
| EN keys | 395 |
| TH keys | 395 |
| Missing in TH | **0** |
| Missing in EN | **0** |

**Plan revision**: the PRP cited a ~26-key gap based on early exploration; the live diff shows full parity. Phase E i18n action is reduced to **adding the parity test** (`tests/i18n/parity.test.ts`) only — no key fills needed.

Source script: `/home/user/hr-ims/scripts/i18n-key-diff.mjs`. Output: `i18n-diff.json`.

## npm audit

| App | low | moderate | high | critical | total |
|-----|----:|---------:|-----:|---------:|------:|
| Backend | 0 | 6 | 3 | 2 | **11** |
| Frontend | 2 | 4 | 4 | 0 | **10** |

Raw JSON in `npm-audit-{backend,frontend}.json`. Triage in Phase B.

> Note: counts captured against fresh lockfiles regenerated against `https://registry.npmjs.org` because the committed `package-lock.json` files pinned `registry.npmmirror.com` URLs unreachable from this sandbox. Original lockfiles are restored — these JSON files are advisory until CI runs the same audit.

## Deferred — needs additional infrastructure

- **Playwright** (see `playwright.md`) — needs browser binaries + dev server + seeded DB
- **Lighthouse** (see `lighthouse.md`) — needs Chrome + production build + reachable URL

Both will be unblocked by the Phase D / Phase F CI workflow changes which provision these in GitHub Actions.

## Artifacts

```
reports/phase-a/2026-05-07/
├── README.md                      ← this file
├── backend-jest.log               ← full Jest stdout
├── backend-coverage/              ← lcov-report/, coverage-summary.json, coverage-final.json
├── frontend-vitest.log
├── frontend-coverage/             ← lcov-report/, coverage-summary.json, coverage-final.json
├── npm-audit-backend.json
├── npm-audit-frontend.json
├── i18n-diff.json
├── playwright.md                  ← deferred + how to unblock
└── lighthouse.md                  ← deferred + how to unblock
```

## Phase A Exit Criteria

- [x] Backend Jest coverage report emitted
- [x] Frontend Vitest coverage report emitted
- [x] npm audit JSON for both apps
- [x] i18n key diff JSON
- [ ] Playwright HTML report — **deferred** (sandbox limitation)
- [ ] Lighthouse JSON — **deferred** (sandbox limitation)

**Verdict**: Phase A complete with two deferred artifacts that depend on infra Phase D/F provides. The numerical baselines above are sufficient to track regressions in B–F.

## Inputs to next phases

- **Phase B**: triage 11 backend + 10 frontend `npm audit` findings; verify which are reachable code paths
- **Phase C**: confirms `lib/actions/` coverage starts at 0% — target is ≥70%
- **Phase E**: i18n key fill action **dropped** (parity already 0); only the parity test remains
