---
name: user-import
description: Bulk user import and export with CSV validation and role assignment
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["import", "export", "bulk", "csv", "excel", "users import", "batch"]
  file_patterns: ["*import*", "*export*", "app/(dashboard)/settings/users/**"]
  context: data migration, bulk operations, user management
mcp_servers:
  - sequential
personas:
  - backend
  - admin
---

# User Import

## Core Role

Handle bulk user operations for HR-IMS:
- CSV/Excel import with validation
- Bulk user creation with role assignment
- User data export
- Import error handling and reporting

---

## CSV Format

```csv
email,name,department,position,roles,status
user1@company.com,สมชาย ใจดี,IT,Developer,admin;user,ACTIVE
user2@company.com,Somchai Jaidee,HR,Manager,approver,ACTIVE
user3@company.com,สมหญิง รักงาน,Finance,Accountant,user,ACTIVE
```

### Field Specifications

| Field | Required | Format | Description |
|-------|----------|--------|-------------|
| email | Yes | email | Unique email address |
| name | Yes | string | Full name (Thai/English) |
| department | No | string | Department name |
| position | No | string | Job position |
| roles | No | string | Semi-colon separated role slugs |
| status | No | enum | ACTIVE, INACTIVE, PENDING (default: ACTIVE) |

---

## Server Actions

### CSV Import

```typescript
// lib/actions/user-import.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { parse } from 'csv-parse/sync'

const userImportSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(255),
  department: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  roles: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).default('ACTIVE')
})

interface ImportResult {
  success: boolean
  total: number
  created: number
  skipped: number
  errors: Array<{ row: number; email: string; error: string }>
}

export async function importUsersFromCSV(csvContent: string): Promise<ImportResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, total: 0, created: 0, skipped: 0, errors: [{ row: 0, email: '', error: 'Unauthorized' }] }
  }

  const hasPermission = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin'])
  if (!hasPermission) {
    return { success: false, total: 0, created: 0, skipped: 0, errors: [{ row: 0, email: '', error: 'Forbidden' }] }
  }

  try {
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    const result: ImportResult = {
      success: true,
      total: records.length,
      created: 0,
      skipped: 0,
      errors: []
    }

    // Get all available roles
    const allRoles = await prisma.role.findMany()
    const roleMap = new Map(allRoles.map(r => [r.slug, r.id]))

    // Default password for new users
    const defaultPassword = await bcrypt.hash('ChangeMe123!', 12)

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const rowNumber = i + 2 // +2 for header row

      try {
        // Validate record
        const validated = userImportSchema.parse(record)

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email: validated.email }
        })

        if (existingUser) {
          result.skipped++
          continue
        }

        // Create user with roles
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: validated.email,
              name: validated.name,
              password: defaultPassword,
              department: validated.department,
              position: validated.position,
              status: validated.status
            }
          })

          // Assign roles
          if (validated.roles) {
            const roleSlugs = validated.roles.split(';').map(r => r.trim())
            const validRoles = roleSlugs.filter(slug => roleMap.has(slug))

            if (validRoles.length > 0) {
              await tx.userRole.createMany({
                data: validRoles.map(slug => ({
                  userId: user.id,
                  roleId: roleMap.get(slug)!
                }))
              })
            }
          }

          // Audit log
          await tx.auditLog.create({
            data: {
              action: 'CREATE',
              tableName: 'User',
              recordId: user.id.toString(),
              userId: parseInt(session.user.id),
              newData: { email: user.email, name: user.name }
            }
          })
        })

        result.created++

      } catch (error: any) {
        result.errors.push({
          row: rowNumber,
          email: record.email || 'unknown',
          error: error.message || 'Validation failed'
        })
      }
    }

    revalidatePath('/users')
    return result

  } catch (error: any) {
    return {
      success: false,
      total: 0,
      created: 0,
      skipped: 0,
      errors: [{ row: 0, email: '', error: error.message || 'CSV parsing failed' }]
    }
  }
}
```

### User Export

```typescript
export async function exportUsersToCSV(options?: {
  status?: string
  department?: string
  includeInactive?: boolean
}): Promise<{ success: boolean; data?: string; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  const hasPermission = await hasAnyRole(parseInt(session.user.id), ['admin', 'superadmin', 'auditor'])
  if (!hasPermission) {
    return { success: false, error: 'Forbidden' }
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        ...(options?.status && { status: options.status as any }),
        ...(options?.department && { department: options.department }),
        ...(!options?.includeInactive && { status: 'ACTIVE' })
      },
      include: {
        userRoles: {
          include: { role: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Generate CSV
    const headers = ['email', 'name', 'department', 'position', 'roles', 'status', 'createdAt']
    const rows = users.map(user => [
      user.email,
      user.name,
      user.department || '',
      user.position || '',
      user.userRoles.map(ur => ur.role.slug).join(';'),
      user.status,
      user.createdAt.toISOString()
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    return { success: true, data: csv }

  } catch (error) {
    return { success: false, error: 'Export failed' }
  }
}
```

---

## Frontend Components

### Import Dialog

```typescript
// components/users/user-import-dialog.tsx
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { importUsersFromCSV } from '@/lib/actions/user-import'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserImportDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Please select a CSV file')
        return
      }
      setFile(selectedFile)
      setError(null)
      setResult(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const content = await file.text()
      const importResult = await importUsersFromCSV(content)
      setResult(importResult)

      if (importResult.success && importResult.created > 0) {
        // Refresh user list
        onOpenChange(false)
      }
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `email,name,department,position,roles,status
user@example.com,John Doe,IT,Developer,user;admin,ACTIVE
user2@example.com,Jane Smith,HR,Manager,approver,ACTIVE`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Users</DialogTitle>
          <DialogDescription>
            Upload a CSV file with user data. Users with existing emails will be skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Select CSV File
            </Button>
            {file && (
              <p className="mt-2 text-sm text-muted-foreground">
                Selected: {file.name}
              </p>
            )}
          </div>

          <Button
            variant="link"
            className="text-sm"
            onClick={downloadTemplate}
          >
            Download Template
          </Button>

          {result && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <p><strong>Total:</strong> {result.total}</p>
              <p><strong>Created:</strong> {result.created}</p>
              <p><strong>Skipped:</strong> {result.skipped}</p>
              {result.errors.length > 0 && (
                <div>
                  <p className="font-medium text-destructive">Errors:</p>
                  <ul className="text-sm text-muted-foreground">
                    {result.errors.slice(0, 5).map((err: any, i: number) => (
                      <li key={i}>Row {err.row}: {err.error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || loading}>
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Validation Rules

```typescript
// lib/validations/user-import.ts
import { z } from 'zod'

export const userImportRules = {
  email: {
    required: true,
    unique: true,
    format: 'email',
    maxLength: 255
  },
  name: {
    required: true,
    minLength: 2,
    maxLength: 255,
    pattern: /^[\p{L}\s'-]+$/u  // Allow Thai and English
  },
  department: {
    required: false,
    maxLength: 100
  },
  position: {
    required: false,
    maxLength: 100
  },
  roles: {
    required: false,
    format: 'semicolon-separated',
    validValues: ['admin', 'superadmin', 'approver', 'auditor', 'technician', 'user']
  },
  status: {
    required: false,
    defaultValue: 'ACTIVE',
    validValues: ['ACTIVE', 'INACTIVE', 'PENDING']
  }
}

export function validateUserRow(row: any, rowNum: number): string[] {
  const errors: string[] = []

  if (!row.email) {
    errors.push(`Row ${rowNum}: Email is required`)
  } else if (!z.string().email().safeParse(row.email).success) {
    errors.push(`Row ${rowNum}: Invalid email format`)
  }

  if (!row.name) {
    errors.push(`Row ${rowNum}: Name is required`)
  } else if (row.name.length < 2) {
    errors.push(`Row ${rowNum}: Name must be at least 2 characters`)
  }

  if (row.roles) {
    const roles = row.roles.split(';').map((r: string) => r.trim())
    const validRoles = ['admin', 'superadmin', 'approver', 'auditor', 'technician', 'user']
    const invalidRoles = roles.filter((r: string) => !validRoles.includes(r))
    if (invalidRoles.length > 0) {
      errors.push(`Row ${rowNum}: Invalid roles: ${invalidRoles.join(', ')}`)
    }
  }

  return errors
}
```

---

## Template Generator

```typescript
// lib/utils/import-template.ts
export function generateImportTemplate(): string {
  const headers = ['email', 'name', 'department', 'position', 'roles', 'status']
  const exampleRows = [
    ['user1@company.com', 'สมชาย ใจดี', 'IT', 'Developer', 'admin;user', 'ACTIVE'],
    ['user2@company.com', 'Somchai Jaidee', 'HR', 'Manager', 'approver', 'ACTIVE'],
    ['user3@company.com', 'สมหญิง รักงาน', 'Finance', 'Accountant', 'user', 'PENDING']
  ]

  const csvContent = [
    headers.join(','),
    ...exampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
