# 2026-04-01 Route Verification and Fixes

## Summary
- Fixed Next.js proxy role resolution so middleware now respects JWT-derived roles and permissions.
- Aligned sidebar visibility and submenu behavior with actual routes and role access.
- Removed false 404s from invalid inventory image sources.
- Hardened backup listing against missing backup directories.
- Re-verified end-to-end role flows in production-mode with browser automation.

## Verification
- Smoke report: `output/playwright/role-route-smoke.json`
- Result:
  - superadmin: 25/25
  - admin: 21/21
  - approver: 7/7
  - auditor: 9/9
  - technician: 8/8
  - user: 6/6
- Login/logout passed for all tested roles

## Notes
- `Email Config` is now effectively superadmin-only in the UI to match backend authorization.
- `backupService` now creates the target directory before listing/cleanup.
- Invalid `image` values in seeded/demo inventory data no longer create browser 404 noise.
