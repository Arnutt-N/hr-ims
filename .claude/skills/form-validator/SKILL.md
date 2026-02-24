---
name: form-validator
description: Form validation with Zod schemas for HR-IMS Server Actions and client forms
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["validation", "validate", "form", "zod", "schema", "input validation"]
  file_patterns: ["*validation*", "lib/validations/**", "schemas/**"]
  context: form handling, input validation, data integrity
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# Form Validator

## Core Role

Implement form validation for HR-IMS:
- Zod schema definitions
- Server-side validation in Server Actions
- Client-side form validation
- Error message handling (Thai/English)

---

## Zod Schema Patterns

### User Validation

```typescript
// lib/validations/user.ts
import { z } from 'zod'

export const userCreateSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must be less than 255 characters'),

  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(255, 'Name must be less than 255 characters')
    .regex(/^[\p{L}\s'-]+$/u, 'Name can only contain letters, spaces, hyphens and apostrophes'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  department: z
    .string()
    .max(100, 'Department must be less than 100 characters')
    .optional(),

  position: z
    .string()
    .max(100, 'Position must be less than 100 characters')
    .optional(),

  roles: z
    .array(z.string())
    .min(1, 'At least one role is required')
    .refine(
      (roles) => roles.every(role =>
        ['admin', 'superadmin', 'approver', 'auditor', 'technician', 'user'].includes(role)
      ),
      'Invalid role specified'
    )
})

export const userUpdateSchema = userCreateSchema.partial().extend({
  id: z.number().int().positive()
})

export const userPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
```

### Inventory Validation

```typescript
// lib/validations/inventory.ts
import { z } from 'zod'

export const inventoryItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(255, 'Name must be less than 255 characters'),

  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .nullable(),

  serialNumber: z
    .string()
    .max(100, 'Serial number must be less than 100 characters')
    .optional()
    .nullable(),

  categoryId: z
    .number()
    .int()
    .positive('Category is required')
    .optional()
    .nullable(),

  warehouseId: z
    .number()
    .int()
    .positive('Warehouse is required')
    .optional()
    .nullable(),

  quantity: z
    .number()
    .int()
    .min(0, 'Quantity cannot be negative')
    .default(0),

  unit: z
    .string()
    .max(20, 'Unit must be less than 20 characters')
    .default('pcs'),

  minQuantity: z
    .number()
    .int()
    .min(0, 'Minimum quantity cannot be negative')
    .default(0),

  price: z
    .number()
    .min(0, 'Price cannot be negative')
    .optional()
    .nullable(),

  status: z
    .enum(['ACTIVE', 'INACTIVE', 'DISPOSED'])
    .default('ACTIVE'),

  imageUrl: z
    .string()
    .url('Invalid image URL')
    .optional()
    .nullable()
})

export const inventoryUpdateSchema = inventoryItemSchema.partial().extend({
  id: z.number().int().positive()
})

export const stockAdjustmentSchema = z.object({
  itemId: z.number().int().positive('Item is required'),
  warehouseId: z.number().int().positive('Warehouse is required'),
  adjustment: z.number().int('Adjustment must be a whole number'),
  reason: z.string().min(1, 'Reason is required').max(500)
})

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
```

### Request Validation

```typescript
// lib/validations/request.ts
import { z } from 'zod'

export const requestItemSchema = z.object({
  itemId: z.number().int().positive('Item is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  notes: z.string().max(500).optional()
})

export const requestCreateSchema = z.object({
  type: z.enum(['BORROW', 'WITHDRAW', 'RETURN'], {
    required_error: 'Request type is required',
    invalid_type_error: 'Invalid request type'
  }),

  reason: z
    .string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be less than 1000 characters'),

  items: z
    .array(requestItemSchema)
    .min(1, 'At least one item is required')
    .max(50, 'Maximum 50 items per request'),

  expectedReturnDate: z
    .date()
    .min(new Date(), 'Return date must be in the future')
    .optional()
    .nullable(),

  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
}).refine(
  (data) => {
    if (data.type === 'BORROW' && !data.expectedReturnDate) {
      return false
    }
    return true
  },
  {
    message: 'Expected return date is required for borrow requests',
    path: ['expectedReturnDate']
  }
)

export const requestApprovalSchema = z.object({
  requestId: z.number().int().positive(),
  action: z.enum(['APPROVE', 'REJECT']),
  notes: z.string().max(500).optional()
}).refine(
  (data) => {
    if (data.action === 'REJECT' && !data.notes) {
      return false
    }
    return true
  },
  {
    message: 'Notes are required when rejecting a request',
    path: ['notes']
  }
)

export type RequestCreateInput = z.infer<typeof requestCreateSchema>
export type RequestApprovalInput = z.infer<typeof requestApprovalSchema>
```

---

## Server Action Validation

```typescript
// Example: lib/actions/users.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { userCreateSchema, type UserCreateInput } from '@/lib/validations/user'

export async function createUser(input: UserCreateInput) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // Validate input
  const validated = userCreateSchema.safeParse(input)
  if (!validated.success) {
    return {
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: validated.error.flatten()
    }
  }

  const { email, name, password, department, position, roles } = validated.data

  try {
    // Check for existing email
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      return { error: 'Email already exists', code: 'DUPLICATE_EMAIL' }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user with roles
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          department,
          position
        }
      })

      // Assign roles
      if (roles && roles.length > 0) {
        const roleRecords = await tx.role.findMany({
          where: { slug: { in: roles } }
        })

        await tx.userRole.createMany({
          data: roleRecords.map(role => ({
            userId: newUser.id,
            roleId: role.id
          }))
        })
      }

      return newUser
    })

    revalidatePath('/users')
    return { success: true, data: user }

  } catch (error) {
    console.error('Create user error:', error)
    return { error: 'Failed to create user', code: 'INTERNAL_ERROR' }
  }
}
```

---

## Client-Side Form Validation

### React Hook Form Integration

```typescript
// components/users/user-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolver/zod'
import { userCreateSchema, type UserCreateInput } from '@/lib/validations/user'
import { createUser } from '@/lib/actions/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

export function UserForm() {
  const form = useForm<UserCreateInput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      department: '',
      position: ''
    }
  })

  const onSubmit = async (data: UserCreateInput) => {
    const result = await createUser(data)

    if (result.success) {
      // Success handling
      form.reset()
    } else if (result.code === 'VALIDATION_ERROR') {
      // Server validation errors
      Object.entries(result.details.fieldErrors).forEach(([field, errors]) => {
        form.setError(field as keyof UserCreateInput, {
          type: 'server',
          message: errors?.[0]
        })
      })
    } else {
      // Other errors
      form.setError('root', { message: result.error })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ชื่อ-นามสกุล / Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>รหัสผ่าน / Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'กำลังบันทึก...' : 'บันทึก / Save'}
        </Button>
      </form>
    </Form>
  )
}
```

---

## Bilingual Error Messages

```typescript
// lib/validations/messages.ts

export const messages = {
  en: {
    required: 'This field is required',
    email: 'Invalid email address',
    minLength: (min: number) => `Must be at least ${min} characters`,
    maxLength: (max: number) => `Must be less than ${max} characters`,
    password: {
      uppercase: 'Must contain an uppercase letter',
      lowercase: 'Must contain a lowercase letter',
      number: 'Must contain a number',
      special: 'Must contain a special character'
    }
  },
  th: {
    required: 'กรุณากรอกข้อมูล',
    email: 'รูปแบบอีเมลไม่ถูกต้อง',
    minLength: (min: number) => `ต้องมีอย่างน้อย ${min} ตัวอักษร`,
    maxLength: (max: number) => `ต้องไม่เกิน ${max} ตัวอักษร`,
    password: {
      uppercase: 'ต้องมีตัวพิมพ์ใหญ่',
      lowercase: 'ต้องมีตัวพิมพ์เล็ก',
      number: 'ต้องมีตัวเลข',
      special: 'ต้องมีอักขระพิเศษ'
    }
  }
}

// Usage in schema
const passwordSchema = z.string()
  .min(8, { message: messages.th.minLength(8) })
  .regex(/[A-Z]/, { message: messages.th.password.uppercase })
```

---

## Validation Utility Functions

```typescript
// lib/validations/utils.ts

import { ZodError } from 'zod'

export function formatZodErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {}

  error.errors.forEach((err) => {
    const path = err.path.join('.')
    if (!errors[path]) {
      errors[path] = err.message
    }
  })

  return errors
}

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    throw new ValidationError(formatZodErrors(result.error))
  }

  return result.data
}

export class ValidationError extends Error {
  constructor(public errors: Record<string, string>) {
    super('Validation failed')
    this.name = 'ValidationError'
  }
}

// Phone number validation (Thai format)
export const thaiPhoneSchema = z.string()
  .regex(/^(\+66|0)[0-9]{8,9}$/, 'Invalid Thai phone number')

// Thai national ID validation
export const thaiIdSchema = z.string()
  .length(13, 'National ID must be 13 digits')
  .regex(/^[0-9]+$/, 'National ID must contain only digits')
  .refine(validateThaiIdChecksum, 'Invalid national ID')

function validateThaiIdChecksum(id: string): boolean {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i]) * (13 - i)
  }
  const checksum = (11 - (sum % 11)) % 10
  return checksum === parseInt(id[12])
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
