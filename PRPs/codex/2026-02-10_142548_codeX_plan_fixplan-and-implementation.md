# Plan: Fix Plan + High-Risk Fix Implementation

**Metadata**
- Agent: CodeX (OpenAI)
- Timestamp: 2026-02-10 14:25:48
- Repo: D:\02 genAI\hr-ims
- Target Output: PRPs/codeX

## 1) Prioritized Fix Plan (Owners + Estimates)

P0 (Critical)
- Auth middleware activation (Next.js): rename/duplicate `frontend/next-app/proxy.ts` -> `frontend/next-app/middleware.ts`, confirm headers injected for `/api/*`.
  - Owner: Frontend
  - Estimate: 0.5 day
  - Dependencies: none
- Multi-role header parsing in backend: support comma-separated roles in `x-user-role` and update `requireRole`/`authorize` to accept arrays.
  - Owner: Backend
  - Estimate: 0.5 day
  - Dependencies: middleware activation
- Password reset hashing mismatch: replace SHA-256 with bcrypt in `backend/src/routes/email.ts` and enforce policy where appropriate.
  - Owner: Backend
  - Estimate: 0.5 day
  - Dependencies: none

P1 (High)
- Prisma schema unification: treat `backend/prisma/schema.prisma` as source of truth; integrate NextAuth models (Account/Session/VerificationToken) if required; regenerate clients for both frontend and backend.
  - Owner: Backend + Frontend
  - Estimate: 2-3 days
  - Dependencies: confirm desired auth strategy
- Inventory stock model standardization: migrate flows from `InventoryItem.stock` to `StockLevel`, update cart/request logic, and provide data backfill script.
  - Owner: Backend + Frontend
  - Estimate: 3-5 days
  - Dependencies: schema stability

P2 (Medium)
- Wire operational middleware and jobs: register rate limiting, request logging, and error logging in `backend/src/index.ts`; start backup cron job.
  - Owner: Backend
  - Estimate: 1 day
  - Dependencies: settings availability
- Role cleanup: remove `hr` references or add role to Role enum/seed data; align with RBAC.
  - Owner: Backend
  - Estimate: 0.5 day
  - Dependencies: RBAC alignment
- Align frontend settings routes with sidebar links (remove or implement missing pages).
  - Owner: Frontend
  - Estimate: 1 day

P3 (Low)
- Deprecate or archive legacy Vite app at repo root (`/src`).
  - Owner: Frontend
  - Estimate: 0.5 day
- Port alignment: set backend default to 3001 and document in env examples.
  - Owner: Backend
  - Estimate: 0.25 day

## 2) Implementation Plan: High-Risk Fixes (Immediate)

### Scope
Address the three highest-risk issues first:
1) Password reset hashing mismatch
2) Missing Next.js middleware for API header injection
3) Backend multi-role header parsing and authorization checks

### Step-by-step Plan

1. Confirm current behavior (static + minimal runtime check)
- Review `backend/src/routes/email.ts` for reset flow hashing.
- Verify `frontend/next-app/proxy.ts` is not active as middleware.
- Verify backend auth expects a single role string.
- Define exact acceptance criteria.

2. Implement fixes
- Password reset hashing
  - Replace SHA-256 with bcrypt hash (same cost as registration/login).
  - Ensure new password policy checks are applied if enabled.
- Middleware activation
  - Add `frontend/next-app/middleware.ts` that exports the content of `proxy.ts`.
  - Ensure matcher excludes static and API auth endpoints properly.
- Backend role parsing
  - Update `requireAuth` to parse `x-user-role` into `roles[]` and set both `role` (primary) and `roles`.
  - Update `requireRole` and `authorize` to allow `roles[]` and accept any match.

3. Add/Update tests
- Add or update backend unit tests for role parsing and authorization.
- Add a minimal integration test to validate header-based auth with multi-role.
- Validate password reset login flow.

4. Validation & rollout
- Run targeted tests (backend Jest unit/integration).
- Sanity check authentication on a protected route via `/api` rewrite.

### Target Files
- `backend/src/routes/email.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/middleware/rbac.ts`
- `frontend/next-app/proxy.ts` (source)
- `frontend/next-app/middleware.ts` (new)

### Acceptance Criteria
- Password reset uses bcrypt and allows login with new password.
- Next.js middleware injects `x-user-id` and `x-user-role` for `/api/*` requests.
- Backend authorization accepts multi-role users and blocks unauthorized roles.
- No regression in existing auth flows.

### Estimated Effort
- Total: 1.5 to 2 days
  - Password reset fix: 0.5 day
  - Middleware activation: 0.5 day
  - Role parsing + tests: 0.5 to 1 day

### Risks & Mitigations
- Risk: Breaking existing JWT auth flow. Mitigation: keep JWT path intact and only extend header-based auth.
- Risk: Role parsing changes authorization logic. Mitigation: add unit tests for single-role and multi-role cases.

## Open Questions
- Should backend JWT auth be deprecated in favor of NextAuth-only for internal UI traffic?
- Is the NextAuth schema intended to live in the backend Prisma schema or remain frontend-only?

