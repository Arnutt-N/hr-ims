---
name: permission-manager
description: Advanced permission and access control management for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["permission", "access control", "acl", "capability", "authorize"]
  file_patterns: ["*permission*", "*access*", "*acl*"]
  context: permission management, access control, authorization
mcp_servers:
  - sequential
personas:
  - backend
  - security
---

# Permission Manager

## Core Role

Implement advanced permission and access control:
- Fine-grained permissions
- Resource-level access control
- Dynamic capability checks
- Permission inheritance

---

## Permission Service

```typescript
// lib/permission/service.ts
import prisma from '@/lib/prisma'
import { cache } from '@/lib/cache'

export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'MANAGE'
  conditions?: PermissionCondition[]
}

export interface PermissionCondition {
  field: string
  operator: 'equals' | 'in' | 'gt' | 'lt' | 'contains'
  value: any
}

export interface ResourceAccess {
  resourceType: string
  resourceId: number
  permissions: string[]
}

// Predefined permissions
export const PERMISSIONS: Permission[] = [
  // Inventory
  { id: 'inventory:create', name: 'Create Inventory', description: 'Create new inventory items', resource: 'InventoryItem', action: 'CREATE' },
  { id: 'inventory:read', name: 'View Inventory', description: 'View inventory items', resource: 'InventoryItem', action: 'READ' },
  { id: 'inventory:update', name: 'Update Inventory', description: 'Update inventory items', resource: 'InventoryItem', action: 'UPDATE' },
  { id: 'inventory:delete', name: 'Delete Inventory', description: 'Delete inventory items', resource: 'InventoryItem', action: 'DELETE' },
  { id: 'inventory:manage', name: 'Manage Inventory', description: 'Full inventory management', resource: 'InventoryItem', action: 'MANAGE' },

  // Requests
  { id: 'request:create', name: 'Create Request', description: 'Create requisition requests', resource: 'Request', action: 'CREATE' },
  { id: 'request:read', name: 'View Requests', description: 'View requisition requests', resource: 'Request', action: 'READ' },
  { id: 'request:update', name: 'Update Request', description: 'Update requisition requests', resource: 'Request', action: 'UPDATE' },
  { id: 'request:approve', name: 'Approve Requests', description: 'Approve or reject requests', resource: 'Request', action: 'MANAGE' },

  // Users
  { id: 'user:create', name: 'Create Users', description: 'Create new users', resource: 'User', action: 'CREATE' },
  { id: 'user:read', name: 'View Users', description: 'View user profiles', resource: 'User', action: 'READ' },
  { id: 'user:update', name: 'Update Users', description: 'Update user profiles', resource: 'User', action: 'UPDATE' },
  { id: 'user:delete', name: 'Delete Users', description: 'Delete users', resource: 'User', action: 'DELETE' },
  { id: 'user:manage', name: 'Manage Users', description: 'Full user management', resource: 'User', action: 'MANAGE' },

  // Warehouse
  { id: 'warehouse:create', name: 'Create Warehouse', description: 'Create warehouses', resource: 'Warehouse', action: 'CREATE' },
  { id: 'warehouse:read', name: 'View Warehouses', description: 'View warehouses', resource: 'Warehouse', action: 'READ' },
  { id: 'warehouse:manage', name: 'Manage Warehouses', description: 'Full warehouse management', resource: 'Warehouse', action: 'MANAGE' },

  // Reports
  { id: 'report:read', name: 'View Reports', description: 'View reports and analytics', resource: 'Report', action: 'READ' },
  { id: 'report:export', name: 'Export Reports', description: 'Export reports', resource: 'Report', action: 'MANAGE' },

  // Audit Logs
  { id: 'audit:read', name: 'View Audit Logs', description: 'View audit logs', resource: 'AuditLog', action: 'READ' },

  // Settings
  { id: 'settings:read', name: 'View Settings', description: 'View system settings', resource: 'Settings', action: 'READ' },
  { id: 'settings:update', name: 'Update Settings', description: 'Update system settings', resource: 'Settings', action: 'UPDATE' }
]

// Check if user has permission
export async function hasPermission(
  userId: number,
  permissionId: string,
  resourceId?: number
): Promise<boolean> {
  // Check cache first
  const cacheKey = `permission:${userId}:${permissionId}:${resourceId || 'any'}`
  const cached = await cache.get(cacheKey)
  if (cached !== null) {
    return cached === 'true'
  }

  // Get user with roles and permissions
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      }
    }
  })

  if (!user || user.status !== 'ACTIVE') {
    return false
  }

  // Check direct permission grants
  const hasDirectPermission = user.userRoles.some(ur =>
    ur.role.permissions.some(rp => rp.permissionId === permissionId)
  )

  if (hasDirectPermission) {
    // Check resource-level conditions if resourceId provided
    if (resourceId) {
      const hasResourceAccess = await checkResourceAccess(userId, permissionId, resourceId)
      await cache.set(cacheKey, hasResourceAccess ? 'true' : 'false', 300)
      return hasResourceAccess
    }

    await cache.set(cacheKey, 'true', 300)
    return true
  }

  // Check if user has 'manage' permission for the resource
  const permission = PERMISSIONS.find(p => p.id === permissionId)
  if (permission) {
    const managePermission = `${permission.resource.toLowerCase()}:manage`
    const hasManage = user.userRoles.some(ur =>
      ur.role.permissions.some(rp => rp.permissionId === managePermission)
    )

    if (hasManage) {
      await cache.set(cacheKey, 'true', 300)
      return true
    }
  }

  await cache.set(cacheKey, 'false', 300)
  return false
}

// Check resource-level access
async function checkResourceAccess(
  userId: number,
  permissionId: string,
  resourceId: number
): Promise<boolean> {
  // Check explicit resource access grants
  const access = await prisma.resourceAccess.findFirst({
    where: {
      userId,
      resourceType: permissionId.split(':')[0],
      resourceId,
      permissions: { has: permissionId }
    }
  })

  if (access) {
    return true
  }

  // Check department-level access
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { department: true }
  })

  if (user?.departmentId) {
    const deptAccess = await prisma.departmentAccess.findFirst({
      where: {
        departmentId: user.departmentId,
        resourceType: permissionId.split(':')[0],
        permissions: { has: permissionId }
      }
    })

    if (deptAccess) {
      return true
    }
  }

  // Default: allow if no resource-level restrictions
  return true
}

// Get all permissions for user
export async function getUserPermissions(userId: number): Promise<string[]> {
  const cacheKey = `user-permissions:${userId}`
  const cached = await cache.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      }
    }
  })

  if (!user) {
    return []
  }

  const permissions = new Set<string>()

  for (const ur of user.userRoles) {
    for (const rp of ur.role.permissions) {
      permissions.add(rp.permissionId)

      // Add implied permissions
      const perm = PERMISSIONS.find(p => p.id === rp.permissionId)
      if (perm?.action === 'MANAGE') {
        // MANAGE implies all other actions for the resource
        PERMISSIONS
          .filter(p => p.resource === perm.resource)
          .forEach(p => permissions.add(p.id))
      }
    }
  }

  const result = Array.from(permissions)
  await cache.set(cacheKey, JSON.stringify(result), 300)

  return result
}

// Grant permission to role
export async function grantPermissionToRole(
  roleId: number,
  permissionId: string,
  grantedBy: number
): Promise<void> {
  const permission = PERMISSIONS.find(p => p.id === permissionId)
  if (!permission) {
    throw new Error('Invalid permission')
  }

  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: { roleId, permissionId }
    },
    create: {
      roleId,
      permissionId,
      grantedById: grantedBy
    },
    update: {
      grantedById: grantedBy
    }
  })

  // Invalidate permission cache for all users with this role
  await invalidateRolePermissionCache(roleId)
}

// Revoke permission from role
export async function revokePermissionFromRole(
  roleId: number,
  permissionId: string
): Promise<void> {
  await prisma.rolePermission.delete({
    where: {
      roleId_permissionId: { roleId, permissionId }
    }
  })

  await invalidateRolePermissionCache(roleId)
}

// Grant resource access to user
export async function grantResourceAccess(
  userId: number,
  resourceType: string,
  resourceId: number,
  permissions: string[],
  grantedBy: number
): Promise<void> {
  await prisma.resourceAccess.upsert({
    where: {
      userId_resourceType_resourceId: {
        userId,
        resourceType,
        resourceId
      }
    },
    create: {
      userId,
      resourceType,
      resourceId,
      permissions,
      grantedById: grantedBy
    },
    update: {
      permissions,
      grantedById: grantedBy
    }
  })

  // Invalidate user permission cache
  await cache.del(`user-permissions:${userId}`)
}

// Revoke resource access
export async function revokeResourceAccess(
  userId: number,
  resourceType: string,
  resourceId: number
): Promise<void> {
  await prisma.resourceAccess.delete({
    where: {
      userId_resourceType_resourceId: {
        userId,
        resourceType,
        resourceId
      }
    }
  })

  await cache.del(`user-permissions:${userId}`)
}

// Get resources user can access
export async function getAccessibleResources(
  userId: number,
  resourceType: string,
  permissionId: string
): Promise<number[]> {
  // First check if user has global permission
  const hasGlobal = await hasPermission(userId, permissionId)
  if (hasGlobal) {
    // Return all accessible resource IDs
    const resources = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM ${resourceType}
    `
    return resources.map(r => r.id)
  }

  // Get explicitly granted resources
  const access = await prisma.resourceAccess.findMany({
    where: {
      userId,
      resourceType,
      permissions: { has: permissionId }
    },
    select: { resourceId: true }
  })

  return access.map(a => a.resourceId)
}

// Invalidate role permission cache
async function invalidateRolePermissionCache(roleId: number): Promise<void> {
  const users = await prisma.userRole.findMany({
    where: { roleId },
    select: { userId: true }
  })

  for (const user of users) {
    await cache.del(`user-permissions:${user.userId}`)
  }
}

// Check multiple permissions at once
export async function checkPermissions(
  userId: number,
  permissionIds: string[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {}

  await Promise.all(
    permissionIds.map(async (permId) => {
      results[permId] = await hasPermission(userId, permId)
    })
  )

  return results
}

// Permission middleware for Server Actions
export function requirePermission(permissionId: string) {
  return async (userId: number) => {
    const hasAccess = await hasPermission(userId, permissionId)
    if (!hasAccess) {
      throw new Error('Forbidden: Insufficient permissions')
    }
  }
}

// Get permission matrix for role
export async function getRolePermissionMatrix(
  roleId: number
): Promise<Record<string, boolean>> {
  const rolePerms = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permissionId: true }
  })

  const granted = new Set(rolePerms.map(rp => rp.permissionId))

  const matrix: Record<string, boolean> = {}
  for (const perm of PERMISSIONS) {
    matrix[perm.id] = granted.has(perm.id)
  }

  return matrix
}

// Update role permissions
export async function updateRolePermissions(
  roleId: number,
  permissionIds: string[],
  updatedBy: number
): Promise<void> {
  // Get current permissions
  const current = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permissionId: true }
  })

  const currentIds = new Set(current.map(p => p.permissionId))
  const newIds = new Set(permissionIds)

  // Add new permissions
  const toAdd = permissionIds.filter(id => !currentIds.has(id))
  for (const permId of toAdd) {
    await grantPermissionToRole(roleId, permId, updatedBy)
  }

  // Remove old permissions
  const toRemove = Array.from(currentIds).filter(id => !newIds.has(id))
  for (const permId of toRemove) {
    await revokePermissionFromRole(roleId, permId)
  }
}
```

---

## Permission Guard Component

```typescript
// components/permission/permission-guard.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { hasPermission, checkPermissions } from '@/lib/permission/client'

interface PermissionGuardProps {
  permission: string | string[]
  children: React.ReactNode
  fallback?: React.ReactNode
  resourceId?: number
}

export function PermissionGuard({
  permission,
  children,
  fallback = null,
  resourceId
}: PermissionGuardProps) {
  const { data: session } = useSession()

  const permissions = Array.isArray(permission) ? permission : [permission]

  const { data: hasAccess } = useQuery({
    queryKey: ['permissions', permissions, resourceId],
    queryFn: () => checkPermissions(permissions, resourceId),
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  if (!hasAccess) {
    return <>{fallback}</>
  }

  // Check if all permissions are granted
  const allGranted = permissions.every(
    perm => hasAccess?.[perm] === true
  )

  if (!allGranted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Hook for permission checks
export function usePermission(permission: string, resourceId?: number) {
  const { data: session } = useSession()

  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ['permission', permission, resourceId],
    queryFn: () => hasPermission(permission, resourceId),
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000
  })

  return {
    hasAccess: hasAccess ?? false,
    isLoading
  }
}

// Hook for multiple permissions
export function usePermissions(permissions: string[]) {
  const { data: session } = useSession()

  const { data: results, isLoading } = useQuery({
    queryKey: ['permissions', permissions],
    queryFn: () => checkPermissions(permissions),
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000
  })

  return {
    permissions: results ?? {},
    isLoading,
    hasAll: permissions.every(p => results?.[p] === true),
    hasAny: permissions.some(p => results?.[p] === true)
  }
}
```

---

## Permission Editor Component

```typescript
// components/permission/permission-editor.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Loader2, Save, Shield } from 'lucide-react'
import { PERMISSIONS, getRolePermissionMatrix, updateRolePermissions } from '@/lib/permission/service'

interface PermissionEditorProps {
  roleId: number
  roleName: string
  onSave?: () => void
}

export function PermissionEditor({
  roleId,
  roleName,
  onSave
}: PermissionEditorProps) {
  const { locale } = useI18n()
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Load current permissions
  const loadPermissions = async () => {
    setLoading(true)
    try {
      const matrix = await getRolePermissionMatrix(roleId)
      setPermissions(matrix)
      setInitialized(true)
    } catch (error) {
      console.error('Failed to load permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Save permissions
  const handleSave = async () => {
    setSaving(true)
    try {
      const granted = Object.entries(permissions)
        .filter(([_, granted]) => granted)
        .map(([permId]) => permId)

      await updateRolePermissions(roleId, granted, 1) // TODO: Get current user ID
      onSave?.()
    } catch (error) {
      console.error('Failed to save permissions:', error)
    } finally {
      setSaving(false)
    }
  }

  // Toggle permission
  const togglePermission = (permissionId: string) => {
    setPermissions(prev => ({
      ...prev,
      [permissionId]: !prev[permissionId]
    }))
  }

  // Toggle all permissions for resource
  const toggleResourcePermissions = (resource: string, checked: boolean) => {
    setPermissions(prev => {
      const updated = { ...prev }
      PERMISSIONS
        .filter(p => p.resource === resource)
        .forEach(p => {
          updated[p.id] = checked
        })
      return updated
    })
  }

  // Group permissions by resource
  const groupedPermissions = PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {} as Record<string, typeof PERMISSIONS>)

  // Check if all permissions for resource are granted
  const isResourceFullyGranted = (resource: string) => {
    const perms = groupedPermissions[resource]
    return perms.every(p => permissions[p.id])
  }

  // Check if some permissions for resource are granted
  const isResourcePartiallyGranted = (resource: string) => {
    const perms = groupedPermissions[resource]
    return perms.some(p => permissions[p.id]) && !isResourceFullyGranted(resource)
  }

  if (!initialized && !loading) {
    loadPermissions()
  }

  const resourceLabels: Record<string, { en: string; th: string }> = {
    InventoryItem: { en: 'Inventory', th: 'พัสดุ' },
    Request: { en: 'Requests', th: 'คำขอ' },
    User: { en: 'Users', th: 'ผู้ใช้' },
    Warehouse: { en: 'Warehouses', th: 'คลังพัสดุ' },
    Report: { en: 'Reports', th: 'รายงาน' },
    AuditLog: { en: 'Audit Logs', th: 'ประวัติการใช้งาน' },
    Settings: { en: 'Settings', th: 'การตั้งค่า' }
  }

  const actionLabels: Record<string, { en: string; th: string }> = {
    CREATE: { en: 'Create', th: 'สร้าง' },
    READ: { en: 'View', th: 'ดู' },
    UPDATE: { en: 'Update', th: 'แก้ไข' },
    DELETE: { en: 'Delete', th: 'ลบ' },
    MANAGE: { en: 'Manage (Full)', th: 'จัดการ (ทั้งหมด)' }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {locale === 'th' ? 'สิทธิ์การใช้งาน' : 'Permissions'} - {roleName}
          </CardTitle>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {locale === 'th' ? 'บันทึก' : 'Save'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Accordion type="multiple" className="w-full">
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <AccordionItem key={resource} value={resource}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isResourceFullyGranted(resource)}
                        ref={(el) => {
                          if (el) {
                            (el as any).indeterminate = isResourcePartiallyGranted(resource)
                          }
                        }}
                        onCheckedChange={(checked) =>
                          toggleResourcePermissions(resource, checked as boolean)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="font-medium">
                        {resourceLabels[resource]
                          ? locale === 'th'
                            ? resourceLabels[resource].th
                            : resourceLabels[resource].en
                          : resource}
                      </span>
                      {isResourceFullyGranted(resource) && (
                        <Badge variant="default" className="ml-2">
                          {locale === 'th' ? 'เข้าถึงทั้งหมด' : 'Full Access'}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-3 pt-2 pl-8">
                      {perms.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-center space-x-2 p-2 rounded hover:bg-muted"
                        >
                          <Checkbox
                            id={perm.id}
                            checked={permissions[perm.id] || false}
                            onCheckedChange={() => togglePermission(perm.id)}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={perm.id}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {actionLabels[perm.action]
                                ? locale === 'th'
                                  ? actionLabels[perm.action].th
                                  : actionLabels[perm.action].en
                                : perm.action}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {perm.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Prisma Schema

```prisma
// Role Permission
model RolePermission {
  roleId       Int
  permissionId String
  grantedAt    DateTime @default(now())
  grantedById  Int

  role         Role     @relation(fields: [roleId], references: [id], onDelete: Cascade)
  grantedBy    User     @relation("PermissionGranter", fields: [grantedById], references: [id])

  @@id([roleId, permissionId])
  @@index([roleId])
}

// Resource Access
model ResourceAccess {
  id           Int      @id @default(autoincrement())
  userId       Int
  resourceType String
  resourceId   Int
  permissions  String[] // Array of permission IDs
  grantedAt    DateTime @default(now())
  grantedById  Int

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  grantedBy    User     @relation("ResourceAccessGranter", fields: [grantedById], references: [id])

  @@unique([userId, resourceType, resourceId])
  @@index([userId])
  @@index([resourceType, resourceId])
}

// Department Access
model DepartmentAccess {
  id           Int      @id @default(autoincrement())
  departmentId Int
  resourceType String
  permissions  String[]
  grantedAt    DateTime @default(now())
  grantedById  Int

  department   Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  grantedBy    User       @relation("DeptAccessGranter", fields: [grantedById], references: [id])

  @@index([departmentId])
  @@index([resourceType])
}

// Update Role model
model Role {
  // ... existing fields
  permissions RolePermission[]
}
```

---

## Usage Examples

```tsx
// Example 1: Protect UI elements
import { PermissionGuard } from '@/components/permission/permission-guard'

function InventoryActions({ item }) {
  return (
    <div className="flex gap-2">
      <PermissionGuard permission="inventory:update">
        <Button>Edit</Button>
      </PermissionGuard>

      <PermissionGuard
        permission="inventory:delete"
        fallback={<Button disabled>Delete</Button>}
      >
        <Button variant="destructive">Delete</Button>
      </PermissionGuard>

      <PermissionGuard permission={['inventory:read', 'inventory:update']} resourceId={item.id}>
        <Button>Special Action</Button>
      </PermissionGuard>
    </div>
  )
}

// Example 2: Check permissions in Server Actions
import { hasPermission, requirePermission } from '@/lib/permission/service'

export async function updateInventoryItem(itemId: number, data: any) {
  const session = await auth()
  if (!session) throw new Error('Unauthorized')

  await requirePermission('inventory:update')(parseInt(session.user.id))

  // Or with resource-level check
  const canAccess = await hasPermission(
    parseInt(session.user.id),
    'inventory:update',
    itemId
  )

  if (!canAccess) {
    throw new Error('Forbidden')
  }

  // Proceed with update
}

// Example 3: Use permission hook
import { usePermission, usePermissions } from '@/components/permission/permission-guard'

function UserActions({ userId }) {
  const { hasAccess, isLoading } = usePermission('user:delete', userId)
  const { permissions, hasAll } = usePermissions(['user:read', 'user:update'])

  if (isLoading) return <Skeleton />

  return (
    <div>
      {permissions['user:read'] && <Button>View</Button>}
      {permissions['user:update'] && <Button>Edit</Button>}
      {hasAccess && <Button variant="destructive">Delete</Button>}
    </div>
  )
}

// Example 4: Filter data by accessible resources
import { getAccessibleResources } from '@/lib/permission/service'

export async function getInventoryItems(userId: number) {
  const accessibleIds = await getAccessibleResources(
    userId,
    'InventoryItem',
    'inventory:read'
  )

  return prisma.inventoryItem.findMany({
    where: {
      id: { in: accessibleIds }
    }
  })
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
