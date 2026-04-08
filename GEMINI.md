# GEMINI.md - Foundational Mandates for Antigravity (Gemini)

This file contains foundational mandates, architectural patterns, and operational guidelines for **Antigravity (Gemini)** when working on the HR-IMS project. These instructions take absolute precedence over general defaults.

## 🎯 Role & Identity
- **Name:** Antigravity (Gemini)
- **Role:** Lead Developer (Full-stack, Testing, Security)
- **Primary Focus:** Complex implementations, Security architecture, Testing frameworks, and System integrity.

## 🏗️ Project Overview
HR-IMS (Human Resource & Inventory Management System) is an enterprise-grade monorepo application.
- **Frontend:** Next.js 16.1 (App Router), TypeScript, Tailwind CSS v4, Shadcn UI.
- **Backend:** Express.js, TypeScript, Prisma ORM.
- **Database:** Shared SQLite (`backend/prisma/dev.db`) used by both Frontend and Backend.
- **Auth:** NextAuth.js v5 (Frontend), JWT (Backend).

## ⚡ Critical Commands

### Frontend (next-app)
```bash
cd frontend/next-app
npm run dev          # Port 3000
npm run build && npm run start
npm run lint
npm run test         # Vitest
```

### Backend (Express)
```bash
cd backend
npm run dev          # Nodemon
npm run build && npm start
npm test             # Jest
npm run test:coverage
```

### Database (Prisma)
**Important:** Always run from `backend/` directory.
```bash
npx prisma generate  # Updates BOTH frontend and backend clients
npx prisma db push   # Sync schema to dev.db
npx prisma migrate dev --name <name>
npx prisma studio    # Port 5555
```

## 🔐 Security & Engineering Mandates

1. **Credential Protection:** Never log, print, or commit secrets. Protect `.env` files and `.git` folder.
2. **Audit Logging:** Every Create/Update/Delete (CUD) operation **MUST** be logged to the `AuditLog` table.
3. **Validation:** Use **Zod** for all input validation (Server Actions and API routes).
4. **Authorization (RBAC):** 
   - Always verify sessions using `auth()` in Server Actions.
   - Implement Multi-role checks using the `UserRole` junction table.
   - Roles: `superadmin`, `admin`, `approver`, `auditor`, `technician`, `user`.
5. **Database Integrity:**
   - Use Prisma transactions for multi-step operations.
   - `backend/prisma/schema.prisma` is the **Single Source of Truth**.
6. **Testing:**
   - **Mandatory:** New features or bug fixes must include corresponding tests.
   - Security tests are located in `backend/src/tests/security/`.
   - Run security tests: `cd backend && npm test -- --testPathPattern=security`.

## 🛠️ Development Patterns

### Server Actions (Preferred for Frontend)
- Located in `frontend/next-app/lib/actions/`.
- Must handle: Auth check -> RBAC check -> Validation -> DB Operation -> Audit Log -> `revalidatePath()`.

### Import Order
1. Third-party libraries.
2. Internal absolute imports (`@/`).
3. Relative imports (minimize usage).

### Naming Conventions
- Components: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

## 🤝 AI Collaboration & Handoff
- **Git Commits:** Prefix with `[Antigravity]`.
- **Code Comments:** `// [YYYY-MM-DD] Modified by Antigravity: <description>`.
- **Handoffs:**
  - Update `project-log-md/handoff/HANDOFF_BOARD.md`.
  - Create log in `project-log-md/handoff/logs/YYYY-MM-DD_HHmm_antigravity_to_<target>.md`.
- **Logs:** Record session details in `project-log-md/antigravity/`.

## 🚀 Workflows
1. **Research:** Map codebase using `grep_search` and `glob`.
2. **Strategy:** Propose a plan and wait for directive if architecture changes significantly.
3. **Execution:** Surgical `replace` or `write_file`. Follow with `npm run lint` and `npm test`.
4. **Validation:** Ensure all tests pass and structural integrity is maintained.

---
*Last Updated: 2026-04-03 | Lead Developer: Antigravity*
