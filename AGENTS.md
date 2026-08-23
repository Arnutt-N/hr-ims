# 🤖 AGENTS.md - คู่มือสำหรับ AI Agents
## Human Resource & Inventory Management System (HR-IMS)

> ⭐ **SINGLE SOURCE OF TRUTH** — ไฟล์นี้คือคู่มือหลักฉบับรวมสำหรับ AI Agents **ทุกตัว**
> (Claude Code, Antigravity/Gemini, Codex, Kilo, Cline ฯลฯ) `CLAUDE.md`, `GEMINI.md`,
> `QWEN.md` เป็นเพียง pointer ที่ชี้มาที่ไฟล์นี้ — **ห้ามแก้คู่มือซ้ำในหลายไฟล์ ให้แก้ที่นี่ที่เดียว**

เอกสารนี้เป็นคู่มือสำหรับ AI Agents ที่ทำงานร่วมกันในโปรเจค HR-IMS รวมถึงคำสั่ง build/test/lint, แนวทางการเขียนโค้ด, และโปรโตคอลการส่งมอบงานระหว่าง AI

> Migration note (2026-04-03): โฟลเดอร์ AI workspace ระดับ repo ถูกเปลี่ยนชื่อจาก `.agent/` เป็น `.agents/` แล้ว หากเจอเอกสารเก่าใน `project-log-md/`, `research/`, หรือ archive ที่ยังอ้าง `.agent/` ให้ตีความตาม path เดิมก่อน rename เว้นแต่เอกสารนั้นกำลังอ้างอิงประวัติย้อนหลังโดยตรง

> Consolidation note (2026-08-23): เนื้อหาทั้งหมดจาก `CLAUDE.md` (Project Overview, Tech Stack,
> Architecture, Security, Schema Highlights, Env Vars, Testing/CI, Audit Patterns, Notes) ถูก
> รวมเข้าไฟล์นี้แล้ว — `CLAUDE.md` เหลือเพียง link ชี้มาที่ไฟล์นี้

---

## 0. 📖 Project Overview & Tech Stack

HR-IMS (Human Resource & Inventory Management System) is an enterprise-grade web application for managing organizational assets and inventory with integrated HR workflows. The system implements role-based access control (RBAC), comprehensive audit logging, multi-warehouse inventory management, and bilingual (Thai/English) UI.

**Architecture**: Monorepo with a Next.js (App Router) frontend and an Express.js backend, sharing a single Prisma schema and database. The frontend is the primary surface — most data operations run through Next.js Server Actions. The Express backend is used for standalone API access, background jobs, queues, and search indexing.

| Area | Technology |
|------|-----------|
| **Frontend** | Next.js 16.1 (App Router, Webpack), React 19, TypeScript, Tailwind CSS v4, Shadcn UI (Radix primitives), Framer Motion, Recharts |
| **Backend** | Express.js 4, TypeScript, Prisma ORM |
| **Database** | SQLite (development source-of-truth schema) / MySQL-compatible TiDB (production, generated from the SQLite schema via a transform script) |
| **Authentication** | NextAuth.js v5 (beta) with Credentials provider + JWT strategy |
| **Validation** | Zod (frontend v4, backend v3) |
| **Queues / Cache** | Redis + BullMQ (backups, email queue), node-cache (in-process) |
| **Search** | Meilisearch (optional) |
| **File uploads** | UploadThing |
| **Email / Alerts** | Nodemailer (Gmail SMTP); Telegram bot for admin alerts (optional) |
| **Logging** | Winston with daily-rotate-file |
| **Testing** | Vitest (frontend), Jest + Supertest (backend), Playwright (E2E) |
| **Network** | Optional Cloudflare Tunnel for public exposure |
| **i18n** | Custom Thai/English provider (`lib/i18n/`) |

---

## 1. 🎯 AI Agent Collaboration System

### 1.1 บทบาท AI Agents

| AI Agent | บทบาท | จุดแข็ง | เฉพาะทาง |
|----------|-------|---------|----------|
| **Antigravity (Gemini)** | Lead Developer | Full-stack, Testing, Security | Complex implementations |
| **Claude Code** | Developer | Code quality, Architecture, Refactoring | ปรับปรุงโครงสร้างโค้ด |
| **Kilo Code** | Researcher/Analyst | System analysis, Documentation | วิเคราะห์และแนะนำ |
| **CodeX (OpenAI)** | Developer | Code generation, Debugging, Optimization | แก้ไขปัญหาเฉพาะหน้า |

### 1.2 Task Handoff Protocol (การส่งมอบงาน)

เมื่อทำงานเสร็จหรือต้องการส่งต่อให้ AI ตัวอื่น:

1. **สร้าง Handoff Log** ที่: `project-log-md/handoff/logs/YYYY-MM-DD_HHmm_<from>_to_<to>.md`
2. **อัปเดต Handoff Board** ที่: `project-log-md/handoff/HANDOFF_BOARD.md`
3. **ใช้ Template มาตรฐาน:**

```markdown
# Handoff Log

---
| Field | Value |
|-------|-------|
| **Date** | YYYY-MM-DD HH:mm |
| **From Agent** | [agent_id] |
| **To Agent** | [agent_id หรือ all] |
| **Session Duration** | [ช่วงเวลาที่ทำงาน หรือ n/a] |
| **Remark** | [หมายเหตุเพิ่มเติม ถ้ามี] |

---

## สรุปงานที่ทำ
[อธิบายสิ่งที่ทำแล้ว]

## ไฟล์ที่สร้าง/แก้ไข
- `path/to/file1.ts` - [คำอธิบาย]
- `path/to/file2.ts` - [คำอธิบาย]

## สิ่งที่ต้องทำต่อ
- [ ] งาน 1
- [ ] งาน 2

## งานที่ส่งต่อ
- [ ] งานที่ต้องทำต่อ 1
- [ ] งานที่ต้องทำต่อ 2

## ข้อควรระวัง / หมายเหตุ
[สิ่งที่ AI ตัวถัดไปควรรู้]

## คำสั่งที่เกี่ยวข้อง
```bash
npm run dev
```
```

### 1.3 การติดต่อสื่อสาร

- **Git Commit:** `[AI-NAME] description`  
  ตัวอย่าง: `[Antigravity] Add security tests`, `[Claude] Refactor auth middleware`
  
- **Code Comments:** `// [YYYY-MM-DD] Modified by [AI]: description`  
  ตัวอย่าง: `// [2026-01-29] Modified by Antigravity: Added rate limiting`
  
- **Project Logs:** บันทึกที่ `project-log-md/[ai-name]/`  
  โครงสร้าง: `project-log-md/antigravity/`, `project-log-md/claude_code/`, `project-log-md/kilo/`

---

## 2. ⚡ Build/Lint/Test Commands

### 2.1 Frontend (Next.js 16 + Vitest)

```bash
cd frontend/next-app
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
npm run test             # Run all Vitest tests
npm run test:ui          # Vitest with UI mode
npm audit                # Security audit
```

### 2.2 Backend (Express + Jest)

```bash
cd backend
npm run dev              # Start with nodemon (hot reload)
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled code from dist/
npm test                 # Run all Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm audit                # Security audit
```

### 2.3 การรัน Test เดี่ยว (Single Test) ⭐

**Backend (Jest):**
```bash
# รันเฉพาะไฟล์
cd backend && npm test -- path/to/file.test.ts

# รันเฉพาะ test ที่ตรงกับ pattern
cd backend && npm test -- --testNamePattern="should validate"

# รันเฉพาะ security tests
cd backend && npm test -- --testPathPattern=security

# รันเฉพาะ unit tests
cd backend && npm test -- --testPathPattern=unit
```

**Frontend (Vitest):**
```bash
# รันเฉพาะไฟล์
cd frontend/next-app && npm test -- path/to/file.test.tsx

# รันเฉพาะ test ที่มีชื่อตรงกัน
cd frontend/next-app && npm test -- -t "should render"

# รันเฉพาะไฟล์ในโฟลเดอร์เฉพาะ
cd frontend/next-app && npm test -- tests/components/
```

### 2.4 Database (Prisma)

```bash
cd backend
npx prisma generate               # Generate Prisma Client
npx prisma db push                # Push schema changes to database
npx prisma migrate dev            # Create and apply migration
npx prisma migrate deploy         # Apply migrations (production)
npx prisma studio                 # Open Prisma Studio GUI (port 5555)
npx prisma db seed                # Seed database with initial data

# TiDB preparation flow (uses TIDB_DATABASE_URL in backend/.env)
npm run db:generate:tidb          # Generate Prisma client from TiDB-compatible schema
npm run db:push:tidb              # Push schema to TiDB
npm run db:seed:tidb              # Seed TiDB
```

### 2.5 Quick Start (Windows)

```bash
# รัน batch scripts จาก root directory
start_backend.bat          # Start Express server
start_frontend.bat         # Start Next.js dev server
start_tunnel.bat           # Start Cloudflare Tunnel (optional)
fix-db.bat                 # Local DB recovery helper
```

### 2.6 Local Infra (Docker)

`docker-compose.yml` provisions Redis (port 6379) and Meilisearch (port 7700) for local development. Bring them up with `docker compose up -d` before running queue-dependent or search-dependent code paths (BullMQ workers in `backend/src/queues/`, `backend/src/jobs/`).

---

## 3. 📝 Code Style Guidelines

### 3.1 TypeScript Conventions

- **Strict Mode:** เปิดใช้งาน `strict: true` ใน `tsconfig.json`
- **Types:** ใช้ Prisma-generated types, หลีกเลี่ยง `any` ให้มากที่สุด
- **Interfaces:** ใช้สำหรับ Props และ Data Models
- **Type Inference:** อนุญาตให้ใช้เมื่อชัดเจน แต่ควรระบุ type สำหรับ function parameters และ return types

### 3.2 Import Ordering

```typescript
// 1. Third-party libraries (เรียงตามตัวอักษร)
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// 2. Internal absolute imports (@/)
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';

// 3. Relative imports (ใช้น้อยที่สุด)
import { helper } from './utils';
import { config } from '../config';
```

### 3.3 Naming Conventions

| ประเภท | รูปแบบ | ตัวอย่าง |
|--------|--------|----------|
| Components | PascalCase | `InventoryTable`, `UserCard`, `LoginForm` |
| Functions | camelCase | `fetchInventory`, `createUser`, `validateInput` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE` |
| UI Components | kebab-case | `button.tsx`, `dialog.tsx`, `input.tsx` |
| Server Actions | camelCase | `createInventoryItem`, `updateUserProfile` |
| Variables | camelCase | `currentUser`, `inventoryList` |
| Types/Interfaces | PascalCase | `UserProps`, `InventoryItem` |
| Environment Variables | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET` |

### 3.4 Server Actions Pattern (สำคัญ!)

```typescript
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// 1. กำหนด Zod Schema
const CreateItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  type: z.enum(['durable', 'consumable']),
  stock: z.coerce.number().min(0),
});

// 2. Server Action Function
export async function createInventoryItem(formData: FormData) {
  // 2.1 Authentication
  const session = await auth()
  if (!session) {
    return { error: 'Unauthorized', success: false }
  }

  // 2.2 Authorization (RBAC)
  if (!['admin', 'superadmin'].includes(session.user.role)) {
    return { error: 'Forbidden: Insufficient permissions', success: false }
  }

  // 2.3 Validation
  const validated = CreateItemSchema.parse(Object.fromEntries(formData))

  // 2.4 Database Operation (with transaction ถ้าจำเป็น)
  const result = await prisma.inventoryItem.create({
    data: validated
  })

  // 2.5 Audit Log (บันทึกทุก CUD operation!)
  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      tableName: 'InventoryItem',
      recordId: result.id,
      userId: parseInt(session.user.id),
      newData: JSON.stringify(result),
      createdAt: new Date()
    }
  })

  // 2.6 Revalidate Path
  revalidatePath('/inventory')
  
  return { success: true, data: result }
}
```

### 3.5 Error Handling

**สำหรับ Server Actions:**
```typescript
try {
  // Database operation
  const result = await prisma.item.create({ data: validated })
  return { success: true, data: result }
} catch (error) {
  console.error('Database Error:', error)
  return { 
    success: false, 
    message: 'Failed to create item. Please try again.' 
  }
}
```

**สำหรับ Express Controllers:**
```typescript
export const createItem = async (req: Request, res: Response) => {
  try {
    // Logic
    const result = await service.create(req.body)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    })
  }
}
```

### 3.6 Multi-Role Authorization Pattern

```typescript
// ตรวจสอบสิทธิ์หลายบทบาท (Multi-role RBAC)
const userWithRoles = await prisma.user.findUnique({
  where: { id: parseInt(session.user.id) },
  include: { 
    userRoles: { 
      include: { role: true } 
    } 
  }
})

const hasRole = (slug: string) =>
  userWithRoles?.userRoles.some(ur => ur.role.slug === slug)

const hasAnyRole = (slugs: string[]) =>
  slugs.some(slug => hasRole(slug))

// ใช้งาน
if (!hasAnyRole(['admin', 'superadmin', 'approver'])) {
  return { error: 'Forbidden: Access denied', success: false }
}
```

> 💡 Session ของ NextAuth มี `roles: string[]` และ `permissions: string[]` ฝังอยู่แล้ว — **ใช้จาก session ใน hot paths** และ query DB (ตามตัวอย่าง) เฉพาะเมื่อต้องการข้อมูล authoritative ล่าสุด อย่าถือ legacy single `role` field เป็นตัวตัดสิน

### 3.7 Audit Logging Pattern (บังคับทุก CUD operation!)

ทุก CUD Server Action ต้องเขียนลง `AuditLog` ด้วย: `action` (`CREATE`/`UPDATE`/`DELETE`), `tableName`, `recordId`, `userId`, และ snapshots ใน `oldData` / `newData` — **wrap mutation + audit write ใน `prisma.$transaction` เดียวกัน** เพื่อให้ audit ไม่หลุดจาก data

`lib/actions/audit.ts` มี 2 entry points:

- **`logActivity(action, entity, entityId?, details?)`** — one-liner สำหรับงานเดิม auto-populate `ipAddress`, `userAgent`, `requestId` จาก `next/headers()` ทำให้ audit row ย้อนดูสหพันธ์กับ backend logs ได้
- **`withAudit({ action, entity, before?, after?, details? }, fn)`** — HOF สำหรับ mutating actions ใหม่ ที่ต้องการ before/after snapshots เป็นโครงสร้าง (persist `oldValue`/`newValue`) — audit insert failures จะไม่ block ค่า return ของ action

**Backend mirror:** `backend/src/middleware/audit.ts` mount บนทุก Express request — stamp UUID `requestId`, normalize `req.auditContext` (`{ ipAddress, userAgent, requestId }`), และ propagate `requestId` เข้า Winston logs ผ่าน `requestLogger`

---

## 4. 🏗️ Project Architecture

### 4.1 Monorepo Structure

```
hr-ims/
├── frontend/next-app/          # Next.js 16 App Router
│   ├── app/(dashboard)/        # Protected routes (ต้อง login)
│   ├── app/login/              # Public routes
│   ├── lib/actions/            # Server Actions (CRUD operations)
│   ├── lib/prisma.ts           # Prisma Client singleton
│   ├── components/
│   │   ├── ui/                 # Shadcn UI components
│   │   ├── dashboard/          # Dashboard-specific
│   │   ├── inventory/          # Inventory components
│   │   └── auth/               # Auth components
│   └── tests/                  # Vitest tests
│
├── backend/                    # Express.js API
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── routes/             # Route definitions
│   │   ├── middleware/         # Auth, validation, rate limiting
│   │   ├── services/           # Business logic layer
│   │   ├── utils/              # Helper functions
│   │   └── tests/              # Jest tests
│   └── prisma/
│       ├── schema.prisma       # Database schema (Single Source of Truth)
│       └── dev.db              # SQLite database
│
├── .agents/                    # AI Configuration
│   ├── workflows/              # Slash commands
│   ├── skills/                 # Knowledge base
│   └── AI_COLLABORATION_PROTOCOL.md
│
├── research/                   # Research & Analysis (gitignored)
│   ├── kilo/                   # Kilo Code analysis
│   └── antigravity/            # Antigravity research
│
└── project-log-md/             # Project logs and handoff system
    ├── handoff/                # HANDOFF_BOARD.md + handoff logs
    ├── antigravity/
    ├── claude_code/
    ├── kilo/
    └── common/
```

### 4.2 Shared Database Architecture (สำคัญ!)

**⚠️ CRITICAL:** โปรเจคนี้ใช้ Prisma schema ร่วมกันระหว่าง Frontend และ Backend โดย `backend/prisma/schema.prisma` เป็น source of truth

- **Default local dev DB:** `backend/prisma/dev.db` (SQLite)
- **TiDB prep/cutover:** ใช้ `TIDB_DATABASE_URL` + `npm run db:generate:tidb` / `npm run db:push:tidb`
- **Schema Definition:** `backend/prisma/schema.prisma` (Single Source of Truth)
- **Prisma Clients:**
  - Backend: `backend/node_modules/@prisma/client`
  - Frontend: `frontend/next-app/node_modules/.prisma/client`

**การแก้ไข Schema:**
1. แก้ไข `backend/prisma/schema.prisma`
2. ถ้าเป็น local SQLite: รัน `cd backend && npx prisma generate` และ `cd backend && npx prisma db push`
3. ถ้าเป็น TiDB: รัน `npm run db:generate:tidb` และ `npm run db:push:tidb`
4. ทดสอบว่าทั้ง frontend และ backend ใช้งานได้กับ `DATABASE_URL` เดียวกัน

### 4.3 Frontend Architecture (`frontend/next-app/`)

**Top-level files:**
- `auth.ts` - NextAuth.js v5 setup, JWT callbacks, multi-role + permissions hydration
- `auth.config.ts` - Authorized callback (route gating logic)
- `proxy.ts` - Next middleware: legacy role-prefix gating + internal API key checks
- `next-auth.d.ts` - Module augmentation for Session/JWT types
- `vitest.config.ts`, `playwright.config.ts`

**App Router structure (`app/`):**
- `(dashboard)/` - Protected routes (require auth): `dashboard/`, `inventory/`, `cart/`, `requests/`, `warehouse/`, `users/`, `settings/`, `logs/`, `my-assets/`, `maintenance/`, `scanner/`, `reports/`, `history/`, `tags/` + shared `layout.tsx`
- `login/`, `register/`, `forgot-password/`, `reset-password/` - auth flows
- `api/` - Route handlers (kept minimal; see Server Actions for most logic)
- `debug/` - dev-only debugging surface

**Server Actions (`lib/actions/`) — all DB writes flow through here.** Each Server Action is responsible for: **auth check → role/permission check → Zod validation → Prisma transaction (if multi-step) → audit log → `revalidatePath`**

**Library helpers (`lib/`):**
- `prisma.ts` - Prisma Client singleton (with soft-delete middleware via `prisma.$use`)
- `auth-cache.ts`, `settings-cache.ts` - Short-lived in-memory caches to slim hot paths
- `auth-guards.ts` - Reusable session/role guards for Server Actions
- `role-access.ts`, `role-sync.ts` - Role normalization + UserRole reconciliation
- `i18n/` - Thai/English message catalogs, page titles, server + provider helpers
- `meilisearch.ts` - Search client
- `maintenance/` - Maintenance workflow domain logic (transitions, aggregate, optimistic-lock, fanout, telegram-service)

### 4.4 Backend Architecture & Role

Express layer (`backend/src/`) = controllers / routes / middleware / services / utils / queues / jobs / tests.

**Note:** The frontend primarily uses Server Actions and bypasses the Express API for in-app data flows. The Express layer exists for: external API consumers, background jobs, search indexing, scheduled tasks, Swagger docs, and integration tests.

### 4.5 Security Patterns

**Authentication & Authorization:**
- **Authentication:** NextAuth.js v5 (frontend) + JWT (backend); Bcrypt hashing (10+ rounds)
- **Authorization:** Multi-role RBAC ผ่าน `UserRole` junction table; permissions resolve via `RolePermission`
- **Roles ที่มี:** `superadmin`, `admin`, `approver`, `auditor`, `technician`, `user`
- **Password Policy:** Enforced server-side via `backend/src/utils/passwordPolicy.ts` and on registration/reset Server Actions
- **Session Management:** `User.tokenVersion` checked in the JWT callback on every request (force logout)
- **Route gating:** `auth.config.ts` (App Router) + `proxy.ts` (legacy prefix rules) + Server Action role checks — middleware/proxy เป็น defense-in-depth ไม่ใช่ด่านเดียว

**Data Integrity:**
- **Audit Logging:** All CUD operations write to `AuditLog` (ดู pattern ใน §3.7)
- **Server Actions:** All mutating operations are server-side, not exposed REST endpoints
- **Zod Validation:** All Server Action inputs and Express request bodies
- **Prisma Transactions:** Multi-step writes wrapped atomically
- **Reserved Stock:** Pending requests reserve stock on creation; released on rejection/cancel/return

**Network Security:**
- Helmet.js security headers + `express-rate-limit` (backend)
- `INTERNAL_API_KEY` enforced by `proxy.ts` for internal API routes
- Optional Cloudflare Tunnel — see `CLOUDFLARE-TUNNEL.md`
- Security test suite: `backend/src/tests/security/` (OWASP Top 10)

### 4.6 Database Schema Highlights

Defined in `backend/prisma/schema.prisma`. Provider is `sqlite` locally; production runs MySQL/TiDB via the transform script.

| Group | Models |
|-------|--------|
| **Identity & Access** | `User`, `Role`, `UserRole`, `RolePermission`, `PasswordHistory`, `EmailVerification` |
| **Inventory & Workflow** | `InventoryItem`, `Category`, `CartItem`, `Request`, `RequestItem`, `Warehouse`, `StockLevel`, `StockTransfer`, `StockTransaction`, `History`, `Notification`, `Settings` |
| **Maintenance (PRP v6)** | `MaintenanceRequest`, `MaintenanceRequestItem`, `MaintenanceLog`, `CategoryAssigneeRule`, `MaintenanceRequestWatcher` |
| **HR / Org Structure** | `Ministry`, `Department`, `Division`, `WorkGroup1`, `WorkGroup2`, `OrganizationUnit`, `Personnel`, `PersonnelType`, `NamePrefix`, `PositionCategory`, `PositionLevel` |
| **Geography** | `Province`, `Region`, `InspectionZone`, `CustomProvinceZone` |
| **Cross-cutting** | `AuditLog` - canonical audit trail for all CUD ops |

> SQLite has no native enums; role and status fields are `String` with documented allowed values in schema comments.

---

## 5. 🔄 Development Workflows

### 5.1 เพิ่ม Feature ใหม่ (Step-by-Step)

1. **Database Design**
   - ออกแบบ Schema → `backend/prisma/schema.prisma`
   - รัน `cd backend && npx prisma generate`
   - รัน `cd backend && npx prisma db push`

2. **Backend Logic**
   - สร้าง Controller → `backend/src/controllers/`
   - สร้าง Route → `backend/src/routes/`
   - เพิ่ม Middleware ถ้าจำเป็น → `backend/src/middleware/`

3. **Frontend Server Actions**
   - สร้าง Server Action → `frontend/next-app/lib/actions/[feature].ts`
   - เพิ่ม Zod validation
   - เพิ่ม Audit logging
   - ใช้ `revalidatePath()` เสมอ

4. **UI Components**
   - สร้าง Component → `frontend/next-app/components/[feature]/`
   - สร้าง Page → `frontend/next-app/app/(dashboard)/[feature]/page.tsx`

5. **Testing**
   - เขียน Unit tests → `backend/src/tests/unit/`
   - เขียน Integration tests → `backend/src/tests/integration/`
   - รัน `npm test` เพื่อตรวจสอบ

### 5.2 เปลี่ยน Database Schema

```bash
cd backend

# 1. แก้ไข schema.prisma ก่อน

# 2. สร้าง migration
npx prisma migrate dev --name descriptive_name

# 3. Generate client ใหม่ (สำคัญ!)
npx prisma generate

# 4. อัปเดต seed file ถ้าจำเป็น
# แก้ไข backend/prisma/seed.ts

# 5. ทดสอบด้วย fresh database (optional)
npx prisma migrate reset
```

### 5.3 แก้ไขปัญหา Database

```bash
cd backend

# ตรวจสอบสถานะ database
node check-db-status.js

# ตรวจสอบ schema integrity
npx ts-node verify_db.ts

# ตรวจสอบ seed data
npx ts-node verify_seed.ts

# รีเซ็ต admin password
npx ts-node fix-admin.ts

# รีเซ็ต database (ระวัง! ข้อมูลจะหาย)
npx prisma migrate reset
```

### 5.4 เพิ่ม Role-Based Access

- In Server Actions, prefer the `auth-guards.ts` helpers and check `session.user.roles` (array) and `session.user.permissions` (array of allowed paths)
- For UI gating, read from `useSession()` / `auth()` and use `role-access.ts` helpers
- For new path-based permissions, add a `RolePermission` row (the JWT callback in `auth.ts` will pick it up on next refresh)

### 5.5 i18n (สองภาษาบังคับ)

User-facing strings ทุกตัวต้องผ่าน `lib/i18n/messages.ts` — **มีทั้ง Thai และ English copy เสมอ** (ดู diff helper: `scripts/i18n-key-diff.mjs`)

---

## 6. 📋 Next Tasks Queue (สำหรับ AI Agents)

### 🔴 High Priority (ควรทำก่อน)

- [ ] **Rate Limiting Implementation** - ป้องกัน brute force attacks
  - Assigned: Any | Status: Pending | From: Kilo Analysis 2026-01-29
  - ไฟล์ที่เกี่ยวข้อง: `backend/src/middleware/rateLimiter.ts`
  
- [ ] **Logging & Monitoring System** - Winston logger configuration
  - Assigned: Any | Status: Pending | From: Kilo Analysis 2026-01-29
  - ไฟล์ที่เกี่ยวข้อง: `backend/src/utils/logger.ts`
  - Note: มีโครงสร้างพื้นฐานแล้ว ต้องปรับปรุงให้สมบูรณ์

### 🟠 Medium Priority (ควรทำถัดไป)

- [ ] **Password Policy Enhancement** - นโยบายรหัสผ่านที่เข้มงวดขึ้น
  - Assigned: Any | Status: Pending | From: Kilo Analysis 2026-01-29
  - ไฟล์ที่เกี่ยวข้อง: `backend/src/utils/passwordPolicy.ts`
  
- [ ] **Backup & Recovery System** - ระบบสำรองข้อมูลอัตโนมัติ
  - Assigned: Any | Status: Pending | From: Kilo Analysis 2026-01-29
  - ไฟล์ที่เกี่ยวข้อง: `backend/src/services/backupService.ts`

### 🟡 Low Priority / Maintenance (ทำเมื่อมีเวลา)

- [ ] **Update Documentation** - อัปเดต docs/ ให้ตรงกับโค้ดปัจจุบัน
  - Assigned: Any | Status: Pending
  - ไฟล์ที่เกี่ยวข้อง: `docs/USER_GUIDE_TH.md`, `docs/ADMIN_GUIDE_TH.md`
  
- [ ] **Performance Optimization** - ปรับปรุง query ที่ช้า
  - Assigned: Any | Status: Pending
  - Note: ตรวจสอบ N+1 queries ใน Prisma

### ✅ Recently Completed

- [x] **Security Testing Framework** - OWASP Top 10 tests
  - Completed by: Antigravity | Date: 2026-01-29
  - Location: `backend/src/tests/security/`
  
- [x] **System Analysis Report** - วิเคราะห์ระบบและแนะนำการปรับปรุง
  - Completed by: Kilo | Date: 2026-01-29
  - Location: `research/kilo/`

- [x] **AI Workspace Rename** - เปลี่ยนชื่อโฟลเดอร์ AI workspace เป็น `.agents/`
  - Completed by: CodeX | Date: 2026-04-03
  - Location: `.agents/`

---

## 7. 🆘 Emergency Procedures

### 7.1 Database Connection Issues

```bash
cd backend

# ตรวจสอบสถานะ database
node check-db-status.js

# ตรวจสอบว่า database file มีอยู่จริง
ls -la prisma/dev.db

# รีเซ็ต database (ระวัง! ข้อมูลจะหายทั้งหมด)
npx prisma migrate reset

# แก้ไข admin password ถ้าลืม
npx ts-node fix-admin.ts
```

### 7.2 Git Conflicts

```bash
# ตรวจสอบก่อนเริ่มงานเสมอ
git status
git pull

# หากมี conflict
# 1. แจ้ง user ทันที
# 2. ห้าม force push โดยเด็ดขาด
# 3. รอคำสั่งจาก user
```

### 7.3 Test Failures

```bash
# รันเฉพาะ test ที่ fail
cd backend && npm test -- --testNamePattern="failing-test-name"

# ดูรายละเอียด error
cd backend && npm test -- --verbose

# รันเฉพาะไฟล์ที่ fail
cd backend && npm test -- path/to/failing.test.ts
```

### 7.4 Application Won't Start

```bash
# ตรวจสอบ environment variables
cat backend/.env
cat frontend/next-app/.env

# ตรวจสอบ ports ที่ใช้
netstat -ano | findstr :3000
netstat -ano | findstr :3001

# ล้าง cache และ reinstall
cd frontend/next-app && rm -rf node_modules && npm install
cd backend && rm -rf node_modules && npm install

# รีเซ็ต Prisma Client
cd backend && npx prisma generate
```

---

## 8. 📚 Important Files Reference

| ไฟล์ | รายละเอียด |
|------|-----------|
| `CLAUDE.md` | Pointer → ชี้มาที่ไฟล์นี้ (AGENTS.md คือ single source of truth) |
| `.agents/AI_COLLABORATION_PROTOCOL.md` | โปรโตคอลการทำงานร่วมกันระหว่าง AI |
| `project-log-md/handoff/HANDOFF_BOARD.md` | Dashboard กลางสำหรับ handoff ระหว่าง AI |
| `backend/prisma/schema.prisma` | Database schema (Single Source of Truth) |
| `frontend/next-app/lib/actions/*.ts` | Server Actions ทั้งหมด |
| `backend/src/middleware/auth.ts` | Authentication & Authorization middleware |
| `backend/src/utils/logger.ts` | Winston logging service |
| `backend/src/tests/security/` | Security testing framework |

---

## 9. ✅ AI Collaboration Checklist

### ก่อนเริ่มงาน:
- [ ] อ่าน `project-log-md/handoff/HANDOFF_BOARD.md`
- [ ] อ่าน handoff logs ที่เกี่ยวข้องใน `project-log-md/handoff/logs/` (ถ้ามี)
- [ ] ตรวจสอบ `.agents/skills/` ที่เกี่ยวข้อง
- [ ] รัน `git status` และ `git pull`
- [ ] ตรวจสอบ Next Tasks Queue ในหมวด 6

### ขณะทำงาน:
- [ ] เขียน code ตาม patterns ในหมวด 3
- [ ] เพิ่ม audit logging สำหรับทุก CUD operations
- [ ] ใช้ Zod validation สำหรับทุก form input
- [ ] ใช้ Prisma transactions สำหรับ operations ที่สำคัญ
- [ ] Comment โค้ดที่แก้ไข: `// [YYYY-MM-DD] Modified by [AI]: description`

### หลังเสร็จงาน:
- [ ] รัน tests: `npm test` (ต้องผ่านทั้งหมด)
- [ ] รัน lint: `npm run lint` (frontend)
- [ ] สร้าง handoff log ที่ `project-log-md/handoff/logs/`
- [ ] อัปเดต `project-log-md/handoff/HANDOFF_BOARD.md`
- [ ] อัปเดต Next Tasks Queue ในหมวด 6
- [ ] บันทึก project log ที่ `project-log-md/[ai-name]/`
- [ ] Commit ด้วย format: `[AI-NAME] description`

---

## 10. 🔧 Common Commands Reference

```bash
# Development
/start_dev                    # ใช้ workflow (หรือรัน batch files)

# Database
cd backend && npx prisma studio           # Open DB GUI (port 5555)
cd backend && npx prisma db push          # Push schema changes
cd backend && npx prisma generate         # Generate Prisma Client

# Testing
cd backend && npm test -- --testPathPattern=security    # Security tests
cd backend && npm test -- --testPathPattern=unit        # Unit tests
cd frontend/next-app && npm test                        # Frontend tests

# Lint & Type Check
cd frontend/next-app && npm run lint        # ESLint
cd frontend/next-app && npx tsc --noEmit    # Type check
```

---

## 11. 📝 Git Commit Convention

```
[AI-NAME] Brief description

Examples:
[Antigravity] Add security testing framework
[Claude] Refactor authentication middleware  
[Kilo] System analysis and recommendations
[Antigravity+Kilo] Collaborative rate limiting implementation
```

---

*Last Updated: 2026-04-03 | Created by: Claude Code*
*สำหรับ AI Agents ทุกตัวที่ทำงานใน HR-IMS Project*
*หากมีคำถาม กรุณาอ่าน `.agents/AI_COLLABORATION_PROTOCOL.md`*

---

## 12. 🔐 Environment Variables

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
TIDB_DATABASE_URL=optional (for TiDB pipeline)
```

`.env.example` files exist in both apps. **The two `DATABASE_URL`s must point at the same SQLite file.**

---

## 13. 🧪 Testing Strategy & CI

### Frontend (Vitest)
- Unit/component tests under `frontend/next-app/tests/components/`, action tests under `tests/actions/`
- E2E (Playwright) under `frontend/next-app/tests/e2e/` � golden specs in `tests/e2e/golden/`
- Run: `npm test` / `npm run test:ui` from `frontend/next-app/`; Playwright: `npx playwright test`

### Backend (Jest)
- Tree under `backend/src/tests/`:
  - `unit/` - controllers, services, utils
  - `integration/` - Supertest against the Express app
  - `security/` - OWASP Top 10 coverage (`auth/`, `authz/`, `api/`, `injection/`, `infra/`, `pentest/`, `utils/`)
  - `health.test.ts` - liveness probe
- Run: `npm test`, `npm run test:watch`, `npm run test:coverage`
- Run only security tests: `npm test -- --testPathPattern=security`

### CI (GitHub Actions)
- `.github/workflows/ci.yml` - frontend lint+test, backend test, vercel-build, TiDB schema validation
- `.github/workflows/security-e2e.yml` - security/E2E suite

---

## 14. 💡 Notes for AI Assistants (Key Gotchas)

- **Database Path**: Use absolute paths or paths relative to project root. Both apps must agree on the same SQLite file.
- **Prisma Client**: Always run `prisma generate` from `backend/` � the schema's `client_frontend` generator regenerates the frontend client too.
- **Server Actions over API routes**: For frontend data flows, default to Server Actions. Reach for the Express API only when something external needs it.
- **Authorization**: Check session and roles in every Server Action. The middleware/proxy is defense-in-depth, not the only line of defense.
- **Audit Logs**: Required for all CUD ops, in the same transaction as the mutation (see section 3.7 Audit Logging Pattern).
- **Type Safety**: Lean on Prisma-generated types; avoid `as` assertions except where session augmentation forces it.
- **Revalidation**: Call `revalidatePath()` (or `revalidateTag()`) after mutations.
- **Multi-Role**: Sessions carry `roles: string[]` and `permissions: string[]`. Don't treat the legacy single `role` field as authoritative.
- **Caches**: `lib/auth-cache.ts` and `lib/settings-cache.ts` are short-lived in-memory caches. If you change underlying data, ensure the cache key/TTL still makes sense.
- **Queues**: BullMQ workers need Redis running locally � start `docker compose up -d` first.
- **TiDB**: Don't hand-edit a MySQL schema; edit the SQLite source-of-truth and re-run the transform script.

---

*Last Updated: 2026-08-23 | Consolidated from CLAUDE.md by Cline (ox-alpha)*
*ไฟล์นี้คือ single source of truth — CLAUDE.md / GEMINI.md / QWEN.md เป็น pointer เท่านั้น*
*หากมีคำถาม กรุณาอ่าน `.agents/AI_COLLABORATION_PROTOCOL.md`*
