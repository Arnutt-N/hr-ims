---
name: feature-flags
description: Feature flags and A/B testing for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["feature flag", "feature toggle", "a/b test", "rollout", "canary release"]
  file_patterns: ["*feature*", "*flag*", "lib/feature*", "lib/flags*"]
  context: feature flags, feature toggles, A/B testing, gradual rollout, canary releases
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Feature Flags

## Core Role

Implement feature flags for HR-IMS:
- Feature toggles
- A/B testing
- Gradual rollout
- Environment-based flags

---

## Feature Flag Service

```typescript
// lib/feature-flags/service.ts
import prisma from '@/lib/prisma'

export interface FeatureFlag {
  key: string
  name: string
  description?: string
  enabled: boolean
  rolloutPercentage: number
  targetUsers: number[]
  targetRoles: string[]
  targetDepartments: string[]
  environments: ('development' | 'staging' | 'production')[]
  variants?: FeatureVariant[]
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface FeatureVariant {
  name: string
  percentage: number
  config?: Record<string, any>
}

// Get feature flag by key
export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  // Check cache first
  const cached = flagCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const flag = await prisma.featureFlag.findUnique({
    where: { key }
  })

  if (!flag) return null

  const featureFlag: FeatureFlag = {
    key: flag.key,
    name: flag.name,
    description: flag.description || undefined,
    enabled: flag.enabled,
    rolloutPercentage: flag.rolloutPercentage,
    targetUsers: (flag.targetUsers as number[]) || [],
    targetRoles: (flag.targetRoles as string[]) || [],
    targetDepartments: (flag.targetDepartments as string[]) || [],
    environments: (flag.environments as FeatureFlag['environments']) || ['production'],
    variants: (flag.variants as FeatureVariant[]) || undefined,
    metadata: (flag.metadata as Record<string, any>) || undefined,
    createdAt: flag.createdAt,
    updatedAt: flag.updatedAt
  }

  // Cache for 1 minute
  flagCache.set(key, {
    value: featureFlag,
    expiresAt: Date.now() + 60000
  })

  return featureFlag
}

// Simple in-memory cache
const flagCache = new Map<string, { value: FeatureFlag; expiresAt: number }>()

// Clear cache
export function clearFlagCache(key?: string): void {
  if (key) {
    flagCache.delete(key)
  } else {
    flagCache.clear()
  }
}

// Check if feature is enabled for user
export async function isFeatureEnabled(
  key: string,
  user?: {
    id: number
    role: string
    department?: string
  }
): Promise<boolean> {
  const flag = await getFeatureFlag(key)

  if (!flag || !flag.enabled) {
    return false
  }

  // Check environment
  const currentEnv = process.env.NODE_ENV === 'production' ? 'production' :
                     process.env.NODE_ENV === 'staging' ? 'staging' : 'development'

  if (!flag.environments.includes(currentEnv)) {
    return false
  }

  // If no user context, check global rollout
  if (!user) {
    return flag.rolloutPercentage >= 100
  }

  // Check if user is in target users
  if (flag.targetUsers.includes(user.id)) {
    return true
  }

  // Check if user role is in target roles
  if (flag.targetRoles.length > 0 && flag.targetRoles.includes(user.role)) {
    return true
  }

  // Check if user department is in target departments
  if (user.department && flag.targetDepartments.includes(user.department)) {
    return true
  }

  // Check rollout percentage
  if (flag.rolloutPercentage >= 100) {
    return true
  }

  if (flag.rolloutPercentage <= 0) {
    return false
  }

  // Deterministic rollout based on user ID and flag key
  const hash = hashUserId(user.id, key)
  return (hash % 100) < flag.rolloutPercentage
}

// Get feature variant for user
export async function getFeatureVariant(
  key: string,
  user?: { id: number }
): Promise<string | null> {
  const flag = await getFeatureFlag(key)

  if (!flag || !flag.enabled || !flag.variants || flag.variants.length === 0) {
    return null
  }

  const userId = user?.id || 0
  const hash = hashUserId(userId, key)
  let cumulative = 0

  for (const variant of flag.variants) {
    cumulative += variant.percentage
    if ((hash % 100) < cumulative) {
      return variant.name
    }
  }

  return flag.variants[0].name
}

// Get variant config
export async function getFeatureVariantConfig<T = any>(
  key: string,
  user?: { id: number }
): Promise<T | null> {
  const flag = await getFeatureFlag(key)

  if (!flag || !flag.enabled || !flag.variants) {
    return null
  }

  const variantName = await getFeatureVariant(key, user)
  const variant = flag.variants.find(v => v.name === variantName)

  return (variant?.config as T) || null
}

// Simple hash function for deterministic rollout
function hashUserId(userId: number, key: string): number {
  const str = `${userId}:${key}`
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash)
}

// Get all feature flags
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const flags = await prisma.featureFlag.findMany({
    orderBy: { key: 'asc' }
  })

  return flags.map(flag => ({
    key: flag.key,
    name: flag.name,
    description: flag.description || undefined,
    enabled: flag.enabled,
    rolloutPercentage: flag.rolloutPercentage,
    targetUsers: (flag.targetUsers as number[]) || [],
    targetRoles: (flag.targetRoles as string[]) || [],
    targetDepartments: (flag.targetDepartments as string[]) || [],
    environments: (flag.environments as FeatureFlag['environments']) || ['production'],
    variants: (flag.variants as FeatureVariant[]) || undefined,
    metadata: (flag.metadata as Record<string, any>) || undefined,
    createdAt: flag.createdAt,
    updatedAt: flag.updatedAt
  }))
}

// Create or update feature flag
export async function upsertFeatureFlag(
  key: string,
  data: Partial<Omit<FeatureFlag, 'key' | 'createdAt' | 'updatedAt'>>
): Promise<FeatureFlag> {
  const flag = await prisma.featureFlag.upsert({
    where: { key },
    create: {
      key,
      name: data.name || key,
      description: data.description,
      enabled: data.enabled ?? false,
      rolloutPercentage: data.rolloutPercentage ?? 0,
      targetUsers: data.targetUsers || [],
      targetRoles: data.targetRoles || [],
      targetDepartments: data.targetDepartments || [],
      environments: data.environments || ['production'],
      variants: data.variants || [],
      metadata: data.metadata || {}
    },
    update: {
      name: data.name,
      description: data.description,
      enabled: data.enabled,
      rolloutPercentage: data.rolloutPercentage,
      targetUsers: data.targetUsers || [],
      targetRoles: data.targetRoles || [],
      targetDepartments: data.targetDepartments || [],
      environments: data.environments,
      variants: data.variants,
      metadata: data.metadata
    }
  })

  clearFlagCache(key)

  return {
    key: flag.key,
    name: flag.name,
    description: flag.description || undefined,
    enabled: flag.enabled,
    rolloutPercentage: flag.rolloutPercentage,
    targetUsers: (flag.targetUsers as number[]) || [],
    targetRoles: (flag.targetRoles as string[]) || [],
    targetDepartments: (flag.targetDepartments as string[]) || [],
    environments: (flag.environments as FeatureFlag['environments']) || ['production'],
    variants: (flag.variants as FeatureVariant[]) || undefined,
    metadata: (flag.metadata as Record<string, any>) || undefined,
    createdAt: flag.createdAt,
    updatedAt: flag.updatedAt
  }
}

// Delete feature flag
export async function deleteFeatureFlag(key: string): Promise<void> {
  await prisma.featureFlag.delete({ where: { key } })
  clearFlagCache(key)
}
```

---

## Feature Flag Hook

```typescript
// hooks/use-feature-flag.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export function useFeatureFlag(key: string): {
  enabled: boolean
  loading: boolean
  variant: string | null
  config: any
} {
  const { data: session } = useSession()
  const [enabled, setEnabled] = useState(false)
  const [variant, setVariant] = useState<string | null>(null)
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkFlag = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/feature-flags/${key}/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session?.user?.id ? parseInt(session.user.id) : null,
            role: session?.user?.role,
            department: session?.user?.department
          })
        })

        const data = await response.json()
        setEnabled(data.enabled)
        setVariant(data.variant)
        setConfig(data.config)
      } catch (error) {
        console.error('Failed to check feature flag:', error)
        setEnabled(false)
      } finally {
        setLoading(false)
      }
    }

    checkFlag()
  }, [key, session])

  return { enabled, loading, variant, config }
}

// Multiple flags hook
export function useFeatureFlags(keys: string[]): {
  flags: Record<string, boolean>
  loading: boolean
} {
  const { data: session } = useSession()
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkFlags = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/feature-flags/check-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            keys,
            userId: session?.user?.id ? parseInt(session.user.id) : null,
            role: session?.user?.role
          })
        })

        const data = await response.json()
        setFlags(data.flags)
      } catch (error) {
        console.error('Failed to check feature flags:', error)
      } finally {
        setLoading(false)
      }
    }

    checkFlags()
  }, [keys.join(','), session])

  return { flags, loading }
}

// Feature gate component
interface FeatureGateProps {
  flag: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const { enabled, loading } = useFeatureFlag(flag)

  if (loading) {
    return null
  }

  if (!enabled) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Variant component
interface FeatureVariantProps {
  flag: string
  variants: Record<string, React.ReactNode>
  defaultVariant?: React.ReactNode
}

export function FeatureVariant({
  flag,
  variants,
  defaultVariant = null
}: FeatureVariantProps) {
  const { variant, loading } = useFeatureFlag(flag)

  if (loading) {
    return null
  }

  const content = variants[variant || 'default'] || defaultVariant

  return <>{content}</>
}
```

---

## Feature Flag API Routes

```typescript
// app/api/feature-flags/[key]/check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  isFeatureEnabled,
  getFeatureVariant,
  getFeatureVariantConfig
} from '@/lib/feature-flags/service'

export async function POST(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const body = await request.json()
  const { userId, role, department } = body

  const user = userId ? { id: userId, role: role || 'user', department } : undefined

  const [enabled, variant, config] = await Promise.all([
    isFeatureEnabled(params.key, user),
    getFeatureVariant(params.key, user),
    getFeatureVariantConfig(params.key, user)
  ])

  return NextResponse.json({
    enabled,
    variant,
    config
  })
}

// app/api/feature-flags/check-batch/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isFeatureEnabled } from '@/lib/feature-flags/service'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { keys, userId, role, department } = body

  const user = userId ? { id: userId, role: role || 'user', department } : undefined

  const results = await Promise.all(
    keys.map(async (key: string) => ({
      key,
      enabled: await isFeatureEnabled(key, user)
    }))
  )

  const flags = results.reduce((acc, { key, enabled }) => {
    acc[key] = enabled
    return acc
  }, {} as Record<string, boolean>)

  return NextResponse.json({ flags })
}

// app/api/admin/feature-flags/route.ts
import { NextRequest, NextResponse } from 'next/server'
import {
  getAllFeatureFlags,
  upsertFeatureFlag
} from '@/lib/feature-flags/service'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session || !['admin', 'superadmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const flags = await getAllFeatureFlags()
  return NextResponse.json({ flags })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'superadmin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { key, ...data } = body

  const flag = await upsertFeatureFlag(key, data)
  return NextResponse.json({ flag })
}
```

---

## Feature Flag Admin Component

```typescript
// components/admin/feature-flag-manager.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react'
import { FeatureFlag } from '@/lib/feature-flags/service'

export function FeatureFlagManager() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialog, setEditDialog] = useState<{
    open: boolean
    flag: FeatureFlag | null
  }>({ open: false, flag: null })

  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    enabled: false,
    rolloutPercentage: 0,
    targetRoles: [] as string[],
    environments: ['production'] as string[]
  })

  const fetchFlags = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/feature-flags')
      const data = await response.json()
      setFlags(data.flags || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFlags()
  }, [])

  const handleToggle = async (key: string, enabled: boolean) => {
    await fetch('/api/admin/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, enabled })
    })
    fetchFlags()
  }

  const handleSave = async () => {
    if (!formData.key) return

    await fetch('/api/admin/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    setEditDialog({ open: false, flag: null })
    fetchFlags()
  }

  const openCreate = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      enabled: false,
      rolloutPercentage: 0,
      targetRoles: [],
      environments: ['production']
    })
    setEditDialog({ open: true, flag: null })
  }

  const openEdit = (flag: FeatureFlag) => {
    setFormData({
      key: flag.key,
      name: flag.name,
      description: flag.description || '',
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      targetRoles: flag.targetRoles,
      environments: flag.environments
    })
    setEditDialog({ open: true, flag })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Feature Flags</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Flag
        </Button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : flags.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No feature flags configured
            </CardContent>
          </Card>
        ) : (
          flags.map((flag) => (
            <Card key={flag.key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {flag.enabled ? (
                      <ToggleRight className="h-6 w-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-gray-400" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{flag.name}</span>
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">
                          {flag.key}
                        </code>
                        {flag.rolloutPercentage < 100 && (
                          <Badge variant="outline">
                            {flag.rolloutPercentage}% rollout
                          </Badge>
                        )}
                      </div>
                      {flag.description && (
                        <p className="text-sm text-muted-foreground">
                          {flag.description}
                        </p>
                      )}
                      <div className="flex gap-1 mt-1">
                        {flag.targetRoles.map((role) => (
                          <Badge key={role} variant="secondary" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={(checked) => handleToggle(flag.key, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(flag)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, flag: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.flag ? 'Edit Feature Flag' : 'Create Feature Flag'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Key</label>
              <Input
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="feature-key"
                disabled={!!editDialog.flag}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Feature Name"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
              <span className="text-sm">Enabled</span>
            </div>

            <div>
              <label className="text-sm font-medium">
                Rollout Percentage: {formData.rolloutPercentage}%
              </label>
              <Slider
                value={[formData.rolloutPercentage]}
                onValueChange={([value]) => setFormData({ ...formData, rolloutPercentage: value })}
                max={100}
                step={1}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, flag: null })}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editDialog.flag ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

## Pre-defined Feature Flags

```typescript
// lib/feature-flags/presets.ts

export const PRESET_FLAGS = {
  // UI features
  DARK_MODE: 'dark-mode',
  NEW_DASHBOARD: 'new-dashboard',
  SIDEBAR_COLLAPSE: 'sidebar-collapse',

  // Inventory features
  QR_SCANNER: 'qr-scanner',
  BULK_EDIT: 'bulk-edit',
  ADVANCED_SEARCH: 'advanced-search',

  // Request features
  MULTI_LEVEL_APPROVAL: 'multi-level-approval',
  AUTO_NOTIFY: 'auto-notify',

  // Experimental features
  AI_SUGGESTIONS: 'ai-suggestions',
  REALTIME_UPDATES: 'realtime-updates',

  // Admin features
  ADVANCED_REPORTS: 'advanced-reports',
  AUDIT_LOG_EXPORT: 'audit-log-export'
}

// Feature flag definitions for initialization
export const FLAG_DEFINITIONS = [
  {
    key: PRESET_FLAGS.DARK_MODE,
    name: 'Dark Mode',
    description: 'Enable dark mode theme option',
    enabled: true,
    rolloutPercentage: 100
  },
  {
    key: PRESET_FLAGS.NEW_DASHBOARD,
    name: 'New Dashboard',
    description: 'Enable redesigned dashboard layout',
    enabled: false,
    rolloutPercentage: 0,
    targetRoles: ['admin', 'superadmin']
  },
  {
    key: PRESET_FLAGS.QR_SCANNER,
    name: 'QR Scanner',
    description: 'Enable QR code scanning for inventory',
    enabled: true,
    rolloutPercentage: 100
  },
  {
    key: PRESET_FLAGS.BULK_EDIT,
    name: 'Bulk Edit',
    description: 'Enable bulk editing of inventory items',
    enabled: true,
    rolloutPercentage: 100,
    targetRoles: ['admin', 'superadmin', 'approver']
  },
  {
    key: PRESET_FLAGS.AI_SUGGESTIONS,
    name: 'AI Suggestions',
    description: 'Enable AI-powered search suggestions',
    enabled: false,
    rolloutPercentage: 50,
    variants: [
      { name: 'control', percentage: 50 },
      { name: 'treatment', percentage: 50, config: { model: 'gpt-4' } }
    ]
  },
  {
    key: PRESET_FLAGS.REALTIME_UPDATES,
    name: 'Realtime Updates',
    description: 'Enable WebSocket real-time updates',
    enabled: true,
    rolloutPercentage: 100
  }
]
```

---

## Usage Examples

```tsx
// Example 1: Feature gate component
import { FeatureGate } from '@/hooks/use-feature-flag'

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <FeatureGate flag="new-dashboard" fallback={<OldDashboard />}>
        <NewDashboard />
      </FeatureGate>

      <FeatureGate flag="ai-suggestions">
        <AISuggestions />
      </FeatureGate>
    </div>
  )
}

// Example 2: Hook usage
import { useFeatureFlag } from '@/hooks/use-feature-flag'

function InventoryPage() {
  const { enabled: hasQRScanner, loading } = useFeatureFlag('qr-scanner')

  if (loading) return <Loading />

  return (
    <div>
      <h1>Inventory</h1>
      {hasQRScanner && <QRScannerButton />}
    </div>
  )
}

// Example 3: A/B testing with variants
import { FeatureVariant } from '@/hooks/use-feature-flag'

function SearchBar() {
  return (
    <FeatureVariant
      flag="ai-suggestions"
      variants={{
        control: <BasicSearch />,
        treatment: <AISearch />
      }}
      defaultVariant={<BasicSearch />}
    />
  )
}

// Example 4: Multiple flags
import { useFeatureFlags } from '@/hooks/use-feature-flag'

function Toolbar() {
  const { flags, loading } = useFeatureFlags([
    'bulk-edit',
    'export-data',
    'print-reports'
  ])

  if (loading) return null

  return (
    <div className="flex gap-2">
      {flags['bulk-edit'] && <Button>Bulk Edit</Button>}
      {flags['export-data'] && <Button>Export</Button>}
      {flags['print-reports'] && <Button>Print</Button>}
    </div>
  )
}

// Example 5: Server-side check
import { isFeatureEnabled } from '@/lib/feature-flags/service'

export async function getServerSideProps(context) {
  const session = await getSession(context)

  const showNewDashboard = await isFeatureEnabled('new-dashboard', {
    id: parseInt(session.user.id),
    role: session.user.role
  })

  return {
    props: { showNewDashboard }
  }
}

// Example 6: API route check
import { isFeatureEnabled } from '@/lib/feature-flags/service'

export async function POST(request: Request) {
  const session = await auth()

  if (!await isFeatureEnabled('advanced-reports', {
    id: parseInt(session.user.id),
    role: session.user.role
  })) {
    return Response.json({ error: 'Feature not available' }, { status: 403 })
  }

  // Generate advanced report
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
