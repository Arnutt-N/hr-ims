
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
 
---------------------------------------- 
## Release Log: Tue 01/20/2026 17:09:04.99 

----------------------------------------
## Release Log: Tue Jan 20 17:15:45 SEAST 2026
commit be5d8ee180a58a1958d4b479638021b3974e9833 (HEAD -> main, tag: v1.1.0, origin/main)
Author: Arnutt Noitumyae <arnutt.n@moj.go.th>
Date:   Tue Jan 20 16:59:10 2026 +0700

    feat: Implement Multi-Role RBAC and System Notifications

 .agent/workflows/start_dev.md                      |   4 +-
 backend/prisma/dev.db                              | Bin 192512 -> 200704 bytes
 backend/prisma/schema.prisma                       |  38 +++++
 .../app/(dashboard)/settings/permissions/page.tsx  |  11 ++
 frontend/next-app/app/layout.tsx                   |   5 +-
 frontend/next-app/auth.config.ts                   |  11 +-
 frontend/next-app/auth.ts                          |  53 +++++--
 .../components/dashboard/low-stock-widget.tsx      | 100 +++++++++++++
 frontend/next-app/components/layout/header.tsx     |   5 +-
 .../components/layout/notification-bell.tsx        |  88 ++++++++++++
 frontend/next-app/components/layout/sidebar.tsx    |  42 ++++--
 frontend/next-app/components/providers.tsx         |  11 ++
 .../components/settings/permissions-client.tsx     | 156 +++++++++++++++++++++
 .../components/settings/warehouse-client.tsx       |   2 +-
 .../components/settings/warehouse-dialog.tsx       |   7 +-
 frontend/next-app/components/ui/checkbox.tsx       |  30 ++++
 frontend/next-app/components/ui/popover.tsx        |  31 ++++
 frontend/next-app/components/ui/scroll-area.tsx    |  48 +++++++
 frontend/next-app/delete_middleware.bat            |  11 ++
 frontend/next-app/lib/actions/auth.ts              |   8 +-
 frontend/next-app/lib/actions/dashboard.ts         | 108 ++++++++------
 frontend/next-app/lib/actions/inventory.ts         |  24 +---
 frontend/next-app/lib/actions/notifications.ts     | 115 +++++++++------
 frontend/next-app/lib/actions/permissions.ts       |  59 ++++++++
 frontend/next-app/lib/migrations/migrate-roles.ts  |  77 ++++++++++
 frontend/next-app/middleware.ts                    |  59 --------
 frontend/next-app/package-lock.json                |  31 ++++
 frontend/next-app/package.json                     |   3 +
 frontend/next-app/prisma/schema.prisma             |  39 +++++-
 frontend/next-app/proxy.ts                         |  79 +++++++----
 frontend/next-app/types/next-auth.d.ts             |  29 ++++
 project-log-md/2026-01-20_status-report.md         |  30 ++++
 project-log-md/git-history.md                      |  14 ++
 start_backend.bat                                  |   4 +
 start_frontend.bat                                 |   4 +
 35 files changed, 1103 insertions(+), 233 deletions(-)
-e "\n----------------------------------------\n## Release Log: $(date)\n" 
 
---------------------------------------- 
## Release Log: Fri 01/23/2026 12:44:49.65 

----------------------------------------
## Release Log: Fri Jan 23 12:45:03 SEAST 2026

commit 8b319d58e25a3d93852bff28c72d48b58eee7509 (HEAD -> main, origin/main)
Author: Arnutt Noitumyae <arnutt.n@moj.go.th>
Date:   Fri Jan 23 12:42:36 2026 +0700

    feat: implement notifications, 3-tier warehouse, cf-tunnel, enhanced reports, and session management

 CLOUDFLARE-TUNNEL.md                               |  39 ++++
 backend/prisma/dev.db                              | Bin 233472 -> 233472 bytes
 frontend/next-app/app/(dashboard)/reports/page.tsx |  33 ++--
 .../next-app/app/(dashboard)/settings/page.tsx     |   6 +-
 .../app/(dashboard)/settings/sessions/page.tsx     | 127 ++++++++++++
 frontend/next-app/app/print.css                    |  68 +++++++
 frontend/next-app/auth.ts                          |  45 +++--
 frontend/next-app/lib/actions/sessions.ts          |  68 +++++++
 frontend/next-app/next-auth.d.ts                   |  26 +--
 frontend/next-app/package-lock.json                |  42 ++++
 frontend/next-app/package.json                     |   7 +-
 frontend/next-app/prisma/schema.prisma             |  39 ++++
 frontend/next-app/scripts/check-history.js         |  16 ++
 .../next-app/scripts/check-latest-notification.js  |  17 ++
 frontend/next-app/scripts/seed-history.js          |  27 +++
 .../next-app/scripts/test-notification-flow.js     | 217 +++++++++++++++++++++
 .../next-app/scripts/test-provincial-warehouse.js  | 123 ++++++++++++
 start-tunnel.sh                                    |   9 +
 18 files changed, 851 insertions(+), 58 deletions(-)
  
----------------------------------------  
## Release Log: Fri 01/23/2026 13:28:58.94  
  
----------------------------------------  
## Release Log: Fri 01/23/2026 13:29:25.74  
  
----------------------------------------  
## Release Log: Fri 01/23/2026 13:29:44.93  
commit c415028f373df1d1e880b64df0c53cfa9b1aecbc (HEAD -> main, origin/main)
Author: Arnutt Noitumyae <arnutt.n@moj.go.th>
Date:   Fri Jan 23 13:26:11 2026 +0700

    feat(ui): improve UI consistency - button colors, focus ring, and audit logs pagination

 .../app/(dashboard)/settings/categories/page.tsx   |  2 +-
 .../settings/departments/AddMappingDialog.tsx      |  2 +-
 frontend/next-app/app/globals.css                  |  8 +--
 .../components/settings/warehouse-client.tsx       |  2 +-
 frontend/next-app/components/ui/checkbox.tsx       |  2 +-
 project-log-md/git-history.md                      | 33 +++++++++++
 project-log-md/session_2026-01-23_132031.md        | 65 ++++++++++++++++++++++
 7 files changed, 106 insertions(+), 8 deletions(-)
  
----------------------------------------  
## Release Log: Mon 01/26/2026 18:07:16.93  
---------------------------------------- 
## Release Log: Mon 01/26/2026 18:15:00 
Message: feat: implement low stock notification system and fix auth proxy for Next.js 16 
 
Changes: 
- Added NotificationBell and automated low stock checks 
- Migrated middleware.ts to proxy.ts for Next.js 16 compatibility 
- Fixed Cloudflare Tunnel redirect back to localhost 
- Standardized RBAC and removed legacy debugging files 
----------------------------------------
## Release Log: Mon Jan 26 18:11:50 SEAST 2026
commit 153913c2ad1b73beb8a8b92ac049be12c324d752 (HEAD -> main, tag: v1.0.1, origin/main)
Author: Arnutt Noitumyae <arnutt.n@moj.go.th>
Date:   Mon Jan 26 18:06:23 2026 +0700

    feat: implement low stock notification system and fix auth redirect logic

 .agent/workflows/start_dev.md                      |   5 +
 backend/prisma/dev.db                              | Bin 233472 -> 233472 bytes
 .../app/(dashboard)/settings/categories/page.tsx   |  64 ++++++-
 .../settings/departments/mapping-client.tsx        | 147 +++++++++++++++
 .../app/(dashboard)/settings/departments/page.tsx  |  50 +----
 .../components/layout/notification-bell.tsx        | 201 ++++++++++++++-------
 .../components/settings/warehouse-client.tsx       |  70 +++++--
 frontend/next-app/lib/actions/notifications.ts     |  19 ++
 frontend/next-app/next.config.mjs                  |  14 +-
 frontend/next-app/proxy.ts                         |  26 +--
 frontend/next-app/scripts/seed-notifications.js    |  56 ++++++
 project-log-md/git-history.md                      |  23 +++
 project-log-md/session_2026-01-26_164851.md        |  49 +++++
 start_tunnel.bat                                   |  12 ++
 14 files changed, 577 insertions(+), 159 deletions(-)
