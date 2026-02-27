---
name: session-manager
description: Session management and authentication state utilities for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["session", "auth", "authentication", "login state", "user session"]
  file_patterns: ["*session*", "hooks/use-session*", "lib/auth*"]
  context: Session management, authentication state, user info
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Session Manager

## Core Role

Manage user sessions and authentication state for HR-IMS:
- Session state access
- Authentication checks
- Role-based access
- Session timeout handling

---

## Session Hook

```typescript
// hooks/use-session.ts
'use client'

import { useSession as useNextAuthSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useCallback } from 'react'

interface UseSessionOptions {
  required?: boolean
  redirectTo?: string
  onUnauthenticated?: () => void
}

export function useSession(options: UseSessionOptions = {}) {
  const { required = false, redirectTo = '/login', onUnauthenticated } = options
  const { data: session, status, update } = useNextAuthSession()
  const router = useRouter()

  const isAuthenticated = status === 'authenticated'
  const isLoading = status === 'loading'
  const isUnauthenticated = status === 'unauthenticated'

  useEffect(() => {
    if (required && isUnauthenticated) {
      if (onUnauthenticated) {
        onUnauthenticated()
      } else {
        router.push(redirectTo)
      }
    }
  }, [required, isUnauthenticated, redirectTo, onUnauthenticated, router])

  const refreshSession = useCallback(async () => {
    await update()
  }, [update])

  return {
    session,
    status,
    isAuthenticated,
    isLoading,
    isUnauthenticated,
    refreshSession,
    user: session?.user
  }
}
```

---

## User Info Hook

```typescript
// hooks/use-user.ts
'use client'

import { useSession } from './use-session'
import { useMemo } from 'react'

interface UserInfo {
  id: number
  email: string
  name: string
  role: string
  roles: string[]
  image?: string
  department?: string
  position?: string
}

export function useUser(): UserInfo | null {
  const { user } = useSession()

  return useMemo(() => {
    if (!user) return null

    return {
      id: parseInt(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
      roles: user.roles || [user.role],
      image: user.image,
      department: user.department,
      position: user.position
    }
  }, [user])
}

// Get specific user field
export function useUserId(): number | null {
  const user = useUser()
  return user?.id ?? null
}

export function useUserRole(): string | null {
  const user = useUser()
  return user?.role ?? null
}

export function useUserRoles(): string[] {
  const user = useUser()
  return user?.roles ?? []
}
```

---

## Permission Hook

```typescript
// hooks/use-permissions.ts
'use client'

import { useUserRoles } from './use-user'
import { useMemo } from 'react'

// Role hierarchy
const roleHierarchy: Record<string, number> = {
  'superadmin': 100,
  'admin': 80,
  'approver': 60,
  'auditor': 40,
  'technician': 30,
  'user': 10
}

// Permission definitions
const permissions: Record<string, string[]> = {
  // User management
  'users.view': ['superadmin', 'admin'],
  'users.create': ['superadmin', 'admin'],
  'users.edit': ['superadmin', 'admin'],
  'users.delete': ['superadmin'],
  'users.resetPassword': ['superadmin', 'admin'],

  // Inventory
  'inventory.view': ['superadmin', 'admin', 'approver', 'user'],
  'inventory.create': ['superadmin', 'admin'],
  'inventory.edit': ['superadmin', 'admin'],
  'inventory.delete': ['superadmin', 'admin'],

  // Requests
  'requests.view': ['superadmin', 'admin', 'approver', 'user'],
  'requests.create': ['superadmin', 'admin', 'approver', 'user'],
  'requests.approve': ['superadmin', 'admin', 'approver'],
  'requests.reject': ['superadmin', 'admin', 'approver'],

  // Warehouse
  'warehouse.view': ['superadmin', 'admin', 'user'],
  'warehouse.manage': ['superadmin', 'admin'],

  // Audit logs
  'audit.view': ['superadmin', 'auditor'],

  // Settings
  'settings.view': ['superadmin', 'admin'],
  'settings.edit': ['superadmin'],

  // Reports
  'reports.view': ['superadmin', 'admin', 'auditor'],
  'reports.export': ['superadmin', 'admin', 'auditor']
}

export function usePermissions() {
  const userRoles = useUserRoles()

  const hasRole = useMemo(() => {
    return (role: string): boolean => {
      return userRoles.includes(role)
    }
  }, [userRoles])

  const hasAnyRole = useMemo(() => {
    return (roles: string[]): boolean => {
      return roles.some(role => userRoles.includes(role))
    }
  }, [userRoles])

  const hasAllRoles = useMemo(() => {
    return (roles: string[]): boolean => {
      return roles.every(role => userRoles.includes(role))
    }
  }, [userRoles])

  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      const allowedRoles = permissions[permission]
      if (!allowedRoles) return false
      return hasAnyRole(allowedRoles)
    }
  }, [hasAnyRole])

  const getHighestRole = useMemo(() => {
    return (): string | null => {
      let highest: string | null = null
      let highestLevel = 0

      userRoles.forEach(role => {
        const level = roleHierarchy[role] || 0
        if (level > highestLevel) {
          highestLevel = level
          highest = role
        }
      })

      return highest
    }
  }, [userRoles])

  const isAtLeast = useMemo(() => {
    return (role: string): boolean => {
      const requiredLevel = roleHierarchy[role] || 0
      return userRoles.some(userRole => {
        const userLevel = roleHierarchy[userRole] || 0
        return userLevel >= requiredLevel
      })
    }
  }, [userRoles])

  const isAdmin = useMemo(() => {
    return hasAnyRole(['superadmin', 'admin'])
  }, [hasAnyRole])

  const isSuperAdmin = useMemo(() => {
    return hasRole('superadmin')
  }, [hasRole])

  const isApprover = useMemo(() => {
    return hasAnyRole(['superadmin', 'admin', 'approver'])
  }, [hasAnyRole])

  return {
    roles: userRoles,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    hasPermission,
    getHighestRole,
    isAtLeast,
    isAdmin,
    isSuperAdmin,
    isApprover
  }
}
```

---

## Auth Guard Component

```typescript
// components/auth/auth-guard.tsx
'use client'

import { useSession } from '@/hooks/use-session'
import { usePermissions } from '@/hooks/use-permissions'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface AuthGuardProps {
  children: ReactNode
  requireAuth?: boolean
  requireRole?: string | string[]
  requirePermission?: string
  fallback?: ReactNode
  loadingComponent?: ReactNode
}

export function AuthGuard({
  children,
  requireAuth = true,
  requireRole,
  requirePermission,
  fallback = null,
  loadingComponent
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useSession()
  const { hasRole, hasAnyRole, hasPermission } = usePermissions()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, requireAuth, isAuthenticated, router])

  // Loading state
  if (isLoading) {
    return (
      loadingComponent || (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    )
  }

  // Not authenticated
  if (requireAuth && !isAuthenticated) {
    return fallback
  }

  // Role check
  if (requireRole) {
    const roles = Array.isArray(requireRole) ? requireRole : [requireRole]
    if (!hasAnyRole(roles)) {
      return fallback || <AccessDenied />
    }
  }

  // Permission check
  if (requirePermission && !hasPermission(requirePermission)) {
    return fallback || <AccessDenied />
  }

  return <>{children}</>
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
      <h2 className="text-xl font-semibold text-destructive">Access Denied</h2>
      <p className="text-muted-foreground mt-2">
        คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ / You don't have permission to access this section
      </p>
    </div>
  )
}

// Usage examples
// <AuthGuard requireRole="admin">
//   <AdminPanel />
// </AuthGuard>

// <AuthGuard requirePermission="users.delete">
//   <DeleteUserButton />
// </AuthGuard>
```

---

## Session Timeout Handler

```typescript
// hooks/use-session-timeout.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useSession } from './use-session'
import { signOut } from 'next-auth/react'

interface UseSessionTimeoutOptions {
  timeout?: number // in milliseconds
  warningTime?: number // warn before timeout
  onWarning?: () => void
  onTimeout?: () => void
  enabled?: boolean
}

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    timeout = 30 * 60 * 1000, // 30 minutes
    warningTime = 5 * 60 * 1000, // 5 minutes before timeout
    onWarning,
    onTimeout,
    enabled = true
  } = options

  const { isAuthenticated } = useSession()
  const timeoutRef = useRef<NodeJS.Timeout>()
  const warningRef = useRef<NodeJS.Timeout>()
  const lastActivityRef = useRef<number>(Date.now())

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)

    if (!isAuthenticated || !enabled) return

    // Set warning timer
    warningRef.current = setTimeout(() => {
      onWarning?.()
    }, timeout - warningTime)

    // Set timeout timer
    timeoutRef.current = setTimeout(() => {
      onTimeout?.()
      signOut({ callbackUrl: '/login?reason=timeout' })
    }, timeout)
  }, [isAuthenticated, enabled, timeout, warningTime, onWarning, onTimeout])

  useEffect(() => {
    if (!enabled) return

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']

    const handleActivity = () => {
      resetTimer()
    }

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true })
    })

    resetTimer()

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [enabled, resetTimer])

  return {
    lastActivity: lastActivityRef.current,
    resetTimer
  }
}
```

---

## Session Warning Dialog

```typescript
// components/auth/session-warning-dialog.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'

interface SessionWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expiresIn: number // seconds
  onExtend: () => void
}

export function SessionWarningDialog({
  open,
  onOpenChange,
  expiresIn,
  onExtend
}: SessionWarningDialogProps) {
  const [countdown, setCountdown] = useState(expiresIn)

  useEffect(() => {
    if (!open) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          signOut({ callbackUrl: '/login?reason=timeout' })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [open])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Session Expiring Soon</DialogTitle>
        </DialogHeader>

        <div className="py-4 text-center">
          <p className="text-muted-foreground">
            เซสชันของคุณจะหมดอายุใน / Your session will expire in
          </p>
          <p className="text-4xl font-bold text-destructive my-4">
            {formatTime(countdown)}
          </p>
          <p className="text-sm text-muted-foreground">
            คลิก "ต่ออายุเซสชัน" เพื่อยังคงใช้งานต่อ / Click "Extend Session" to continue
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            ออกจากระบบ / Logout
          </Button>
          <Button onClick={onExtend}>
            ต่ออายุเซสชัน / Extend Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Server-Side Session Utilities

```typescript
// lib/auth/server-session.ts
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

export async function getServerSession() {
  return auth()
}

export async function requireAuth() {
  const session = await auth()
  if (!session) {
    redirect('/login')
  }
  return session
}

export async function requireRole(role: string | string[]) {
  const session = await requireAuth()
  const roles = Array.isArray(role) ? role : [role]

  const userRoles = await prisma.userRole.findMany({
    where: { userId: parseInt(session.user.id) },
    include: { role: true }
  })

  const hasRole = userRoles.some(ur => roles.includes(ur.role.slug))

  if (!hasRole) {
    redirect('/unauthorized')
  }

  return session
}

export async function getServerUser() {
  const session = await auth()
  if (!session?.user) return null

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) },
    include: {
      userRoles: {
        include: { role: true }
      }
    }
  })

  return user
}

export async function getServerUserRoles(): Promise<string[]> {
  const session = await auth()
  if (!session?.user) return []

  const userRoles = await prisma.userRole.findMany({
    where: { userId: parseInt(session.user.id) },
    include: { role: true }
  })

  return userRoles.map(ur => ur.role.slug)
}
```

---

## Auth Actions

```typescript
// lib/actions/auth.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { hash, compare } from 'bcrypt'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export async function changePassword(formData: FormData) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const data = {
    currentPassword: formData.get('currentPassword') as string,
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string
  }

  const validated = changePasswordSchema.safeParse(data)
  if (!validated.success) {
    return { error: validated.error.errors[0].message }
  }

  const user = await prisma.user.findUnique({
    where: { id: parseInt(session.user.id) }
  })

  if (!user) return { error: 'User not found' }

  const isValid = await compare(data.currentPassword, user.password)
  if (!isValid) {
    return { error: 'Current password is incorrect' }
  }

  const hashedPassword = await hash(data.newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      tokenVersion: { increment: 1 } // Invalidate all sessions
    }
  })

  revalidatePath('/settings')
  return { success: true }
}

export async function updateProfile(formData: FormData) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const department = formData.get('department') as string
  const position = formData.get('position') as string

  await prisma.user.update({
    where: { id: parseInt(session.user.id) },
    data: { name, phone, department, position }
  })

  revalidatePath('/settings')
  return { success: true }
}
```

---

## Usage Examples

```typescript
// Example 1: Require authentication in page
function ProtectedPage() {
  const { user, isAuthenticated } = useSession({ required: true })

  if (!isAuthenticated) return null

  return <div>Welcome, {user?.name}</div>
}

// Example 2: Check permissions
function DeleteUserButton({ userId }: { userId: number }) {
  const { hasPermission } = usePermissions()

  if (!hasPermission('users.delete')) return null

  return <Button variant="destructive">Delete User</Button>
}

// Example 3: Auth guard wrapper
<AuthGuard requireRole="admin">
  <AdminPanel />
</AuthGuard>

// Example 4: Session timeout
function App() {
  const [showWarning, setShowWarning] = useState(false)

  useSessionTimeout({
    timeout: 30 * 60 * 1000,
    onWarning: () => setShowWarning(true),
    onExtend: () => setShowWarning(false)
  })

  return (
    <>
      <SessionWarningDialog
        open={showWarning}
        onOpenChange={setShowWarning}
        expiresIn={300}
        onExtend={() => setShowWarning(false)}
      />
      {/* App content */}
    </>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
