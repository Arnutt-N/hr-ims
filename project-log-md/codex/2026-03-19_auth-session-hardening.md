# 2026-03-19 Auth Session Hardening

## What Changed
- Hardened the NextAuth credential flow to reject inactive users.
- Moved tokenVersion, role, and permission refresh logic to run on every JWT callback instead of sign-in only.
- Backfilled missing primary `UserRole` links for legacy users during auth when only the legacy `user.role` string exists.
- Redirected authenticated users away from all public auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`).
- Tightened proxy fallback RBAC so empty permission arrays no longer grant legacy access to admin-only modules.
- Ensured user creation and self-registration write both the legacy `user.role` string and the relational `UserRole` link.

## Verification
- `cd frontend/next-app && npm run lint`
- `cd frontend/next-app && npx tsc --noEmit`

## Follow-Up
- Password reset is still a mock flow and does not touch `EmailVerification` or `tokenVersion`.
- This auth/session hardening landed alongside Next build-output isolation in the same working branch.
- Webpack build verification succeeded once after the dist-dir split, but repeated rebuilds on the same `.next-build` directory still hit Windows file locks on this machine.
