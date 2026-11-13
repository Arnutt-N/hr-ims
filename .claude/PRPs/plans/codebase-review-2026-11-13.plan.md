# PRP Plan: Codebase Review Remediation (2026-11-13)

## Metadata
- **Complexity**: High
- **Source PRD**: `.claude/PRPs/prds/codebase-review-2026-11-13.prd.md`
- **Source Findings**: `.claude/PRPs/findings/codebase-review-2026-11-13-findings.md`
- **Branch**: `fix/codebase-review-2026-11-13`

## Files to Change
- `backend/src/middleware/auth.ts`
- `backend/src/controllers/assetsController.ts`
- `backend/src/controllers/historyController.ts`
- `backend/src/controllers/requestController.ts`
- `backend/src/services/verificationService.ts`
- `backend/src/routes/departments.ts`
- `backend/src/routes/warehouses.ts`
- `backend/src/routes/stock-levels.ts`
- `backend/src/routes/stock-transfers.ts`
- `frontend/next-app/app/api/uploadthing/core.ts`
- `frontend/next-app/next.config.mjs`
- `frontend/next-app/lib/role-sync.ts`
- `frontend/next-app/lib/actions/users.ts`
- `frontend/next-app/lib/actions/stock-transaction.ts`
- `frontend/next-app/lib/actions/cart.ts`
- `frontend/next-app/lib/actions/requests.ts`
- `frontend/next-app/lib/actions/history.ts`
- `frontend/next-app/lib/actions/inventory.ts`
- `frontend/next-app/lib/actions/warehouse.ts`
- `frontend/next-app/lib/actions/categories.ts`
- `frontend/next-app/components/settings/permissions-client.tsx`
- `frontend/next-app/components/dashboard/user-form-dialog.tsx`
- `frontend/next-app/app/(dashboard)/inventory/[id]/ItemHeaderActions.tsx`
- `frontend/next-app/app/(dashboard)/inventory/[id]/StockLevelsTab.tsx`
- `frontend/next-app/tests/actions/__mocks__/prisma.ts`
- `frontend/next-app/tests/actions/audit.test.ts`
- `frontend/next-app/tests/actions/auth.test.ts`
- `frontend/next-app/tests/actions/categories.test.ts`
- `frontend/next-app/tests/actions/departments.test.ts`
- `frontend/next-app/tests/actions/history.test.ts`
- `frontend/next-app/tests/actions/inventory.test.ts`
- `frontend/next-app/tests/actions/maintenance-v6.test.ts`
- `frontend/next-app/tests/actions/maintenance-watchers.test.ts`
- `frontend/next-app/tests/actions/notifications.test.ts`
- `frontend/next-app/tests/actions/reports.test.ts`
- `frontend/next-app/tests/actions/scanner.test.ts`
- `frontend/next-app/tests/actions/sessions.test.ts`
- `frontend/next-app/tests/actions/user-activity.test.ts`
- `frontend/next-app/tests/actions/users.test.ts`
- `frontend/next-app/tests/i18n/parity.test.ts`
- `frontend/next-app/tests/lib/maintenance-middleware.test.ts`
- `backend/src/tests/unit/` and `frontend/next-app/tests/` (regression tests for `F-001`, `F-002`, `F-003`, `F-005`, `F-006`, `F-015`, `F-019`)

## NOT Building
- `D-001` (`proxy.ts` `'test-internal-key'` removal): requires coordinated `.env`/CI/Playwright harness changes.
- `D-002` (`password-reset.ts` SMTP/token flow): feature implementation beyond review-fix scope.
- `D-003` (`/inventory/create` route): new UI feature page.
- `D-004` (`maintenance.ts` 10-action audit refactor): dedicated maintenance module PR.
- `D-005` (`security-e2e.yml` / penetration suite assertions): dedicated CI/security-test task.
- `D-006` (`schema.prisma` `Category` FK + `seed.ts` user reset): requires DB migration + E2E seed verification.
- `D-007` (`inventoryController.ts` / `routes/warehouses.ts` global audit backfill & `inventoryItem.stock` sync): out of scope.
- `D-008` (UI cosmetic ESLint warnings, `<select>`, emoji, `window.prompt` refactors): tracked separately.

## UX Clarity
- **Tasks 1–5**: Internal backend, configuration, and server-action changes (`N/A - internal change`).
- **`frontend/next-app/components/settings/permissions-client.tsx` (`F-014`)**:
  - **Before**: Optimistic permission toggle omits `id`, causing `p.id === existing.id` to evaluate `undefined === undefined` and corrupt unrelated role toggles in the matrix.
  - **After**: Matches composite `(p.role, p.menu)` key and updates only the toggled role/menu cell cleanly.
- **`frontend/next-app/components/dashboard/user-form-dialog.tsx` (`F-023`)**:
  - **Before**: Client validation accepts passwords missing special characters that the server (`users.ts:22`) subsequently rejects on submit.
  - **After**: Client regex `/[!@#$%^&*(),.?":{}|<>]/` matches server validation and renders the inline error before submission.
- **`frontend/next-app/app/(dashboard)/inventory/[id]/ItemHeaderActions.tsx` & `StockLevelsTab.tsx` (`F-022`)**:
  - **Before**: Single `(session?.user as any)?.role` check hides item edit and stock-limit controls from multi-role admins whose primary `role` is `'user'`.
  - **After**: `sessionHasAnyRole(session, ...ADMIN_ROLES)` reveals controls to all admin-tier users.

## Step-by-Step Tasks

### Task 1 — Backend Auth Normalization & Internal Key Guard (`F-002`, `F-003`, `F-019`)
- **Root Cause**: `requireAuth` compares `internalKey !== process.env.INTERNAL_API_KEY` when env var may be undefined (`F-002`); `authenticateToken` leaves `req.user.id` unset when JWT holds `userId` (`F-003`); `historyController.getHistory` only scopes `role === 'user'` (`F-019`).
- **UX**: `N/A - internal change`
- **Fix Strategy**:
  1. In `backend/src/middleware/auth.ts`: guard internal key check with `Boolean(expectedKey && internalKey === expectedKey)` in `requireAuth`; normalize `{ ...user, id: Number(user.id ?? user.userId), userId: Number(user.userId ?? user.id) }` in both `authenticateToken` and `requireAuth`.
  2. In `backend/src/controllers/assetsController.ts` and `backend/src/controllers/historyController.ts`: import `AuthRequest` from `'../middleware/auth'` and resolve `req.user.id ?? req.user.userId`.
  3. In `backend/src/controllers/historyController.ts`: scope `getHistory` to the caller's own `userId` unless `req.user.role` is in `['superadmin', 'admin', 'auditor']`.
- **ACTION**: Edit `backend/src/middleware/auth.ts`, `backend/src/controllers/assetsController.ts`, `backend/src/controllers/historyController.ts`, and add/update unit tests in `backend/src/tests/unit/`.
- **IMPLEMENT**: Add `INTERNAL_API_KEY` non-empty check, normalize `req.user.id` & `req.user.userId`, update `historyController` role allowlist.
- **MIRROR**: `backend/src/controllers/requestController.ts:41` (`req.user.userId ?? req.user.id`).
- **VALIDATE**: `cd backend; npm run build; .\node_modules\.bin\jest src/tests/unit/auth-middleware.test.ts --forceExit`
- **Tests & Regression Risk**: Unit test missing `INTERNAL_API_KEY` returns `401`, JWT `userId` maps to `req.user.id`, and non-admin `technician` history query is scoped to caller `userId` (`F-019`). Low risk since `INTERNAL_API_KEY=test-internal-key` remains valid in test env.

### Task 2 — Backend Verification Token Type Isolation (`F-005`)
- **Root Cause**: `createPasswordResetToken` omits `type: 'PASSWORD_RESET'` and `verifyPasswordResetToken` does not filter by `type`.
- **UX**: `N/A - internal change`
- **Fix Strategy**: Set `type: 'EMAIL_VERIFICATION'` / `'PASSWORD_RESET'` on create/invalidate/verify `EmailVerification` queries in `backend/src/services/verificationService.ts` (`import prisma from '../utils/prisma'`).
- **ACTION**: Edit `backend/src/services/verificationService.ts` and add unit test in `backend/src/tests/unit/`.
- **IMPLEMENT**: Add `type` filter on `findFirst`/`updateMany` and explicit `type` on `create`.
- **MIRROR**: `EmailVerification` model (`type` field) in `backend/prisma/schema.prisma:579-591`.
- **VALIDATE**: `cd backend; npm run build; .\node_modules\.bin\jest src/tests/unit/ --forceExit`
- **Tests & Regression Risk**: Add unit test verifying an `EMAIL_VERIFICATION` token cannot verify as a `PASSWORD_RESET` token. Low risk.

### Task 3 — Backend Request & Stock Route Integrity (`F-004`, `F-006`, `F-009`, `F-010`, `F-011`, `F-020`, `F-021`)
- **Root Cause**: `requestController.updateRequestStatus` skips `pending` check (`F-004`), unvalidated `status` (`F-020`), and passes `tx` to unawaited `checkAndAlertLowStock` (`F-011`); `createRequest` allows non-positive quantities (`F-009`); `stock-transfers.ts` lacks `POST` Zod/access checks and `PATCH` balance/`StockTransaction` writes (`F-006`); `departments.ts`/`warehouses.ts` instantiate `new PrismaClient()` (`F-010`); `stock-levels.ts` `POST /` skips Zod and `PATCH` swallows unexpected errors (`F-021`).
- **UX**: `N/A - internal change`
- **Fix Strategy**:
  1. Imports: `import { z } from 'zod'`, `import prisma from '../utils/prisma'`, `import { assertWarehouseAccess, NotFoundError, parsePositiveInt } from '../lib/authz'`.
  2. `backend/src/controllers/requestController.ts`:
     - `UpdateRequestStatusSchema = z.object({ status: z.enum(['approved', 'rejected', 'cancelled']), rejectionReason: z.string().optional() })`
     - `CreateRequestSchema` items: `quantity: z.coerce.number().int().positive()`
     - Inside `prisma.$transaction`, enforce `if (existingRequest.status !== 'pending')` guard before updating status/stock, and invoke `checkAndAlertLowStock(prisma, ...)` with root `prisma` (not `tx`) after transaction commits.
  3. `backend/src/routes/stock-transfers.ts`:
     - Validate `POST /` with Zod (`fromWarehouseId: z.coerce.number().int().positive()`, `toWarehouseId: z.coerce.number().int().positive()`, `items: z.array(z.object({ itemId: z.coerce.number().int().positive(), quantity: z.coerce.number().int().positive() })).min(1)`) and check `assertWarehouseAccess`.
     - Inside `PATCH /:id` `$transaction`, verify source `stockLevel.quantity >= item.quantity` and create outbound (`-qty`) & inbound (`+qty`) `StockTransaction` rows.
  4. `backend/src/routes/stock-levels.ts`: validate `POST /` with Zod (`quantity: z.coerce.number().int().min(0)`, `minStock: z.coerce.number().int().min(0).optional()`, `maxStock: z.coerce.number().int().min(0).optional()`) and rethrow non-`NotFoundError` errors in `PATCH`.
  5. `backend/src/routes/departments.ts` and `backend/src/routes/warehouses.ts`: replace `new PrismaClient()` with `import prisma from '../utils/prisma'`.
- **ACTION**: Edit `backend/src/controllers/requestController.ts`, `backend/src/routes/stock-transfers.ts`, `backend/src/routes/stock-levels.ts`, `backend/src/routes/departments.ts`, `backend/src/routes/warehouses.ts`.
- **IMPLEMENT**: Apply Zod validation, balance checks, state guard, singleton imports, and error propagation.
- **MIRROR**: `backend/src/routes/requests.ts:3` (`import prisma from '../utils/prisma'`).
- **VALIDATE**: `cd backend; npm run build; .\node_modules\.bin\jest --testPathIgnorePatterns=src/tests/security --forceExit`
- **Tests & Regression Risk**: Update/add unit tests in `requestController.test.ts` and `object-authz.test.ts`. Medium risk if existing tests send mock `tx` without `stockTransaction` — verify all Jest suites pass.

### Task 4 — Frontend UploadThing Auth & Next Config (`F-001`, `F-016`)
- **Root Cause**: `frontend/next-app/app/api/uploadthing/core.ts` has empty `.middleware()` (`F-001`); `frontend/next-app/next.config.mjs` hardcodes `http://localhost:3001` (`F-016`).
- **UX**: `N/A - internal change`
- **Fix Strategy**:
  1. In `frontend/next-app/app/api/uploadthing/core.ts`: `import { auth } from '@/auth';` and `import { UploadThingError } from 'uploadthing/server';`; in both `.middleware()` handlers call `const session = await auth(); if (!session?.user) throw new UploadThingError('Unauthorized'); return { userId: session.user.id };`.
  2. In `frontend/next-app/next.config.mjs`: replace hardcoded `http://localhost:3001` with `process.env.BACKEND_URL || 'http://localhost:3001'`.
- **ACTION**: Edit `frontend/next-app/app/api/uploadthing/core.ts`, `frontend/next-app/next.config.mjs`, and add a Vitest test for UploadThing middleware auth (`F-001`).
- **IMPLEMENT**: Add `auth()` + `UploadThingError` and dynamic `BACKEND_URL`.
- **MIRROR**: `frontend/next-app/lib/actions/cart.ts` (`import { auth } from '@/auth'`).
- **VALIDATE**: `cd frontend/next-app; npm run lint; .\node_modules\.bin\vitest run`
- **Tests & Regression Risk**: Vitest verifies unauthenticated UploadThing middleware throws `UploadThingError('Unauthorized')`. Low risk; `BACKEND_URL` defaults to `http://localhost:3001`.

### Task 5 — Frontend Server Actions Security, Roles & Audit (`F-007`, `F-008`, `F-009`, `F-012`, `F-013`, `F-015`, `F-017`)
- **Root Cause**: `users.ts` logs password hash (`F-007`); `receiveGoods` lacks `APPROVER_ROLES` (`F-008`); `addToCart` lacks positive Zod validation (`F-009`); `requests.ts` decrements stock without balance check (`F-012`); `role-sync.ts` deletes secondary roles (`F-013`); `history.ts` accepts invalid dates (`F-015`); 9 mutations across `inventory.ts`/`warehouse.ts`/`categories.ts` lack transactional `AuditLog` (`F-017`).
- **UX**: `N/A - internal change`
- **Fix Strategy**:
  1. `frontend/next-app/lib/actions/users.ts`: redact `password` before passing payload to `logActivity`.
  2. `frontend/next-app/lib/actions/stock-transaction.ts`: `import { sessionHasAnyRole, APPROVER_ROLES } from '@/lib/role-access';` and `import { z } from 'zod';`; enforce `sessionHasAnyRole(session, ...APPROVER_ROLES)` and `z.coerce.number().int().positive()` in `receiveGoods`.
  3. `frontend/next-app/lib/actions/cart.ts`: `import { z } from 'zod';`; validate `addToCart` with `z.object({ itemId: z.coerce.number().int().positive(), quantity: z.coerce.number().int().positive() })`.
  4. `frontend/next-app/lib/actions/requests.ts`: check `stockLevel.quantity >= reqItem.quantity` before decrementing in `updateRequestStatus`.
  5. `frontend/next-app/lib/role-sync.ts`: remove `deleteMany` that wipes secondary roles; upsert primary role idempotently.
  6. `frontend/next-app/lib/actions/history.ts`: validate optional `startDate`/`endDate` strings with `!Number.isNaN(Date.parse(d))` and return `{ success: false, error: 'Invalid date' }` on invalid inputs; add unit test case for invalid date string (`F-015`).
  7. Wrap all 9 CUD functions in `prisma.$transaction` with `tx.auditLog.create({ data: { userId, action, entity, entityId, details } })` matching `lib/actions/audit.ts:55-65`:
     - `frontend/next-app/lib/actions/inventory.ts`: `createInventoryItem`, `updateInventoryItem`, `deleteInventoryItem`, `importInventoryItems`
     - `frontend/next-app/lib/actions/warehouse.ts`: `createWarehouse`, `updateWarehouse`
     - `frontend/next-app/lib/actions/categories.ts`: `createCategory`, `updateCategory`, `deleteCategory`
- **ACTION**: Edit `frontend/next-app/lib/actions/users.ts`, `frontend/next-app/lib/actions/stock-transaction.ts`, `frontend/next-app/lib/actions/cart.ts`, `frontend/next-app/lib/actions/requests.ts`, `frontend/next-app/lib/role-sync.ts`, `frontend/next-app/lib/actions/history.ts`, `frontend/next-app/lib/actions/inventory.ts`, `frontend/next-app/lib/actions/warehouse.ts`, `frontend/next-app/lib/actions/categories.ts`.
- **IMPLEMENT**: Apply each scoped fix and update matching Vitest mocks/assertions.
- **MIRROR**: `frontend/next-app/lib/actions/stock-management.ts` (`sessionHasAnyRole` + `$transaction` + `tx.auditLog.create` with `{ userId, action, entity, entityId, details }`).
- **VALIDATE**: `cd frontend/next-app; .\node_modules\.bin\vitest run tests/actions/`
- **Tests & Regression Risk**: Run all action unit tests after edits to catch any mock missing `$transaction` or `auditLog`.

### Task 6 — Frontend UI Bugs & Test TypeScript Fixes (`F-014`, `F-018`, `F-022`, `F-023`)
- **Root Cause**: `permissions-client.tsx` matches by `id` (`F-014`); `ItemHeaderActions.tsx` & `StockLevelsTab.tsx` check single `role` (`F-022`); `user-form-dialog.tsx` omits special char check (`F-023`); 17 test files fail `tsc --noEmit` (`F-018`).
- **UX**: See `## UX Clarity` above for Before/After states on all 4 UI files (`F-014`, `F-022`, `F-023`).
- **Fix Strategy**:
  1. `frontend/next-app/components/settings/permissions-client.tsx`: match composite `(p.role === role && p.menu === menu)` instead of `p.id === existing.id`.
  2. `frontend/next-app/app/(dashboard)/inventory/[id]/ItemHeaderActions.tsx` & `frontend/next-app/app/(dashboard)/inventory/[id]/StockLevelsTab.tsx`: `import { sessionHasAnyRole, ADMIN_ROLES } from '@/lib/role-access';` and replace single `role` check with `sessionHasAnyRole(session, ...ADMIN_ROLES)`.
  3. `frontend/next-app/components/dashboard/user-form-dialog.tsx`: add special-character regex `/[!@#$%^&*(),.?":{}|<>]/` matching `users.ts:22`.
  4. Fix all 17 failing TypeScript test files (`F-018`):
     - `frontend/next-app/tests/actions/__mocks__/prisma.ts`: add `groupBy: Mock;` to `type Crud` and `groupBy: vi.fn()` to `makeCrud()` (fixes `TS2339` in `reports.test.ts`).
     - 14 action test files (`audit.test.ts`, `auth.test.ts`, `categories.test.ts`, `departments.test.ts`, `history.test.ts`, `inventory.test.ts`, `maintenance-v6.test.ts`, `maintenance-watchers.test.ts`, `notifications.test.ts`, `reports.test.ts`, `scanner.test.ts`, `sessions.test.ts`, `user-activity.test.ts`, `users.test.ts` under `frontend/next-app/tests/actions/`): replace direct module-to-mock casts `(await import(...)) as { ... }` with `as unknown as { ... }` (fixes `TS2352`), and in `audit.test.ts:141` type `(_args, result: { id: number })` (fixes `TS18046`).
     - `frontend/next-app/tests/i18n/parity.test.ts:25-26`: replace `[...enKeys]` / `[...thKeys]` with `Array.from(enKeys)` / `Array.from(thKeys)` (fixes `TS2802` under es5 target).
     - `frontend/next-app/tests/lib/maintenance-middleware.test.ts:92,121`: type `args` as `{ where?: Record<string, unknown> }` (fixes `TS2339`).
- **ACTION**: Edit the 4 UI files and the 17 test files.
- **IMPLEMENT**: Fix UI logic and test types.
- **MIRROR**: `frontend/next-app/lib/role-access.ts` (`sessionHasAnyRole`).
- **VALIDATE**: `cd frontend/next-app; .\node_modules\.bin\tsc --noEmit; npm run lint; .\node_modules\.bin\vitest run`
- **Tests & Regression Risk**: `tsc --noEmit` must exit `0` across the entire `frontend/next-app` project.

## Validation Commands
- Backend: `cd backend; $env:DATABASE_URL="file:./prisma/dev.db"; $env:INTERNAL_API_KEY="test-internal-key"; npm run build; .\node_modules\.bin\jest --testPathIgnorePatterns=src/tests/security --forceExit; .\node_modules\.bin\jest src/tests/security/authz/rbac-matrix.test.ts --forceExit`
- Frontend: `cd frontend/next-app; .\node_modules\.bin\tsc --noEmit; npm run lint; .\node_modules\.bin\vitest run`

## Testing Strategy
- Backend unit tests verify auth normalization, missing `INTERNAL_API_KEY` rejection, non-admin history scoping (`F-019`), token-type isolation (`F-005`), non-pending request rejection, and transfer balance checks.
- Frontend Vitest suites verify UploadThing unauthenticated rejection (`F-001`), `receiveGoods` role guard, `addToCart` positive validation, `history.ts` invalid date rejection (`F-015`), `updateRequestStatus` stock check, `role-sync` role preservation, and `tsc --noEmit` clean pass.

## Acceptance Criteria & Risks
- Zero unresolved Critical or High findings (G3).
- `tsc --noEmit` exits `0` in both `backend` and `frontend/next-app`.
- All backend unit + `rbac-matrix` tests and frontend Vitest + ESLint pass.
- Risk: `updateInventoryItem`/`warehouse`/`categories` `$transaction` mocks in existing Vitest tests — verified by running full `vitest run`.
