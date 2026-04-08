# 🤖 AGENTS.md - คู่มือสำหรับ AI Agents
## Human Resource & Inventory Management System (HR-IMS)

เอกสารนี้เป็นคู่มือสำหรับ AI Agents ที่ทำงานร่วมกันในโปรเจค HR-IMS รวมถึงคำสั่ง build/test/lint, แนวทางการเขียนโค้ด, และโปรโตคอลการส่งมอบงานระหว่าง AI

> Migration note (2026-04-03): โฟลเดอร์ AI workspace ระดับ repo ถูกเปลี่ยนชื่อจาก `.agent/` เป็น `.agents/` แล้ว หากเจอเอกสารเก่าใน `project-log-md/`, `research/`, หรือ archive ที่ยังอ้าง `.agent/` ให้ตีความตาม path เดิมก่อน rename เว้นแต่เอกสารนั้นกำลังอ้างอิงประวัติย้อนหลังโดยตรง

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
```

### 2.5 Quick Start (Windows)

```bash
# รัน batch scripts จาก root directory
start_backend.bat          # Start Express server
start_frontend.bat         # Start Next.js dev server
start_tunnel.bat           # Start Cloudflare Tunnel (optional)
```

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

**⚠️ CRITICAL:** โปรเจคนี้ใช้ SQLite database ร่วมกันระหว่าง Frontend และ Backend

- **Database File:** `backend/prisma/dev.db`
- **Schema Definition:** `backend/prisma/schema.prisma` (Single Source of Truth)
- **Prisma Clients:**
  - Backend: `backend/node_modules/@prisma/client`
  - Frontend: `frontend/next-app/node_modules/.prisma/client`

**การแก้ไข Schema:**
1. แก้ไข `backend/prisma/schema.prisma`
2. รัน `cd backend && npx prisma generate` (สร้าง client ทั้ง 2 ฝั่ง)
3. รัน `cd backend && npx prisma db push` (อัปเดต database)
4. ทดสอบว่าทั้ง frontend และ backend ใช้งานได้

### 4.3 Security Patterns

- **Authentication:** NextAuth.js v5 + JWT Strategy
- **Authorization:** Multi-role RBAC ผ่าน `UserRole` junction table
- **Roles ที่มี:** `superadmin`, `admin`, `approver`, `auditor`, `technician`, `user`
- **Validation:** Zod schemas สำหรับทุก form input
- **Audit Logging:** บันทึกทุก CUD operation ลง `AuditLog` table
- **Password Security:** Bcrypt hashing (10+ rounds)
- **Session Management:** `tokenVersion` field สำหรับ force logout

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
| `CLAUDE.md` | คู่มือเฉพาะสำหรับ Claude Code |
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
