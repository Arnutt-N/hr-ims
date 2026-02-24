---
name: settings-manager
description: System configuration and application settings management
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["settings", "config", "configuration", "preferences", "system settings"]
  file_patterns: ["*settings*", "app/(dashboard)/settings/**"]
  context: configuration, system management, preferences
mcp_servers:
  - sequential
personas:
  - backend
  - admin
---

# Settings Manager

## Core Role

Manage system configuration for HR-IMS:
- Application settings storage
- User preferences
- System-wide configuration
- Feature toggles

---

## Data Model

```prisma
model SystemSetting {
  id        Int      @id @default(autoincrement())
  key       String   @unique @db.VarChar(100)
  value     String   @db.Text
  category  String   @db.VarChar(50)
  dataType  String   @db.VarChar(20)  // string, number, boolean, json
  isPublic  Boolean  @default(false)
  description String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([category])
  @@map("system_settings")
}

model UserPreference {
  id        Int      @id @default(autoincrement())
  userId    Int
  key       String   @db.VarChar(100)
  value     String   @db.Text

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, key])
  @@map("user_preferences")
}
```

---

## System Settings

```yaml
categories:
  general:
    - key: app_name
      value: "HR-IMS"
      type: string
      public: true
    - key: app_version
      value: "1.0.0"
      type: string
      public: true
    - key: default_language
      value: "th"
      type: string
      public: true
    - key: date_format
      value: "dd/MM/yyyy"
      type: string
      public: true
    - key: timezone
      value: "Asia/Bangkok"
      type: string
      public: true

  inventory:
    - key: low_stock_threshold
      value: "10"
      type: number
      public: false
    - key: auto_generate_serial
      value: "true"
      type: boolean
      public: false
    - key: serial_prefix
      value: "ITEM"
      type: string
      public: false

  requests:
    - key: max_request_items
      value: "50"
      type: number
      public: false
    - key: auto_approve_threshold
      value: "5"
      type: number
      public: false
    - key: request_expiry_days
      value: "30"
      type: number
      public: false

  notifications:
    - key: email_notifications_enabled
      value: "true"
      type: boolean
      public: false
    - key: low_stock_alerts
      value: "true"
      type: boolean
      public: false
    - key: daily_summary_enabled
      value: "true"
      type: boolean
      public: false
    - key: daily_summary_time
      value: "09:00"
      type: string
      public: false

  security:
    - key: session_timeout_minutes
      value: "60"
      type: number
      public: false
    - key: max_login_attempts
      value: "5"
      type: number
      public: false
    - key: password_min_length
      value: "8"
      type: number
      public: true
    - key: require_special_chars
      value: "true"
      type: boolean
      public: true

  maintenance:
    - key: audit_log_retention_days
      value: "90"
      type: number
      public: false
    - key: backup_enabled
      value: "true"
      type: boolean
      public: false
    - key: backup_frequency
      value: "daily"
      type: string
      public: false
```

---

## Server Actions

### Settings Management

```typescript
// lib/actions/settings.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string()
})

export async function getSetting(key: string) {
  const setting = await prisma.systemSetting.findUnique({
    where: { key }
  })

  if (!setting) return null

  return parseValue(setting.value, setting.dataType)
}

export async function getSettingsByCategory(category: string) {
  const settings = await prisma.systemSetting.findMany({
    where: { category }
  })

  return settings.reduce((acc, setting) => {
    acc[setting.key] = {
      value: parseValue(setting.value, setting.dataType),
      description: setting.description,
      isPublic: setting.isPublic
    }
    return acc
  }, {} as Record<string, any>)
}

export async function getAllPublicSettings() {
  const settings = await prisma.systemSetting.findMany({
    where: { isPublic: true }
  })

  return settings.reduce((acc, setting) => {
    acc[setting.key] = parseValue(setting.value, setting.dataType)
    return acc
  }, {} as Record<string, any>)
}

export async function updateSetting(input: z.infer<typeof updateSettingSchema>) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  const validated = updateSettingSchema.safeParse(input)
  if (!validated.success) {
    return { error: 'Invalid input', code: 'VALIDATION_ERROR' }
  }

  try {
    const existing = await prisma.systemSetting.findUnique({
      where: { key: validated.data.key }
    })

    if (!existing) {
      return { error: 'Setting not found', code: 'NOT_FOUND' }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const setting = await tx.systemSetting.update({
        where: { key: validated.data.key },
        data: { value: validated.data.value }
      })

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          tableName: 'SystemSetting',
          recordId: setting.key,
          userId: parseInt(session.user.id),
          oldData: { value: existing.value },
          newData: { value: setting.value }
        }
      })

      return setting
    })

    revalidatePath('/settings')
    return { success: true, data: updated }

  } catch (error) {
    console.error('Update setting error:', error)
    return { error: 'Failed to update setting', code: 'INTERNAL_ERROR' }
  }
}

export async function updateMultipleSettings(
  settings: Array<{ key: string; value: string }>
) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const hasPermission = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  try {
    await prisma.$transaction(
      settings.map(setting =>
        prisma.systemSetting.update({
          where: { key: setting.key },
          data: { value: setting.value }
        })
      )
    )

    revalidatePath('/settings')
    return { success: true }

  } catch (error) {
    return { error: 'Failed to update settings', code: 'INTERNAL_ERROR' }
  }
}

function parseValue(value: string, dataType: string): any {
  switch (dataType) {
    case 'number':
      return Number(value)
    case 'boolean':
      return value === 'true'
    case 'json':
      return JSON.parse(value)
    default:
      return value
  }
}
```

### User Preferences

```typescript
export async function getUserPreference(key: string) {
  const session = await auth()
  if (!session?.user?.id) return null

  const pref = await prisma.userPreference.findUnique({
    where: {
      userId_key: {
        userId: parseInt(session.user.id),
        key
      }
    }
  })

  return pref?.value
}

export async function getUserPreferences() {
  const session = await auth()
  if (!session?.user?.id) return {}

  const prefs = await prisma.userPreference.findMany({
    where: { userId: parseInt(session.user.id) }
  })

  return prefs.reduce((acc, pref) => {
    acc[pref.key] = pref.value
    return acc
  }, {} as Record<string, string>)
}

export async function setUserPreference(key: string, value: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const pref = await prisma.userPreference.upsert({
      where: {
        userId_key: {
          userId: parseInt(session.user.id),
          key
        }
      },
      update: { value },
      create: {
        userId: parseInt(session.user.id),
        key,
        value
      }
    })

    return { success: true, data: pref }

  } catch (error) {
    return { error: 'Failed to save preference', code: 'INTERNAL_ERROR' }
  }
}
```

---

## Frontend Components

### Settings Page

```typescript
// app/(dashboard)/settings/page.tsx
import { getSettingsByCategory } from '@/lib/actions/settings'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
  const [general, inventory, requests, notifications, security] = await Promise.all([
    getSettingsByCategory('general'),
    getSettingsByCategory('inventory'),
    getSettingsByCategory('requests'),
    getSettingsByCategory('notifications'),
    getSettingsByCategory('security')
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage system configuration and preferences
        </p>
      </div>

      <div className="grid gap-6">
        <SettingsSection title="General" category="general" settings={general} />
        <SettingsSection title="Inventory" category="inventory" settings={inventory} />
        <SettingsSection title="Requests" category="requests" settings={requests} />
        <SettingsSection title="Notifications" category="notifications" settings={notifications} />
        <SettingsSection title="Security" category="security" settings={security} />
      </div>
    </div>
  )
}
```

### Settings Form

```typescript
// app/(dashboard)/settings/settings-form.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { updateMultipleSettings } from '@/lib/actions/settings'

interface Setting {
  value: any
  description?: string
  isPublic: boolean
}

interface SettingsSectionProps {
  title: string
  category: string
  settings: Record<string, Setting>
}

export function SettingsSection({ title, category, settings }: SettingsSectionProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    Object.entries(settings).forEach(([key, setting]) => {
      initial[key] = String(setting.value)
    })
    return initial
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateMultipleSettings(
        Object.entries(values).map(([key, value]) => ({ key, value }))
      )
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Configure {title.toLowerCase()} settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(settings).map(([key, setting]) => (
          <div key={key} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={key} className="text-sm font-medium">
                {formatLabel(key)}
              </Label>
              {setting.description && (
                <p className="text-xs text-muted-foreground">
                  {setting.description}
                </p>
              )}
            </div>

            {typeof setting.value === 'boolean' ? (
              <Switch
                id={key}
                checked={values[key] === 'true'}
                onCheckedChange={(checked) => handleChange(key, String(checked))}
              />
            ) : (
              <Input
                id={key}
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-48"
                type={typeof setting.value === 'number' ? 'number' : 'text'}
              />
            )}
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function formatLabel(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
```

### User Preferences Component

```typescript
// components/settings/user-preferences.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { setUserPreference, getUserPreferences } from '@/lib/actions/settings'

const LANGUAGES = [
  { value: 'th', label: 'ไทย' },
  { value: 'en', label: 'English' }
]

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
]

export function UserPreferences() {
  const [language, setLanguage] = useState('th')
  const [theme, setTheme] = useState('system')
  const [notifications, setNotifications] = useState(true)

  const handleLanguageChange = async (value: string) => {
    setLanguage(value)
    await setUserPreference('language', value)
  }

  const handleThemeChange = async (value: string) => {
    setTheme(value)
    await setUserPreference('theme', value)
  }

  const handleNotificationsChange = async (checked: boolean) => {
    setNotifications(checked)
    await setUserPreference('notifications', String(checked))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Language</Label>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Theme</Label>
          <Select value={theme} onValueChange={handleThemeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THEMES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Notifications</Label>
            <p className="text-xs text-muted-foreground">
              Receive in-app notifications
            </p>
          </div>
          <Switch
            checked={notifications}
            onCheckedChange={handleNotificationsChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Feature Flags

```typescript
// lib/feature-flags.ts
import { getSetting } from '@/lib/actions/settings'

export const features = {
  async isMultiWarehouseEnabled(): Promise<boolean> {
    return (await getSetting('feature_multi_warehouse')) === 'true'
  },

  async isQRScanningEnabled(): Promise<boolean> {
    return (await getSetting('feature_qr_scanning')) === 'true'
  },

  async isEmailNotificationsEnabled(): Promise<boolean> {
    return (await getSetting('email_notifications_enabled')) === 'true'
  },

  async isMaintenanceModuleEnabled(): Promise<boolean> {
    return (await getSetting('feature_maintenance')) === 'true'
  },

  async isReportingEnabled(): Promise<boolean> {
    return (await getSetting('feature_reporting')) === 'true'
  }
}

// Usage in Server Actions
export async function someAction() {
  if (!await features.isMultiWarehouseEnabled()) {
    return { error: 'Feature not enabled' }
  }
  // Continue with action
}
```

---

## Seed Data

```typescript
// prisma/seed-settings.ts
import prisma from './client'

const defaultSettings = [
  // General
  { key: 'app_name', value: 'HR-IMS', category: 'general', dataType: 'string', isPublic: true },
  { key: 'app_version', value: '1.0.0', category: 'general', dataType: 'string', isPublic: true },
  { key: 'default_language', value: 'th', category: 'general', dataType: 'string', isPublic: true },
  { key: 'date_format', value: 'dd/MM/yyyy', category: 'general', dataType: 'string', isPublic: true },
  { key: 'timezone', value: 'Asia/Bangkok', category: 'general', dataType: 'string', isPublic: true },

  // Inventory
  { key: 'low_stock_threshold', value: '10', category: 'inventory', dataType: 'number', isPublic: false },
  { key: 'auto_generate_serial', value: 'true', category: 'inventory', dataType: 'boolean', isPublic: false },
  { key: 'serial_prefix', value: 'ITEM', category: 'inventory', dataType: 'string', isPublic: false },

  // Requests
  { key: 'max_request_items', value: '50', category: 'requests', dataType: 'number', isPublic: false },
  { key: 'auto_approve_threshold', value: '5', category: 'requests', dataType: 'number', isPublic: false },
  { key: 'request_expiry_days', value: '30', category: 'requests', dataType: 'number', isPublic: false },

  // Notifications
  { key: 'email_notifications_enabled', value: 'true', category: 'notifications', dataType: 'boolean', isPublic: false },
  { key: 'low_stock_alerts', value: 'true', category: 'notifications', dataType: 'boolean', isPublic: false },
  { key: 'daily_summary_enabled', value: 'true', category: 'notifications', dataType: 'boolean', isPublic: false },
  { key: 'daily_summary_time', value: '09:00', category: 'notifications', dataType: 'string', isPublic: false },

  // Security
  { key: 'session_timeout_minutes', value: '60', category: 'security', dataType: 'number', isPublic: false },
  { key: 'max_login_attempts', value: '5', category: 'security', dataType: 'number', isPublic: false },
  { key: 'password_min_length', value: '8', category: 'security', dataType: 'number', isPublic: true },
  { key: 'require_special_chars', value: 'true', category: 'security', dataType: 'boolean', isPublic: true },

  // Maintenance
  { key: 'audit_log_retention_days', value: '90', category: 'maintenance', dataType: 'number', isPublic: false },
  { key: 'backup_enabled', value: 'true', category: 'maintenance', dataType: 'boolean', isPublic: false },
  { key: 'backup_frequency', value: 'daily', category: 'maintenance', dataType: 'string', isPublic: false },
]

export async function seedSettings() {
  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: setting,
      create: setting
    })
  }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
