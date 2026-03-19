# 2026-03-19 Lint And Root Cleanup

## What Changed
- Installed and configured ESLint for the Next app.
- Switched the frontend lint script to `eslint .`.
- Removed the root Vite app files and root Vite-era dependencies.
- Cleaned the remaining frontend lint warnings down to zero.
- Fixed follow-on frontend typecheck issues in `auth.ts`, `check-overdue-button.tsx`, and `use-toast.ts`.
- Verified root lint now delegates to the working frontend lint flow.

## Verification
- `cd frontend/next-app && npm run lint`
- `cd frontend/next-app && npx tsc --noEmit`
- `npm run lint`
- `npm run build` could not be cleanly re-verified because the local `.next` directory was locked on Windows and `npx next build --webpack` later timed out after producing build artifacts.

## Follow-Up
- Frontend lint now reports zero warnings and zero errors.
- Root `node_modules/` may still contain stale packages locally even though `package.json` and `package-lock.json` are clean.
