
----------------------------------------
## Release Log: 2026-01-16 16:55:00

Commit: (Latest HEAD)
Message: feat: implement email notifications system, sync schema, and fix auth redirect

Changes:
- Implemented Email Notification System (Overdue & Status Updates)
- Synchronized Frontend-Backend Prisma Schema
- Fixed Auth Redirect Loop Issue
- Added Test Email Button in Settings

----------------------------------------
## Release Log: 2026-01-19 16:21:00

Commit: (v0.2.0)
Message: feat: warehouse performance optimization, auth redirect loop fix, and legacy vite cleanup

Changes:
- Refactored Warehouse Management to use Next.js Server Components.
- Optimized bundle size with `optimizePackageImports`.
- Added Division selection field in Warehouse Dialog.
- Fixed critical 307 Auth Redirect Loop between Dashboard and Login.
- Removed legacy Vite configuration and source files from project root.
- Migrated `middleware.ts` to `proxy.ts` (Next.js 16 recommendation).
