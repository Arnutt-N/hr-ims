---
name: rbac-guard
description: Role-Based Access Control patterns for multi-role authorization
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["role", "permission", "auth", "authorize", "access control", "RBAC", "guard"]
  file_patterns: ["*auth*", "middleware/*", "lib/actions/*"]
  context: security, backend, authorization
mcp_servers:
  - sequential
personas:
  - security
  - backend
---

# RBAC Guard

## Core Role

Implement Role-Based Access Control for HR-IMS with:
- Multi-role support (users can have multiple roles)
- Permission checks in Server Actions
- Route protection in Next.js
- UI conditional rendering based on roles

---

## Role System Overview

```yaml
roles:
  superadmin:
    description: Full system access
    permissions: [all]

  admin:
    description: Administrative access
    permissions: [users_read, users_write, inventory_full, requests_approve]

  approver:
    description: Can approve/reject requests
    permissions: [requests_approve, requests_read]

  auditor:
    description: Read-only access to logs and reports
    permissions: [logs_read, reports_read]

  technician:
    description: Maintenance and inventory operations
    permissions: [maintenance_full, inventory_read]

  user:
    description: Basic user access
    permissions: [inventory_read, requests_own, profile_own]

database_schema:
  User: users table
  Role: role definitions
  UserRole: many-to-many junction (userId, roleId)
```

---

## Authorization Patterns

### Server Action Authorization

```typescript
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Simple role check
export async function adminOnlyAction() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  if (!['admin', 'superadmin'].includes(session.user.role)) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  // Action logic...
}

// Multi-role check with database lookup
export async function checkUserRole(
  userId: number,
  requiredRoles: string[]
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: true }
      }
    }
  })

  if (!user) return false

  const userRoleSlugs = user.userRoles.map(ur => ur.role.slug)
  return requiredRoles.some(role => userRoleSlugs.includes(role))
}

// Usage in Server Action
export async function protectedAction() {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const hasAccess = await checkUserRole(
    parseInt(session.user.id),
    ['admin', 'approver']
  )

  if (!hasAccess) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  // Action logic...
}
```

### Reusable Auth Helper

```typescript
// lib/auth-helpers.ts
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

interface AuthResult {
  success: true
  user: {
    id: number
    email: string
    roles: string[]
  }
}

interface AuthError {
  success: false
  error: string
  code: 'UNAUTHORIZED' | 'FORBIDDEN'
}

export async function requireAuth(): Promise<AuthResult | AuthError> {
  const session = await auth()

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    include: {
      userRoles: {
        include: { role: true }
      }
    }
  })

  if (!user) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      roles: user.userRoles.map(ur => ur.role.slug)
    }
  }
}

export async function requireRoles(
  requiredRoles: string[]
): Promise<AuthResult | AuthError> {
  const authResult = await requireAuth()

  if (!authResult.success) return authResult

  const hasRole = authResult.user.roles.some(role =>
    requiredRoles.includes(role)
  )

  if (!hasRole) {
    return { success: false, error: 'Forbidden', code: 'FORBIDDEN' }
  }

  return authResult
}

// Usage
export async function adminAction() {
  const auth = await requireRoles(['admin', 'superadmin'])
  if (!auth.success) return { error: auth.error, code: auth.code }

  // auth.user.id is now available
  // Action logic...
}
```

---

## Route Protection

### Next.js Middleware

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Role-based route protection
    const protectedRoutes: Record<string, string[]> = {
      '/users': ['admin', 'superadmin'],
      '/settings': ['admin', 'superadmin'],
      '/logs': ['superadmin', 'auditor'],
      '/reports': ['admin', 'superadmin', 'auditor'],
      '/warehouse': ['admin', 'superadmin', 'technician']
    }

    for (const [route, roles] of Object.entries(protectedRoutes)) {
      if (pathname.startsWith(route)) {
        const userRoles = token?.roles as string[] || []
        const hasAccess = roles.some(role => userRoles.includes(role))

        if (!hasAccess) {
          return NextResponse.redirect(new URL('/unauthorized', req.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

### Auth Config Route Protection

```typescript
// auth.config.ts
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/dashboard', '/inventory', '/requests', '/settings']
const adminRoutes = ['/users', '/logs']

export function authConfig(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.cookies.get('next-auth.session-token')

  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isLoggedIn) {
      return Response.redirect(new URL('/login', req.url))
    }
  }

  // Additional admin checks can be added here
}
```

---

## UI Conditional Rendering

### Client Component Pattern

```typescript
// components/auth/role-gate.tsx
'use client'

import { useSession } from 'next-auth/react'

interface RoleGateProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallback?: React.ReactNode
}

export function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
  const { data: session } = useSession()

  const userRoles = session?.user?.roles || []
  const hasAccess = allowedRoles.some(role => userRoles.includes(role))

  if (!hasAccess) return <>{fallback}</>

  return <>{children}</>
}

// Usage
<RoleGate allowedRoles={['admin', 'superadmin']}>
  <AdminPanel />
</RoleGate>

<RoleGate allowedRoles={['admin']} fallback={<p>Access denied</p>}>
  <DeleteButton />
</RoleGate>
```

### Server Component Pattern

```typescript
// components/auth/server-role-gate.tsx
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

interface ServerRoleGateProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallback?: React.ReactNode
}

export async function ServerRoleGate({
  children,
  allowedRoles,
  fallback = null
}: ServerRoleGateProps) {
  const session = await auth()

  if (!session?.user?.id) return <>{fallback}</>

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    include: {
      userRoles: { include: { role: true } }
    }
  })

  const userRoles = user?.userRoles.map(ur => ur.role.slug) || []
  const hasAccess = allowedRoles.some(role => userRoles.includes(role))

  if (!hasAccess) return <>{fallback}</>

  return <>{children}</>
}

// Usage
<ServerRoleGate allowedRoles={['admin', 'auditor']}>
  <AuditLogViewer />
</ServerRoleGate>
```

### Permission Hook

```typescript
// hooks/use-permissions.ts
'use client'

import { useSession } from 'next-auth/react'

export function usePermissions() {
  const { data: session } = useSession()

  const roles = session?.user?.roles || []
  const primaryRole = session?.user?.role

  const hasRole = (role: string) => roles.includes(role)
  const hasAnyRole = (checkRoles: string[]) =>
    checkRoles.some(role => roles.includes(role))
  const hasAllRoles = (checkRoles: string[]) =>
    checkRoles.every(role => roles.includes(role))

  const isAdmin = hasAnyRole(['admin', 'superadmin'])
  const isSuperAdmin = hasRole('superadmin')
  const isApprover = hasRole('approver')
  const isAuditor = hasRole('auditor')

  return {
    roles,
    primaryRole,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isAdmin,
    isSuperAdmin,
    isApprover,
    isAuditor
  }
}

// Usage
function MyComponent() {
  const { isAdmin, hasRole } = usePermissions()

  return (
    <div>
      {isAdmin && <AdminButton />}
      {hasRole('approver') && <ApproveButton />}
    </div>
  )
}
```

---

## Role Seeding

```typescript
// prisma/seed.ts - Role definitions
const roles = [
  { name: 'Super Admin', slug: 'superadmin', description: 'Full system access' },
  { name: 'Administrator', slug: 'admin', description: 'System administrator' },
  { name: 'Approver', slug: 'approver', description: 'Can approve requests' },
  { name: 'Auditor', slug: 'auditor', description: 'Read-only audit access' },
  { name: 'Technician', slug: 'technician', description: 'Maintenance staff' },
  { name: 'User', slug: 'user', description: 'Standard user' }
]

for (const role of roles) {
  await prisma.role.upsert({
    where: { slug: role.slug },
    update: role,
    create: role
  })
}
```

---

## Best Practices

1. **Always check on server-side** - Client checks are for UX only
2. **Use requireRoles helper** - Consistent authorization pattern
3. **Log authorization failures** - Track potential security issues
4. **Principle of least privilege** - Grant minimum required permissions
5. **Audit role changes** - Log when roles are assigned/removed

---

*Version: 1.0.0 | For HR-IMS Project*
