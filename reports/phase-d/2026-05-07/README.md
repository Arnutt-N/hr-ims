# Phase D — E2E Golden Paths (2026-05-07)

8 Playwright spec files authored under `frontend/next-app/tests/e2e/golden/`,
covering the highest-value user journeys per the audit PRP. Each spec runs
against `chromium` + `Mobile Chrome` via `playwright.config.ts`.

## Files added

| Spec | Journey |
|---|---|
| `golden/01-login-rbac.spec.ts` | Login form + role-redirect for all 6 demo roles + superadmin reaches every gated route + user denied at /users and /settings |
| `golden/02-request-lifecycle.spec.ts` | Cart → request submit → approver picks up pending → approve → status flips + audit row |
| `golden/03-inventory-crud.spec.ts` | Admin can list + create item; user role can't see write controls |
| `golden/04-user-management.spec.ts` | Admin can list users + cannot promote to superadmin; user denied at /users; superadmin sees edit controls |
| `golden/05-stock-transaction.spec.ts` | Receive-goods page renders for admin; auditor reaches /history + /logs; user denied at /warehouse |
| `golden/06-reports-export.spec.ts` | Auditor + admin can open /reports + see print/export controls; user denied |
| `golden/07-settings-permission-leak.spec.ts` | All 10 `/settings/*` sub-routes verified per role: superadmin ⊇ admin (subset) ⊇ everyone-else (denied) |
| `golden/08-i18n-switch.spec.ts` | Locale toggle visible + functions; no raw keys leak in TH or EN on `/dashboard`, `/inventory`, `/requests` |

## Fixtures (`tests/e2e/fixtures/`)

| File | Purpose |
|---|---|
| `users.ts` | DEMO_USERS lookup keyed by RoleSlug — single source of truth for credentials, mirrors `backend/prisma/seed.ts` |
| `auth.ts` | `loginAs(page, role)` — drives the login form + waits for /dashboard URL transition. Compatible with Webpack-mode Next.js 16 (90s timeout per login) |

## Test discovery

```
Total: 86 tests in 8 files
(43 unique tests × 2 Playwright projects: chromium + Mobile Chrome)
```

Full list archived in `playwright-test-list.txt`.

## Local run — DEFERRED

Chromium download from Google's CDN failed in this sandbox
(`ECONNRESET` / `Failed to download Chrome for Testing 147.0.7727.15`).
No system Chromium available either:

```
$ which chromium chrome google-chrome chromium-browser
(none)
$ npx playwright install chromium
Failed to install browsers ... Download failure, code=1
```

Specs are valid: `npx playwright test --list` enumerates all 86 tests
without errors after the local-binary fix below.

## Local-binary gotcha (resolved)

The sandbox has a stale **global** `playwright@1.56.1` on PATH alongside
the project's `@playwright/test@1.59.1`. Running `npx playwright …` picks
the global binary, which then loads the local `@playwright/test` and
explodes with:

```
Playwright Test did not expect test.describe.configure() to be called here.
```

Workaround: invoke the local binary directly. CI doesn't have the global
clash, so this is local-only.

```bash
cd frontend/next-app
./node_modules/.bin/playwright test --list tests/e2e/golden/
```

## Run instructions (CI / unblocked)

```bash
cd frontend/next-app
npx playwright install --with-deps chromium  # CI step provisions Chromium

# DB seed (only once per pristine CI runner)
cd ../../backend
DATABASE_URL=file:./prisma/dev.db npx prisma db push
DATABASE_URL=file:./prisma/dev.db npx prisma db seed

# Run the suite
cd ../frontend/next-app
./node_modules/.bin/playwright test tests/e2e/golden/
# expect: 86 passed (8 files), exit 0
# HTML report at frontend/next-app/playwright-report/
```

## Phase D Exit Criteria

- [x] 8 golden-path spec files authored
- [x] Fixtures (users + login helper) extracted
- [x] All 86 tests discoverable without compile errors
- [x] Specs target `chromium` + `Mobile Chrome` projects (per existing `playwright.config.ts`)
- [ ] Tests executed locally — **deferred** (sandbox cannot fetch Chromium)
- [ ] Tests executed in CI — pending Phase F workflow update

## Inputs to Phase F

The CI workflow (`.github/workflows/ci.yml`) needs a new job:

```yaml
e2e-golden:
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: frontend/next-app
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '22' }
    - run: npm ci --legacy-peer-deps
    - run: npx playwright install --with-deps chromium
    - run: |
        cd ../../backend
        npm ci
        DATABASE_URL=file:./prisma/dev.db npx prisma db push
        DATABASE_URL=file:./prisma/dev.db npx prisma db seed
    - run: ./node_modules/.bin/playwright test tests/e2e/golden/
    - if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: frontend/next-app/playwright-report/
```

Wired in Phase F.

## Artifacts

```
reports/phase-d/2026-05-07/
├── README.md                      ← this file
└── playwright-test-list.txt       ← all 86 discovered tests
```
