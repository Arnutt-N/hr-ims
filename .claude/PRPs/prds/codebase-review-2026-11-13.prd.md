# PRD: Codebase Review Remediation (2026-11-13)

**Source Findings**: `.claude/PRPs/findings/codebase-review-2026-11-13-findings.md`
**Branch**: `fix/codebase-review-2026-11-13`

## Problem Statement
Four independent read-only review passes (security, backend, frontend, tests/CI) identified 7 Critical, 11 High, and 5 Medium accepted defects across authentication, authorization, stock/request transactions, role synchronization, audit logging, and TypeScript test hygiene.

## Goals & Requirements
1. **Auth & Upload Boundaries (`F-001`, `F-002`, `F-003`, `F-005`, `F-007`, `F-013`, `F-019`)**:
   - Require `auth()` on UploadThing routes (`F-001`).
   - Require non-empty `INTERNAL_API_KEY` in `requireAuth` (`F-002`).
   - Normalize `req.user.id` and `req.user.userId` across `authenticateToken`, `requireAuth`, and controllers (`F-003`).
   - Enforce `type` isolation on verification vs password-reset tokens (`F-005`).
   - Redact `password` hashes from `AuditLog` in `updateUser` (`F-007`).
   - Preserve secondary roles in `ensureUserHasPrimaryRole` (`F-013`).
   - Scope `historyController.getHistory` by `userId` for all roles except `superadmin`, `admin`, `auditor` (`F-019`).
2. **Inventory, Stock, Transfer & Request Integrity (`F-004`, `F-006`, `F-008`, `F-009`, `F-010`, `F-011`, `F-012`, `F-017`, `F-020`, `F-021`)**:
   - Prevent duplicate approvals in `requestController.updateRequestStatus` (`F-004`) and validate `status` enum (`F-020`).
   - Pass root `prisma` instead of `tx` to `checkAndAlertLowStock` (`F-011`).
   - Validate positive quantities and warehouse access on `POST /api/stock-transfers` and check source stock + write `StockTransaction` rows inside `PATCH /api/stock-transfers/:id` (`F-006`).
   - Enforce `APPROVER_ROLES` and positive integers in `receiveGoods` (`F-008`), `addToCart` / `createRequest` (`F-009`), and `POST /api/stock-levels` (`F-021`).
   - Verify stock balance before decrementing in frontend `updateRequestStatus` (`F-012`).
   - Use shared `prisma` singleton in `departments.ts` and `warehouses.ts` (`F-010`).
   - Wrap `inventory.ts`, `warehouse.ts`, and `categories.ts` CUD operations with `AuditLog` writes inside `prisma.$transaction` (`F-017`).
3. **Frontend & Test Type-Safety (`F-014`, `F-015`, `F-016`, `F-018`, `F-022`, `F-023`)**:
   - Fix composite key matching in `permissions-client.tsx` (`F-014`).
   - Validate date filters in `history.ts` (`F-015`).
   - Read `process.env.BACKEND_URL` in `next.config.mjs` rewrites (`F-016`).
   - Support multi-role RBAC in `ItemHeaderActions.tsx` and `StockLevelsTab.tsx` (`F-022`).
   - Align special-char password check in `user-form-dialog.tsx` (`F-023`).
   - Resolve all remaining `tsc --noEmit` errors in `frontend/next-app/tests/` (`F-018`).
