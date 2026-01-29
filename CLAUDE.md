# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HR-IMS (Human Resource & Inventory Management System) is an enterprise-grade web application for managing organizational assets and inventory with integrated HR workflows. The system implements role-based access control (RBAC), comprehensive audit logging, and multi-warehouse inventory management.

**Architecture**: Monorepo with Next.js frontend and Express.js backend sharing a single Prisma database.

## Tech Stack

- **Frontend**: Next.js 16.1 (App Router), TypeScript, Tailwind CSS v4, Shadcn UI
- **Backend**: Express.js, TypeScript, Prisma ORM
- **Database**: SQLite (development) / PostgreSQL (production ready)
- **Authentication**: NextAuth.js v5 with JWT strategy
- **Testing**: Vitest (frontend), Jest (backend), Playwright (E2E)

## Development Commands

### Frontend (Next.js App)
```bash
cd frontend/next-app
npm run dev          # Start development server on port 3000
npm run build        # Production build
npm run start        # Start production server
npm run test         # Run Vitest tests
npm run test:ui      # Run Vitest with UI
npm run lint         # Run ESLint
```

### Backend (Express API)
```bash
cd backend
npm run dev          # Start with nodemon (hot reload)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled code from dist/
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Database Management (Prisma)
```bash
cd backend
npx prisma generate               # Generate Prisma Client
npx prisma db push                # Push schema changes to database
npx prisma migrate dev            # Create and apply migration
npx prisma migrate deploy         # Apply migrations (production)
npx prisma studio                 # Open Prisma Studio GUI
npx prisma db seed                # Seed database with initial data
```

### Quick Start Scripts
Root directory contains batch scripts for Windows:
- `start_backend.bat` - Starts Express server
- `start_frontend.bat` - Starts Next.js dev server
- `start_tunnel.bat` - Starts Cloudflare Tunnel (if configured)

## Project Structure

### Shared Database Architecture

**Critical**: This monorepo uses a single SQLite database located at `backend/prisma/dev.db`. Both frontend and backend access the same database through Prisma Client.

- **Schema Definition**: `backend/prisma/schema.prisma` (single source of truth)
- **Prisma Generators**:
  - `client` → `backend/node_modules/@prisma/client`
  - `client_frontend` → `frontend/next-app/node_modules/@prisma/client`
- **Database Location**: `backend/prisma/dev.db`

**Important**: When modifying the schema:
1. Edit `backend/prisma/schema.prisma`
2. Run `npx prisma generate` from `backend/` directory
3. This regenerates clients for BOTH frontend and backend
4. Changes are immediately available to both apps

### Frontend Architecture (`frontend/next-app/`)

**App Router Structure**:
- `app/(dashboard)/` - Protected routes requiring authentication
  - `/dashboard` - Main dashboard with stats and notifications
  - `/inventory` - Inventory management (CRUD operations)
  - `/cart` - Shopping cart for requisitions
  - `/requests` - View and manage requisition requests
  - `/warehouse` - Multi-warehouse management
  - `/users` - User management (admin only)
  - `/settings` - System settings and user roles
  - `/logs` - Audit logs (superadmin/auditor)
  - `/my-assets` - Personal borrowed items
  - `/maintenance` - Maintenance tickets
  - `/scanner` - QR/Barcode scanning
  - `/reports` - Analytics and reporting
  - `/history` - Transaction history

- `app/login/` - Authentication page
- `app/register/` - User registration
- `app/api/` - API routes (minimal, most logic in Server Actions)

**Server Actions** (`lib/actions/`):
- All database operations are implemented as Server Actions (not API routes)
- Files: `inventory.ts`, `requests.ts`, `users.ts`, `warehouse.ts`, `cart.ts`, `audit.ts`, etc.
- Server Actions handle authorization, validation (Zod), and audit logging

**Components** (`components/`):
- `ui/` - Shadcn UI components (Button, Dialog, Form, etc.)
- `dashboard/` - Dashboard-specific components
- `inventory/` - Inventory-related components
- `warehouse/` - Warehouse management components
- `auth/` - Authentication components

**Authentication Flow**:
- NextAuth.js v5 with Credentials provider
- JWT strategy with custom callbacks in `auth.ts`
- Session includes: `id`, `email`, `role`, `tokenVersion`, `roles[]` (multi-role support)
- Authorization checks in `auth.config.ts` protect dashboard routes
- Multi-role system: Users can have multiple roles via `UserRole` junction table

### Backend Architecture (`backend/src/`)

**Express Server** (`index.ts`):
- RESTful API (minimal usage, frontend primarily uses Server Actions)
- Middleware: CORS, Helmet (security headers), authentication
- Routes organized by domain in `routes/`

**Structure**:
- `controllers/` - Request handlers
- `middleware/` - Authentication, error handling, validation
- `routes/` - Route definitions
- `services/` - Business logic layer
- `utils/` - Helper functions

**Note**: The backend is primarily used for standalone API access. Most frontend operations use Next.js Server Actions directly, bypassing the Express API.

## Security Architecture

### Authentication & Authorization
- **Password Hashing**: Bcrypt for all passwords
- **Multi-Role RBAC**: Users can have multiple roles simultaneously
- **Roles**: `superadmin`, `admin`, `approver`, `auditor`, `technician`, `user`
- **Session Invalidation**: `tokenVersion` field enables forced logout
- **Middleware Protection**: Server-side authorization checks

### Data Integrity
- **Audit Logging**: All CUD operations logged to `AuditLog` table with before/after snapshots
- **Server Actions**: All database operations server-side (not exposed API endpoints)
- **Zod Validation**: Input validation on all forms and actions
- **Transaction Support**: Critical operations wrapped in Prisma transactions

### Network Security
- Cloudflare Tunnel support (optional) - see `CLOUDFLARE-TUNNEL.md`
- Helmet.js security headers (backend)
- NextAuth.js secure session handling

## Database Schema Highlights

### Core Models
- **User**: Authentication, roles, departments, status tracking
- **Role**: Role definitions with permissions
- **UserRole**: Many-to-many user-role assignments
- **InventoryItem**: Assets with serial numbers, categories, stock levels
- **Request**: Requisition requests (borrow/withdraw/return)
- **RequestItem**: Line items in requests
- **StockLevel**: Per-warehouse stock tracking
- **Warehouse**: Multi-warehouse support
- **AuditLog**: Comprehensive audit trail
- **Notification**: In-app notifications

### Key Relationships
- Users have multiple roles via `UserRole`
- Items have stock levels per warehouse via `StockLevel`
- Requests contain multiple items via `RequestItem`
- All major tables have audit logs via `AuditLog`

## Environment Variables

### Frontend (`.env` in `frontend/next-app/`)
```
DATABASE_URL="file:d:/02 genAI/hr-ims/backend/prisma/dev.db"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
AUTH_SECRET=your-secret-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="HR-IMS <noreply@hr-ims.com>"
CRON_SECRET=your-cron-secret
```

### Backend (`.env` in `backend/`)
```
PORT=3000
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=your-jwt-secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
TELEGRAM_BOT_TOKEN=optional
TELEGRAM_ADMIN_CHAT_ID=optional
```

**Note**: Both `.env.example` files contain templates. DATABASE_URL must point to the same SQLite file.

## Testing Strategy

### Frontend Tests (Vitest)
- Component tests in `frontend/next-app/tests/`
- Run: `npm test` from `frontend/next-app/`
- UI mode: `npm run test:ui`

### Backend Tests (Jest)
- Unit tests in `backend/src/tests/`
- Run: `npm test` from `backend/`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`

### E2E Tests (Playwright)
- Config: `frontend/next-app/playwright.config.ts`
- Test files: `frontend/next-app/tests/e2e/` (if exists)

## Common Development Workflows

### Adding a New Inventory Feature
1. Update schema: `backend/prisma/schema.prisma`
2. Generate Prisma Client: `cd backend && npx prisma generate`
3. Push schema: `npx prisma db push`
4. Create Server Action: `frontend/next-app/lib/actions/inventory.ts`
5. Add UI component: `frontend/next-app/components/inventory/`
6. Create page: `frontend/next-app/app/(dashboard)/inventory/`
7. Add audit logging in Server Action

### Adding Role-Based Access
1. Check user roles in Server Action: `const session = await auth()`
2. Verify `session.user.roles` or `session.user.role`
3. For UI: Use `session.user.role` in client components
4. For multi-role: Query `UserRole` table via Prisma

### Database Schema Changes
1. Edit `backend/prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name your_migration_name`
3. Regenerate clients: `npx prisma generate`
4. Update seed file if needed: `backend/prisma/seed.ts`
5. Test with fresh database: `npx prisma migrate reset`

### Troubleshooting Database Issues
Scripts available in `backend/`:
- `check-db-status.js` - Check database connectivity
- `verify_db.ts` - Verify schema integrity
- `verify_seed.ts` - Verify seed data
- `fix-admin.ts` - Reset admin user password

## Documentation

- **README.md** - Project overview and quick start (Thai/English)
- **SYSTEM_DOCUMENTATION_TH.md** - User manual (Thai)
- **docs/** - Detailed documentation
  - `USER_GUIDE_TH.md` - End-user guide
  - `ADMIN_GUIDE_TH.md` - Administrator guide
  - `TECHNICAL_GUIDE_TH.md` - Technical architecture guide
- **CLOUDFLARE-TUNNEL.md** - Cloudflare Tunnel setup

## Important Patterns

### Server Actions Pattern
```typescript
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createItem(formData: FormData) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  // Authorization check
  if (!['admin', 'superadmin'].includes(session.user.role)) {
    return { error: 'Forbidden' }
  }

  // Validate with Zod
  // Execute database operation
  // Create audit log
  // Revalidate path

  revalidatePath('/inventory')
  return { success: true }
}
```

### Multi-Role Authorization
```typescript
const session = await auth()
const userWithRoles = await prisma.user.findUnique({
  where: { id: parseInt(session.user.id) },
  include: { userRoles: { include: { role: true } } }
})

const hasRole = (slug: string) =>
  userWithRoles?.userRoles.some(ur => ur.role.slug === slug)

if (!hasRole('admin') && !hasRole('superadmin')) {
  return { error: 'Forbidden' }
}
```

### Audit Logging Pattern
All Server Actions that modify data should create audit log entries in the `AuditLog` table with `action`, `tableName`, `recordId`, `userId`, `oldData`, and `newData`.

## Notes for AI Assistants

- **Database Path**: Always use absolute paths for DATABASE_URL or relative to project root
- **Prisma Client**: Generate from `backend/` directory only - it auto-updates both clients
- **Server Actions**: Prefer Server Actions over API routes for frontend data operations
- **Authorization**: Always check session and roles in Server Actions
- **Audit Logs**: Create audit entries for all CUD operations
- **Type Safety**: Use Prisma-generated types; avoid type assertions
- **Revalidation**: Call `revalidatePath()` after mutations to refresh cached data
- **Multi-Role**: Users can have multiple roles - check `userRoles` array, not just single `role` field

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

1. **`.agent/AI_COLLABORATION_PROTOCOL.md`** - Full collaboration guide (READ THIS FIRST)
2. **`research/handoffs/`** - Task handoff documents between AIs
3. **`research/kilo/`** - Kilo Code's analysis and recommendations
4. **`.agent/skills/`** - Reusable skills/knowledge for all AIs
5. **`.agent/workflows/`** - Shared workflow commands

### Before Starting Work

1. Check `research/handoffs/` for any pending tasks from other AIs
2. Review recent Git commits to see what was changed
3. Read relevant skills in `.agent/skills/` if working on specific domains

### After Completing Work

Create a handoff document at `research/handoffs/YYYY-MM-DD_task-name_claude-to-any.md`:

```markdown
# Task Handoff: [Task Name]

**From:** Claude Code
**To:** Any
**Date:** YYYY-MM-DD
**Status:** Completed/In Progress

## Summary
[What you did]

## Files Changed
- `path/to/file.ts` - Description

## Next Steps
- [ ] Task 1
- [ ] Task 2

## Notes
[Important context for next AI]
```

### Recent Work Done by Other AIs

#### Security Testing Framework (by Antigravity - 2026-01-29)
- Created comprehensive security tests in `backend/src/tests/security/`
- Covers OWASP Top 10: SQLi, XSS, JWT, IDOR, Privilege Escalation
- Includes automated scanner and report generator
- **Run tests:** `cd backend && npm test -- --testPathPattern=security`

#### System Analysis (by Kilo Code - 2026-01-29)
- Analysis report: `research/kilo/01_system_analysis_report.md`
- Recommendations: `research/kilo/02_system_improvement_recommendations.md`
- Priority items: Rate Limiting, Logging, Password Policy

### Git Commit Convention for AIs

```
[AI-NAME] Brief description

Examples:
[Claude] Refactor authentication middleware
[Antigravity] Add security testing framework
[Kilo] System analysis documentation
```
