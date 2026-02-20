# HR-IMS Project Context

## Project Overview

**HR-IMS (Human Resource & Inventory Management System)** is an enterprise-grade monorepo application for managing organizational assets, inventory, and HR workflows. The system implements role-based access control (RBAC), comprehensive audit logging, and multi-warehouse inventory management.

**Architecture**: Monorepo with Next.js 16 frontend and Express.js backend sharing a single SQLite database via Prisma ORM.

**Key Features**:
- Multi-role RBAC (superadmin, admin, approver, auditor, technician, user)
- Inventory management (durable/consumable items)
- Requisition workflow (borrow/withdraw/return)
- Multi-warehouse stock tracking
- Maintenance/breakdown reporting
- QR/Barcode scanning support
- Comprehensive audit logging
- Analytics and reporting

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16.1 (App Router), React 19, TypeScript |
| **UI Framework** | Tailwind CSS v4, Shadcn UI (Radix UI components) |
| **Backend** | Express.js, TypeScript |
| **Database** | SQLite (dev) / PostgreSQL (production) via Prisma ORM |
| **Authentication** | NextAuth.js v5 (Credentials + JWT) |
| **Testing** | Vitest (frontend), Jest (backend), Playwright (E2E) |
| **Validation** | Zod schemas |
| **Security** | Helmet, bcrypt, express-rate-limit |

---

## Project Structure

```
hr-ims/
├── frontend/next-app/          # Next.js 16 App Router
│   ├── app/                    # App Router pages
│   │   ├── (dashboard)/        # Protected routes
│   │   ├── login/              # Public auth
│   │   └── api/                # API routes (minimal)
│   ├── components/             # React components
│   │   ├── ui/                 # Shadcn UI primitives
│   │   ├── dashboard/          # Dashboard components
│   │   ├── inventory/          # Inventory components
│   │   └── auth/               # Auth components
│   ├── lib/                    # Utilities
│   │   ├── actions/            # Server Actions (CRUD)
│   │   └── prisma.ts           # Prisma client singleton
│   ├── tests/                  # Vitest + Playwright tests
│   └── auth.ts                 # NextAuth configuration
│
├── backend/                    # Express.js API
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── routes/             # Route definitions
│   │   ├── middleware/         # Auth, validation, rate limiting
│   │   ├── services/           # Business logic
│   │   └── tests/              # Jest tests
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema (Single Source of Truth)
│   │   └── dev.db              # SQLite database
│   └── package.json
│
├── docs/                       # Documentation (Thai language)
│   ├── USER_GUIDE_TH.md
│   ├── ADMIN_GUIDE_TH.md
│   └── TECHNICAL_GUIDE_TH.md
│
├── .agent/                     # AI Agent configuration
│   ├── AI_COLLABORATION_PROTOCOL.md
│   ├── skills/                 # Knowledge base
│   └── workflows/              # Slash commands
│
├── research/                   # AI research & handoffs (gitignored)
│   ├── handoffs/               # Task handoff documents
│   └── [ai-name]/              # Per-AI analysis
│
└── project-log-md/             # Project logs by AI
    ├── antigravity/
    ├── claude_code/
    └── kilo/
```

---

## Critical Architecture Notes

### Shared Database Pattern

**⚠️ CRITICAL**: Both frontend and backend access the same SQLite database file.

- **Database Location**: `backend/prisma/dev.db`
- **Schema Definition**: `backend/prisma/schema.prisma` (Single Source of Truth)
- **Prisma Generators**: Schema generates clients for both locations:
  - `backend/node_modules/@prisma/client`
  - `frontend/next-app/node_modules/.prisma/client`

**When modifying schema**:
```bash
cd backend
npx prisma generate    # Regenerates clients for BOTH frontend & backend
npx prisma db push     # Apply changes to database
```

### Server Actions Pattern (Frontend)

Most database operations use Next.js Server Actions instead of API routes:

```typescript
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// 1. Define Zod schema
const Schema = z.object({ /* ... */ })

// 2. Server Action
export async function createItem(formData: FormData) {
  // Authentication
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }
  
  // Authorization
  if (!['admin', 'superadmin'].includes(session.user.role)) {
    return { error: 'Forbidden' }
  }
  
  // Validation
  const validated = Schema.parse(Object.fromEntries(formData))
  
  // Database operation + Audit logging
  const result = await prisma.item.create({ data: validated })
  
  // Revalidate cache
  revalidatePath('/inventory')
  
  return { success: true, data: result }
}
```

### Multi-Role Authorization Pattern

Users can have multiple roles via `UserRole` junction table:

```typescript
const userWithRoles = await prisma.user.findUnique({
  where: { id: parseInt(session.user.id) },
  include: { userRoles: { include: { role: true } } }
})

const hasRole = (slug: string) =>
  userWithRoles?.userRoles.some(ur => ur.role.slug === slug)

const hasAnyRole = (slugs: string[]) =>
  slugs.some(slug => hasRole(slug))

// Usage
if (!hasAnyRole(['admin', 'superadmin'])) {
  return { error: 'Forbidden' }
}
```

### Audit Logging Pattern

All CUD (Create, Update, Delete) operations must log to `AuditLog` table:

```typescript
await prisma.auditLog.create({
  data: {
    action: 'CREATE',
    entity: 'InventoryItem',
    entityId: result.id.toString(),
    userId: parseInt(session.user.id),
    newValue: JSON.stringify(result),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  }
})
```

---

## Building and Running

### Prerequisites
- Node.js v18+
- npm

### Installation

```bash
# Install frontend dependencies
cd frontend/next-app
npm install

# Install backend dependencies
cd backend
npm install
```

### Development

```bash
# Frontend (port 3000)
cd frontend/next-app
npm run dev

# Backend (port 3001)
cd backend
npm run dev
```

**Windows Batch Scripts** (from project root):
- `start_frontend.bat` - Start Next.js dev server
- `start_backend.bat` - Start Express dev server
- `start_tunnel.bat` - Start Cloudflare Tunnel (if configured)

### Production Build

```bash
# Frontend
cd frontend/next-app
npm run build
npm start

# Backend
cd backend
npm run build
npm start
```

### Database Commands

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Create and apply migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio GUI (port 5555)
npx prisma studio

# Seed database
npx prisma db seed

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

---

## Testing

### Frontend (Vitest)

```bash
cd frontend/next-app

# Run all tests
npm test

# Run with UI
npm run test:ui

# Run single test file
npm test -- path/to/file.test.tsx

# Run tests matching pattern
npm test -- -t "should render"
```

### Backend (Jest)

```bash
cd backend

# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Run single test file
npm test -- path/to/file.test.ts

# Run security tests
npm test -- --testPathPattern=security

# Run unit tests
npm test -- --testPathPattern=unit
```

### E2E (Playwright)

```bash
cd frontend/next-app
npx playwright test
```

---

## Development Conventions

### TypeScript

- **Strict Mode**: Enabled in `tsconfig.json`
- **Avoid `any`**: Use Prisma-generated types
- **Type Annotations**: Required for function parameters and return types

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `InventoryTable`, `UserCard` |
| Functions | camelCase | `fetchInventory`, `createUser` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| UI Components | kebab-case | `button.tsx`, `dialog.tsx` |
| Server Actions | camelCase | `createInventoryItem` |
| Types/Interfaces | PascalCase | `UserProps` |

### Import Order

```typescript
// 1. Third-party libraries
import bcrypt from 'bcrypt'
import { z } from 'zod'

// 2. Internal absolute imports (@/)
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// 3. Relative imports
import { helper } from './utils'
```

### Code Style

- **Server Actions**: All database operations must include authentication, authorization, validation, and audit logging
- **Error Handling**: Return `{ success: false, error: 'message' }` pattern for Server Actions
- **Transactions**: Use Prisma transactions for critical multi-step operations
- **Revalidation**: Always call `revalidatePath()` after mutations in Server Actions

---

## Environment Variables

### Frontend (`frontend/next-app/.env`)

```env
DATABASE_URL="file:../backend/prisma/dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
AUTH_SECRET="your-secret-key"
```

### Backend (`backend/.env`)

```env
PORT=3001
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-jwt-secret"
```

---

## Key Files Reference

| File | Description |
|------|-------------|
| `backend/prisma/schema.prisma` | Database schema (Single Source of Truth) |
| `frontend/next-app/auth.ts` | NextAuth.js configuration |
| `frontend/next-app/lib/actions/*.ts` | All Server Actions |
| `backend/src/middleware/auth.ts` | Authentication middleware |
| `CLAUDE.md` | Detailed development guide |
| `AGENTS.md` | AI Agent collaboration protocol |
| `.agent/AI_COLLABORATION_PROTOCOL.md` | Multi-AI workflow guide |

---

## AI Collaboration

This project uses multiple AI assistants. Key protocols:

### Before Starting Work
1. Check `research/handoffs/` for pending tasks
2. Review recent git commits
3. Read relevant skills in `.agent/skills/`

### After Completing Work
1. Create handoff document at `research/handoffs/YYYY-MM-DD_task-name.md`
2. Update project log in `project-log-md/[ai-name]/`
3. Commit with format: `[AI-NAME] brief description`

### Git Commit Convention

```
[AI-NAME] Brief description

Examples:
[Antigravity] Add security testing framework
[Claude] Refactor authentication middleware
[Kilo] System analysis documentation
```

---

## Common Tasks

### Add New Feature
1. Update schema: `backend/prisma/schema.prisma`
2. Generate client: `cd backend && npx prisma generate`
3. Push schema: `npx prisma db push`
4. Create Server Action: `frontend/next-app/lib/actions/[feature].ts`
5. Add UI components: `frontend/next-app/components/[feature]/`
6. Create page: `frontend/next-app/app/(dashboard)/[feature]/`
7. Write tests

### Fix Database Issues

```bash
cd backend

# Check database status
node check-db-status.js

# Verify schema integrity
npx ts-node verify_db.ts

# Reset admin password
npx ts-node fix-admin.ts

# Full reset (WARNING: data loss)
npx prisma migrate reset
```

---

## Documentation

- **README.md**: Project overview
- **docs/**: Detailed user/admin/technical guides (Thai)
- **SYSTEM_DOCUMENTATION_TH.md**: Complete system documentation
- **CLOUDFLARE-TUNNEL.md**: Cloudflare Tunnel setup guide

---

## Security Notes

- All passwords hashed with bcrypt (10+ rounds)
- JWT sessions with `tokenVersion` for forced logout capability
- Zod validation on all inputs (SQL injection/XSS prevention)
- Helmet.js security headers on backend
- Rate limiting enabled by default
- Audit logging for all CUD operations
