# 2026-03-18 Settings Backup Hardening

## What Changed
- Fixed `frontend/next-app/lib/actions/settings.ts` typing and validation drift.
- Implemented real restore behavior in `backend/src/services/backupService.ts`.
- Simplified `backend/src/routes/settings.ts` restore path and improved backup download 404 handling.
- Added integration coverage for backup download and restore routes.

## Verification
- `cd backend && npx tsc --noEmit`
- `cd backend && npx jest src/tests/integration/settings.api.test.ts --runInBand --forceExit`
- `cd frontend/next-app && npx tsc --noEmit`

## Follow-Up
- Legacy root Vite files still exist and can confuse contributors.
- Frontend lint script still points to `next lint` and fails under the current Next 16 setup.
