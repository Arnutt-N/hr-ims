# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HR-IMS (Human Resource & Inventory Management System) is an enterprise-grade web application for managing organizational assets and inventory with integrated HR workflows. The system implements role-based access control (RBAC), comprehensive audit logging, multi-warehouse inventory management, and bilingual (Thai/English) UI.

**Architecture**: Monorepo with a Next.js (App Router) frontend and an Express.js backend, sharing a single Prisma schema and database. The frontend is the primary surface — most data operations run through Next.js Server Actions. The Express backend is used for standalone API access, background jobs, queues, and search indexing.

## Tech Stack

- **Frontend**: Next.js 16.1 (App Router, Webpack), React 19, TypeScript, Tailwind CSS v4, Shadcn UI (Radix primitives), Framer Motion, Recharts
- **Backend**: Express.js 4, TypeScript, Prisma ORM
- **Database**: SQLite (development source-of-truth schema) / MySQL-compatible TiDB (production, generated from the SQLite schema via a transform script)
- **Authentication**: NextAuth.js v5 (beta) with Credentials provider + JWT strategy
- **Validation**: Zod (frontend v4, backend v3)
- **Queues / Cache**: Redis + BullMQ (backups, email queue), node-cache (in-process)
- **Search**: Meilisearch (optional)
- **File uploads**: UploadThing
- **Email**: Nodemailer (Gmail SMTP); Telegram bot for admin alerts (optional)
- **Logging**: Winston with daily-rotate-file
- **Testing**: Vitest (frontend), Jest + Supertest (backend), Playwright (E2E)
- **Network**: Optional Cloudflare Tunnel for public exposure
- **i18n**: Custom Thai/English provider (`lib/i18n/`)

## Development Commands

### Frontend (Next.js App)
```bash
cd frontend/next-app
npm run dev          # Dev server on port 3000 (Webpack)
npm run build        # Production build
npm run start        # Start production server
npm run test         # Run Vitest tests
npm run test:ui      # Vitest UI mode
npm run lint         # ESLint
```

### Backend (Express API)
```bash
cd backend
npm run dev                # nodemon (hot reload) on src/index.ts
npm run build              # Compile TypeScript to dist/
npm start                  # Run compiled dist/index.js
npm test                   # Jest
npm run test:watch         # Jest watch
npm run test:coverage      # Jest with coverage
npm run prisma:generate    # Prisma generate (SQLite source schema)
npm run prisma:dbpush      # Prisma db push (SQLite source schema)
```

### Database Management (Prisma)
```bash
cd backend
npx prisma generate               # Generate Prisma Client (both apps)
npx prisma db push                # Push schema changes to database
npx prisma migrate dev            # Create + apply a dev migration
npx prisma migrate deploy         # Apply migrations (production)
npx prisma studio                 # Open Prisma Studio GUI
npx prisma db seed                # Run prisma/seed.ts
```

### TiDB (MySQL) Schema Pipeline
Production targets a MySQL-flavored TiDB cluster. The SQLite schema in `backend/prisma/schema.prisma` is the single source of truth; a transform script generates a MySQL variant on-demand:
```bash
cd backend
npm run db:prepare:tidb     # Generate MySQL-flavored schema copy
npm run db:generate:tidb    # Prisma generate against TiDB schema
npm run db:push:tidb        # Prisma db push against TiDB schema
npm run db:seed:tidb        # Generate + seed against TiDB
```
See `docs/TIDB_SETUP.md` and `backend/scripts/prepare-tidb-prisma.js`.

### Quick Start Scripts (Windows)
- `start_backend.bat` - Starts Express server
- `start_frontend.bat` - Starts Next.js dev server
- `start_tunnel.bat` / `start-tunnel.sh` - Starts Cloudflare Tunnel
- `fix-db.bat` - Local DB recovery helper

### Docker (local infra)
`docker-compose.yml` provisions Redis (port 6379) and Meilisearch (port 7700) for local development. Bring them up with `docker compose up -d` before running queue-dependent or search-dependent code paths.

## Project Structure

### Shared Database Architecture

**Critical**: This monorepo uses a single SQLite database at `backend/prisma/dev.db`. Both frontend and backend access it through Prisma Client.

- **Schema source-of-truth**: `backend/prisma/schema.prisma`
- **Prisma Generators** declared in that schema:
  - `client` → `backend/node_modules/@prisma/client`
  - `client_frontend` → `frontend/next-app/node_modules/.prisma/client`
- **Database file**: `backend/prisma/dev.db`

**When modifying the schema**:
1. Edit `backend/prisma/schema.prisma`
2. From `backend/`, run `npx prisma generate` (regenerates BOTH clients)
3. Run `npx prisma db push` (or `migrate dev`) to apply to SQLite
4. If the change must reach production, also regenerate the TiDB client (`npm run db:generate:tidb`)

### Frontend Architecture (`frontend/next-app/`)

**Top-level files**:
- `auth.ts` - NextAuth.js v5 setup, JWT callbacks, multi-role + permissions hydration
- `auth.config.ts` - Authorized callback (route gating logic)
- `proxy.ts` - Next middleware: legacy role-prefix gating + internal API key checks
- `next.config.mjs`, `tailwind.config.js`, `postcss.config.js`, `prisma.config.ts`
- `vitest.config.ts`, `playwright.config.ts`
- `next-auth.d.ts` - Module augmentation for Session/JWT types

**App Router structure** (`app/`):
- `(dashboard)/` - Protected routes (require auth)
  - `dashboard/`, `inventory/`, `cart/`, `requests/`, `warehouse/`, `users/`,
    `settings/`, `logs/`, `my-assets/`, `maintenance/`, `scanner/`, `reports/`,
    `history/`, `tags/`
  - `layout.tsx` - shared dashboard chrome
- `login/`, `register/`, `forgot-password/`, `reset-password/` - auth flows
- `api/` - Route handlers (kept minimal; see Server Actions for most logic)
- `debug/` - dev-only debugging surface
- `globals.css`, `print.css`, `layout.tsx`, `page.tsx`

**Server Actions** (`lib/actions/`) — all DB writes flow through here:
`assets.ts`, `audit.ts`, `auth.ts`, `cart.ts`, `categories.ts`, `dashboard.ts`,
`departments.ts`, `history.ts`, `inventory.ts`, `maintenance.ts`,
`notifications.ts`, `password-reset.ts`, `permissions.ts`, `register.ts`,
`reports.ts`, `requests.ts`, `scanner.ts`, `sessions.ts`, `settings.ts`,
`stock-management.ts`, `stock-transaction.ts`, `test-email.ts`, `users.ts`,
`warehouse.ts`.

Each Server Action is responsible for: auth check → role/permission check → Zod validation → Prisma transaction (if multi-step) → audit log → `revalidatePath`.

**Library helpers** (`lib/`):
- `prisma.ts` - Prisma Client singleton
- `auth-cache.ts`, `settings-cache.ts` - Short-lived in-memory caches to slim hot paths
- `auth-guards.ts` - Reusable session/role guards for Server Actions
- `role-access.ts`, `role-access.test.ts`, `role-sync.ts` - Role normalization + UserRole reconciliation
- `i18n/` - Thai/English message catalogs, page titles, server + provider helpers
- `meilisearch.ts` - Search client
- `mail.ts` - Nodemailer wrapper used by Server Actions
- `uploadthing.ts` - Upload route definitions
- `safe-image.ts`, `date-utils.ts`, `utils.ts` - UI helpers
- `migrations/` - One-off frontend-side data migrations
- `types/` - Shared TS types (e.g. `user-types.ts`)
- `api-types.ts` - openapi-typescript generated types from `backend/openapi.json`

**Components** (`components/`):
- `ui/` - Shadcn UI primitives
- `auth/`, `dashboard/`, `inventory/`, `warehouse/`, `settings/`, `layout/`
- `providers.tsx` - Top-level client providers (theme, toaster, i18n)

**Authentication / Session shape**:
- NextAuth.js v5 Credentials + JWT
- Session user includes: `id`, `email`, `name`, `image`, `role` (primary slug), `roles` (string[] of all role slugs), `permissions` (string[] of allowed paths), `tokenVersion`
- The JWT callback in `auth.ts` re-validates `tokenVersion` on every request — bumping `User.tokenVersion` invalidates all outstanding sessions for that user
- `auth.config.ts` `authorized()` gates all non-public routes; `proxy.ts` (Next middleware) layers legacy role-prefix rules on top

### Backend Architecture (`backend/src/`)

`index.ts` boots the Express server with CORS, Helmet, request logging, rate limiting, and route mounting. Cron registration and queue workers are also wired here.

**Layout**:
- `controllers/` - Request handlers per domain
- `routes/` - Route definitions (`assets.ts`, `auth.ts`, `departments.ts`, `email.ts`, `health.ts`, `history.ts`, `inventory.ts`, `requests.ts`, `settings.ts`, `stock-levels.ts`, `stock-transactions.ts`, `stock-transfers.ts`, `users.ts`, `warehouses.ts`)
- `middleware/` - `auth.ts`, `rbac.ts`, `rateLimiter.ts`, `requestLogger.ts`, `validate.ts`
- `services/` - `backupService.ts`, `emailService.ts`, `notificationService.ts`, `searchService.ts`, `verificationService.ts`
- `queues/` - BullMQ queues: `backupQueue.ts`, `emailQueue.ts`
- `jobs/` - Workers: `backupJob.ts`
- `utils/` - `cache.ts` (node-cache), `logger.ts` (Winston), `passwordPolicy.ts`, `prisma.ts`, `settings.ts`, `swagger.ts`
- `tests/` - Jest test trees: `unit/`, `integration/`, `security/` (with `auth/`, `authz/`, `api/`, `injection/`, `infra/`, `pentest/`, `utils/`)

**OpenAPI**: `backend/openapi.json` is generated by `backend/export-swagger.ts` and consumed by the frontend via `openapi-typescript` to produce `lib/api-types.ts`.

**Note**: The frontend primarily uses Server Actions and bypasses the Express API for in-app data flows. The Express layer exists for: external API consumers, background jobs, search indexing, scheduled tasks, Swagger docs, and integration tests.

## Security Architecture

### Authentication & Authorization
- **Password Hashing**: Bcrypt
- **Password Policy**: Enforced server-side via `backend/src/utils/passwordPolicy.ts` and on registration/reset Server Actions
- **Multi-Role RBAC**: Users hold many roles via `UserRole`; permissions resolve via `RolePermission`
- **Roles**: `superadmin`, `admin`, `approver`, `auditor`, `technician`, `user`
- **Session Invalidation**: `User.tokenVersion` checked in the JWT callback on every request
- **Route gating**: `auth.config.ts` (App Router) + `proxy.ts` (legacy prefix rules) + Server Action role checks

### Data Integrity
- **Audit Logging**: All CUD operations write to `AuditLog` with `action`, `tableName`, `recordId`, `userId`, `oldData`, `newData`
- **Server Actions**: All mutating operations are server-side, not exposed REST endpoints
- **Zod Validation**: All Server Action inputs and Express request bodies
- **Prisma Transactions**: Multi-step writes (e.g. request approval + stock decrement) wrapped atomically
- **Reserved Stock**: Pending requests reserve stock on creation; released on rejection/cancel/return (see `lib/actions/requests.ts`, `services/notificationService.ts`)

### Network Security
- Helmet.js security headers (backend)
- `express-rate-limit` on Express routes
- Optional Cloudflare Tunnel — see `CLOUDFLARE-TUNNEL.md`
- `INTERNAL_API_KEY` enforced by `proxy.ts` for internal API routes
- Security test suite: `backend/src/tests/security/` (OWASP Top 10)

## Database Schema Highlights

Defined in `backend/prisma/schema.prisma`. Provider is `sqlite` locally; production runs MySQL/TiDB via the transform script.

**Identity & Access**:
- `User`, `Role`, `UserRole`, `RolePermission`
- `PasswordHistory`, `EmailVerification`

**Inventory & Workflow**:
- `InventoryItem`, `Category`, `CartItem`
- `Request`, `RequestItem` (borrow/withdraw/return workflows)
- `Warehouse`, `StockLevel`, `StockTransfer`, `StockTransaction`
- `History`, `Notification`, `Settings`

**HR / Org Structure**:
- `Ministry`, `Department`, `Division`, `WorkGroup1`, `WorkGroup2`,
  `OrganizationUnit`, `Personnel`, `PersonnelType`, `NamePrefix`,
  `PositionCategory`, `PositionLevel`, `DepartmentMapping`

**Geography**:
- `Province`, `Region`, `InspectionZone`, `CustomProvinceZone`

**Cross-cutting**:
- `AuditLog` - canonical audit trail for all CUD ops

> SQLite has no native enums; role and status fields are `String` with documented allowed values.

## Environment Variables

### Frontend (`frontend/next-app/.env`)
```
DATABASE_URL="file:../../backend/prisma/dev.db"   # absolute path also OK
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
AUTH_SECRET=...
INTERNAL_API_KEY=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="HR-IMS <noreply@hr-ims.com>"
CRON_SECRET=...
UPLOADTHING_TOKEN=...
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=...
```

### Backend (`backend/.env`)
```
PORT=3000
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
REDIS_URL=redis://localhost:6379
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=...
TELEGRAM_BOT_TOKEN=optional
TELEGRAM_ADMIN_CHAT_ID=optional
```

`.env.example` files exist in both apps. The two `DATABASE_URL`s must point at the same SQLite file.

## Testing Strategy

### Frontend (Vitest)
- Unit/component tests under `frontend/next-app/tests/components/`
- E2E (Playwright) under `frontend/next-app/tests/e2e/`
- Run: `npm test` / `npm run test:ui` from `frontend/next-app/`
- Playwright: `npx playwright test` (config: `playwright.config.ts`)

### Backend (Jest)
- Tree under `backend/src/tests/`:
  - `unit/` - controllers, services, utils
  - `integration/` - Supertest against the Express app
  - `security/` - OWASP Top 10 coverage (`auth/`, `authz/`, `api/`, `injection/`, `infra/`, `pentest/`, `utils/`)
  - `health.test.ts` - liveness probe
- Run: `npm test`, `npm run test:watch`, `npm run test:coverage`
- Run only security tests: `npm test -- --testPathPattern=security`

### CI
- `.github/workflows/ci.yml` - frontend lint+test, backend test, vercel-build, TiDB schema validation
- `.github/workflows/security-e2e.yml` - security/E2E suite

## Common Development Workflows

### Adding a New Inventory Feature
1. Update `backend/prisma/schema.prisma`
2. From `backend/`: `npx prisma generate && npx prisma db push`
3. Add Server Action in `frontend/next-app/lib/actions/`
4. Add UI in `frontend/next-app/components/...` and a page under `app/(dashboard)/`
5. Write audit log entries in the Server Action
6. Add Vitest coverage; if backend exposes the surface, add Jest coverage too
7. Update `lib/i18n/messages.ts` for any new user-facing strings (TH + EN)

### Adding Role-Based Access
- In Server Actions, prefer the `auth-guards.ts` helpers and check `session.user.roles` (array) and `session.user.permissions` (array of allowed paths)
- For UI gating, read from `useSession()` / `auth()` and use `role-access.ts` helpers
- For new path-based permissions, add a `RolePermission` row (the JWT callback in `auth.ts` will pick it up on next refresh)

### Database Schema Changes
1. Edit `backend/prisma/schema.prisma`
2. `npx prisma migrate dev --name <change>` (creates SQL + applies)
3. `npx prisma generate` (regenerates BOTH clients)
4. Update `backend/prisma/seed.ts` if needed
5. If shipping to TiDB: `npm run db:generate:tidb && npm run db:push:tidb`
6. Sanity check: `npx prisma migrate reset` against a scratch DB

### Troubleshooting Database Issues
Helpers in `backend/`:
- `check-db-status.js` - connectivity check
- `verify_db.ts` - schema integrity
- `verify_seed.ts` / `check-seed.ts` - seed verification
- `verify_users.ts` - user table sanity
- `fix-admin.ts` - reset admin user password
- `migrate-warehouse.js` - one-off warehouse migration helper

## Important Patterns

### Server Action Pattern
```typescript
'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const Schema = z.object({ /* ... */ });

export async function createItem(input: unknown) {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const roles = (session.user as any).roles ?? [];
  if (!roles.some((r: string) => ['admin', 'superadmin'].includes(r))) {
    return { error: 'Forbidden' };
  }

  const parsed = Schema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input', issues: parsed.error.format() };

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.inventoryItem.create({ data: parsed.data });
    await tx.auditLog.create({
      data: {
        action: 'CREATE',
        tableName: 'InventoryItem',
        recordId: String(created.id),
        userId: Number(session.user.id),
        newData: created as any,
      },
    });
    return created;
  });

  revalidatePath('/inventory');
  return { success: true, data: result };
}
```

### Multi-Role Authorization (DB-side check)
```typescript
const session = await auth();
const userWithRoles = await prisma.user.findUnique({
  where: { id: Number.parseInt(session!.user.id) },
  include: { userRoles: { include: { role: true } } },
});

const hasRole = (slug: string) =>
  userWithRoles?.userRoles.some((ur) => ur.role.slug === slug) ?? false;

if (!hasRole('admin') && !hasRole('superadmin')) {
  return { error: 'Forbidden' };
}
```

The session itself already carries `roles` and `permissions` arrays — prefer those for hot paths and only hit the DB when you need fresh authoritative data.

### Audit Logging Pattern
Every CUD Server Action should write to `AuditLog` with: `action` (`CREATE`/`UPDATE`/`DELETE`), `tableName`, `recordId`, `userId`, and snapshots in `oldData` / `newData`. Wrap the mutation + the audit write in `prisma.$transaction` so audits never drift from data.

## Notes for AI Assistants

- **Database Path**: Use absolute paths or paths relative to project root. Both apps must agree on the same SQLite file.
- **Prisma Client**: Always run `prisma generate` from `backend/` — the schema's `client_frontend` generator regenerates the frontend client too.
- **Server Actions over API routes**: For frontend data flows, default to Server Actions. Reach for the Express API only when something external needs it.
- **Authorization**: Check session and roles in every Server Action. The middleware/proxy is defense-in-depth, not the only line of defense.
- **Audit Logs**: Required for all CUD ops, in the same transaction as the mutation.
- **Type Safety**: Lean on Prisma-generated types; avoid `as` assertions except where session augmentation forces it.
- **Revalidation**: Call `revalidatePath()` (or `revalidateTag()`) after mutations.
- **Multi-Role**: Sessions carry `roles: string[]` and `permissions: string[]`. Don't treat the legacy single `role` field as authoritative.
- **i18n**: User-facing strings should go through `lib/i18n/`. Both Thai and English copies are required.
- **Caches**: `lib/auth-cache.ts` and `lib/settings-cache.ts` are short-lived in-memory caches. If you change underlying data, ensure the cache key/TTL still makes sense.
- **Queues**: BullMQ workers (`backend/src/queues/`, `backend/src/jobs/`) need Redis running locally — start `docker compose up -d` first.
- **TiDB**: Don't hand-edit a MySQL schema; edit the SQLite source-of-truth and re-run the transform script.

## Documentation

- **README.md** - Project overview and quick start (Thai/English)
- **AGENTS.md** - Cross-AI agent operating manual for this repo
- **GEMINI.md**, **QWEN.md** - Per-assistant guidance counterparts
- **SYSTEM_DOCUMENTATION_TH.md** - User manual (Thai)
- **CLOUDFLARE-TUNNEL.md** - Cloudflare Tunnel setup
- **docs/**
  - `USER_GUIDE_TH.md`, `ADMIN_GUIDE_TH.md`, `TECHNICAL_GUIDE_TH.md`
  - `USER_MANUAL_COMPLETE_TH.md`
  - `TIDB_SETUP.md`
  - `README_DOCS.md`
- **PRPs/**, **plans/** - Project planning artifacts

## AI Collaboration Protocol

This project uses multiple AI assistants working together. You may encounter work done by other AIs.

### AI Assistants in This Project

| AI | Role | Specialty |
|----|------|-----------|
| **Antigravity (Gemini)** | Lead Developer | Full-stack development, security testing, implementations |
| **Claude Code (Claude)** | Developer | Code quality, architecture, complex logic |
| **Kilo Code** | Researcher | System analysis, documentation, recommendations |
| **CodeX (OpenAI)** | Developer | Code generation, debugging, optimization |

### Key Collaboration Files

1. **`.agents/AI_COLLABORATION_PROTOCOL.md`** - Full collaboration guide (READ THIS FIRST)
2. **`project-log-md/handoff/HANDOFF_BOARD.md`** - Shared handoff dashboard
3. **`project-log-md/handoff/logs/`** - Task handoff logs between AIs
4. **`project-log-md/kilo/`** - Kilo Code's analysis and recommendations
5. **`project-log-md/antigravity/`**, **`project-log-md/codex/`**, **`project-log-md/common/`** - Per-agent session notes
6. **`.agents/skills/`** - Reusable skills/knowledge for all AIs
7. **`.agents/workflows/`** - Shared workflow commands
8. **`.claude/skills/`** - Claude-specific skill packs (also exposed via the Skill tool)

### Before Starting Work

1. Check `project-log-md/handoff/HANDOFF_BOARD.md` and recent logs in `project-log-md/handoff/logs/`
2. Review recent Git commits to see what changed
3. Read relevant skills in `.agents/skills/` if working on a specific domain (e.g. `auth-rbac`, `prisma-schema`, `stock-inventory-thai-gov`)

### After Completing Work

Create a handoff log at `project-log-md/handoff/logs/YYYY-MM-DD_HHmm_claude_code_to_any.md` and update `project-log-md/handoff/HANDOFF_BOARD.md`:

```markdown
# Handoff Log

| Field | Value |
|-------|-------|
| **Date** | YYYY-MM-DD HH:mm |
| **From Agent** | claude_code |
| **To Agent** | any |
| **Session Duration** | n/a |
| **Remark** | Short context |

## Summary
[What you did]

## Files Changed
- `path/to/file.ts` - Description

## Handoff Tasks
- [ ] Task 1
- [ ] Task 2

## Notes
[Important context for next AI]
```

### Recent Notable Work

- **Auth/perf hardening** (#13): Slim JWT payload, cache auth + settings lookups, add `roleId` index — see `lib/auth-cache.ts`, `lib/settings-cache.ts`
- **Inventory/tags + sessions fixes** (#12)
- **Reserve stock for pending requests** — `lib/actions/requests.ts` + low-stock alerts
- **Superadmin RBAC fix in proxy middleware** (#5, #4) — `proxy.ts`
- **i18n pass (Thai/English)** across settings, dialogs, notifications, register form
- **Unified PageLoader** (#6, #7) — consistent navigation UX
- **Security testing framework** (Antigravity) — `backend/src/tests/security/` covers OWASP Top 10
- **System analysis** (Kilo) — see `project-log-md/kilo/`

### Git Commit Convention for AIs

```
[AI-NAME] Brief description

Examples:
[Claude] Refactor authentication middleware
[Antigravity] Add security testing framework
[Kilo] System analysis documentation
```
