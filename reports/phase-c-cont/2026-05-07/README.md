# Phase C continuation — close out 12 deferred Server Action tests (2026-05-07)

Phase C delivered tests for the 12 priority Server Actions. This pass closes
out the remaining 12 — every file in `lib/actions/` now clears the
`lines: 70` gate.

## Test counts

| | Phase F | After continuation |
|---|---:|---:|
| Frontend Vitest test files | 16 | **28** |
| Frontend Vitest tests | 222 | **318** |

96 new tests across 12 new test files.

## Final per-file coverage on `lib/actions/`

| File | Lines | | File | Lines |
|---|---:|---|---|---:|
| `auth.ts` | **100%** | | `inventory.ts` | 95.94% |
| `categories.ts` | **100%** | | `notifications.ts` | 95.91% |
| `dashboard.ts` | **100%** | | `permissions.ts` | 91.30% |
| `history.ts` | **100%** | | `maintenance.ts` | 89.47% |
| `password-reset.ts` | **100%** | | `assets.ts` | 87.80% |
| `register.ts` | **100%** | | `users.ts` | 86.45% |
| `reports.ts` | **100%** | | `warehouse.ts` | 84.31% |
| `scanner.ts` | **100%** | | `departments.ts` | 82.00% |
| `sessions.ts` | **100%** | | `requests.ts` | 70.78% |
| `stock-management.ts` | **100%** | | | |
| `stock-transaction.ts` | **100%** | | | |
| `test-email.ts` | **100%** | | | |
| `cart.ts` | 96.42% | | | |
| `audit.ts` | 97.36% | | | |
| `settings.ts` | 97.05% | | | |

**Weighted lib/actions/ coverage: 91.61% (882/882 reachable lines)**
(was 55.24% post-Phase C; was 0.45% Phase A baseline)

## Files added (12 test files + 1 mock harness extension)

| Test file | Tests |
|---|---:|
| `tests/actions/assets.test.ts` | 11 |
| `tests/actions/auth.test.ts` | 6 |
| `tests/actions/dashboard.test.ts` | 6 |
| `tests/actions/history.test.ts` | 7 |
| `tests/actions/maintenance.test.ts` | 7 |
| `tests/actions/notifications.test.ts` | 14 |
| `tests/actions/register.test.ts` | 7 |
| `tests/actions/reports.test.ts` | 3 |
| `tests/actions/scanner.test.ts` | 7 |
| `tests/actions/settings.test.ts` | 9 |
| `tests/actions/test-email.test.ts` | 5 |
| `tests/actions/warehouse.test.ts` | 14 |

## Mock harness updates (`tests/actions/__mocks__/prisma.ts`)

- Added `division` and `province` to the model list (warehouse.ts uses them).
- `resetPrismaMock()` is now tolerant of test-added stubs (e.g. dashboard
  needs `prismaMock.stockLevel.fields.minStock` to mirror Prisma's
  field-reference helper). Reset skips non-mock entries.

## Notable test highlights

- **`notifications.test.ts`**: covers low-stock alert flow including
  `$queryRaw` for the column-vs-column comparison, manager fan-out,
  and dedup of unread notifications.
- **`assets.test.ts`**: covers the borrow + return + check-in + report-issue
  surface for end users — tests assert that `reportIssue` flips item status
  to `issue_reported` AND writes a history entry in the same call.
- **`reports.test.ts`**: covers four-dimensional aggregation (status
  breakdown, top-borrowed items, top departments computed via per-user
  groupBy, and last-6-month trend bucketing).
- **`auth.test.ts`**: covers the magic `NEXT_REDIRECT` rethrow path that
  NextAuth uses to drive client-side navigation — easy to break without
  realising.
- **`register.test.ts`**: covers `allowRegistration` setting gate, password
  match validation, password length, duplicate email, and atomic create
  via `prisma.$transaction`.
- **`settings.test.ts`** + **`test-email.test.ts`**: cover the proxy-
  through-to-backend pattern (`fetch` to Express with `x-internal-key`).

## Config update (`vitest.config.ts`)

Coverage threshold expanded from a 12-file glob to `lib/actions/*.ts`
(all 24 files) — every file must now clear `lines: 70` for CI to pass.

```diff
 thresholds: {
-    'lib/actions/{audit,cart,categories,departments,inventory,password-reset,permissions,requests,sessions,stock-management,stock-transaction,users}.ts':
-        { lines: 70, statements: 70, functions: 65, branches: 55 },
+    'lib/actions/*.ts':
+        { lines: 70, statements: 70, functions: 65, branches: 55 },
 },
```

## How to run

```bash
cd frontend/next-app
npx vitest run --coverage
# expect: 318 passed (28), exit 0, every lib/actions/*.ts ≥ 70% lines
```

## Project tally (Phase A → Phase F → continuation)

| | Phase A | F | continuation |
|---|---:|---:|---:|
| Frontend Vitest tests | 3 | 222 | **318** |
| Frontend Vitest files | 2 | 16 | **28** |
| Backend Jest tests | 44 | 215 | 215 |
| Playwright golden | 6 | 94 | 94 |
| **Total tests** | **53** | **531** | **627** |
| **lib/actions/ coverage** | 0.45% | 55.24% | **91.61%** |

## Artifacts

```
reports/phase-c-cont/2026-05-07/
├── README.md                              ← this file
└── frontend-coverage-summary.json
```
