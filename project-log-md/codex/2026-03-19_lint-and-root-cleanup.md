# 2026-03-19 Lint And Root Cleanup

## What Changed
- Installed and configured ESLint for the Next app.
- Switched the frontend lint script to `eslint .`.
- Removed the root Vite app files and root Vite-era dependencies.
- Cleaned the remaining frontend lint warnings down to zero.
- Fixed follow-on frontend typecheck issues in `auth.ts`, `check-overdue-button.tsx`, and `use-toast.ts`.
- Split Next dev/build output directories to avoid Windows file-lock collisions and aligned the frontend build script to `next build --webpack`.
- Added role-sync helpers so newly registered users and admin-created users also get a `UserRole` relation instead of relying only on the legacy `User.role` string.
- Hardened auth/session routing so inactive users are rejected, auth pages redirect consistently, and empty permission arrays no longer bypass legacy admin-only routes.
- Verified root lint now delegates to the working frontend lint flow.

## Verification
- `cd frontend/next-app && npm run lint`
- `cd frontend/next-app && npx tsc --noEmit`
- `npm run lint`
- `cd frontend/next-app && npx next build --webpack` completed successfully once after the dist-dir split

## Follow-Up
- Frontend lint now reports zero warnings and zero errors.
- Root `node_modules/` may still contain stale packages locally even though `package.json` and `package-lock.json` are clean.
- Re-running webpack builds against the same `.next-build` directory still hits Windows file locks on this machine, so build verification is currently reliable for a fresh build but not for immediate repeated rebuilds.
