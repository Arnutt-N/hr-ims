---
name: validation-helper
description: Input validation and sanitization utilities for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["validation", "sanitize", "input validation", "validate", "zod"]
  file_patterns: ["*validation*", "lib/validation*", "lib/validate*"]
  context: Input validation, data sanitization, form validation
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Validation Helper

## Core Role

Handle input validation and sanitization for HR-IMS:
- Zod schema validation
- Custom validators
- Input sanitization
- Error formatting

---

## Common Validation Schemas

```typescript
// lib/validation/common.ts
import { z } from 'zod'

// Thai name validation (allows Thai and English characters)
export const nameSchema = z
  .string()
  .min(2, 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร')
  .max(100, 'ชื่อต้องไม่เกิน 100 ตัวอักษร')
  .regex(
    /^[a-zA-Zก-๙\s\-\.]+$/,
    'ชื่อต้องประกอบด้วยตัวอักษรไทย อังกฤษ หรือช่องว่างเท่านั้น'
  )

// Email validation
export const emailSchema = z
  .string()
  .email('รูปแบบอีเมลไม่ถูกต้อง')
  .max(255, 'อีเมลต้องไม่เกิน 255 ตัวอักษร')
  .transform(email => email.toLowerCase().trim())

// Thai phone validation
export const phoneSchema = z
  .string()
  .regex(
    /^(\+66|0)[0-9]{8,9}$/,
    'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (เช่น 0812345678 หรือ +66812345678)'
  )
  .optional()
  .or(z.literal(''))

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  .max(100, 'รหัสผ่านต้องไม่เกิน 100 ตัวอักษร')
  .regex(/[A-Z]/, 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว')
  .regex(/[a-z]/, 'รหัสผ่านต้องมีตัวพิมพ์เล็กอย่างน้อย 1 ตัว')
  .regex(/[0-9]/, 'รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว')

// Simple password (for temporary passwords)
export const simplePasswordSchema = z
  .string()
  .min(6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')

// Thai ID card validation
export const thaiIdSchema = z
  .string()
  .regex(/^[0-9]{13}$/, 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก')
  .refine(validateThaiIdChecksum, 'เลขบัตรประชาชนไม่ถูกต้อง')

function validateThaiIdChecksum(id: string): boolean {
  if (id.length !== 13) return false

  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i]) * (13 - i)
  }

  const checksum = (11 - (sum % 11)) % 10
  return checksum === parseInt(id[12])
}

// Positive integer
export const positiveIntSchema = z
  .number()
  .int('ต้องเป็นจำนวนเต็ม')
  .positive('ต้องเป็นจำนวนบวก')

// Non-negative integer
export const nonNegativeIntSchema = z
  .number()
  .int('ต้องเป็นจำนวนเต็ม')
  .min(0, 'ต้องไม่ติดลบ')

// Positive decimal
export const positiveDecimalSchema = z
  .number()
  .positive('ต้องเป็นจำนวนบวก')

// Quantity validation
export const quantitySchema = z
  .number()
  .int('จำนวนต้องเป็นจำนวนเต็ม')
  .min(0, 'จำนวนต้องไม่ติดลบ')
  .max(999999, 'จำนวนต้องไม่เกิน 999,999')

// Price validation
export const priceSchema = z
  .number()
  .min(0, 'ราคาต้องไม่ติดลบ')
  .max(999999999, 'ราคาต้องไม่เกิน 999,999,999')
  .refine(
    val => /^\d+(\.\d{1,2})?$/.test(val.toString()),
    'ราคาต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง'
  )

// Serial number validation
export const serialNumberSchema = z
  .string()
  .max(100, 'Serial number ต้องไม่เกิน 100 ตัวอักษร')
  .regex(
    /^[A-Za-z0-9\-_]+$/,
    'Serial number ต้องประกอบด้วยตัวอักษร ตัวเลข, - หรือ _ เท่านั้น'
  )
  .optional()
  .or(z.literal(''))

// Date validation
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)')
  .refine(val => !isNaN(Date.parse(val)), 'วันที่ไม่ถูกต้อง')

// Future date validation
export const futureDateSchema = dateSchema.refine(
  val => new Date(val) > new Date(),
  'วันที่ต้องเป็นวันในอนาคต'
)

// Past date validation
export const pastDateSchema = dateSchema.refine(
  val => new Date(val) <= new Date(),
  'วันที่ต้องเป็นวันในอดีตหรือวันนี้'
)

// URL validation
export const urlSchema = z
  .string()
  .url('รูปแบบ URL ไม่ถูกต้อง')
  .max(2048, 'URL ต้องไม่เกิน 2048 ตัวอักษร')
  .optional()
  .or(z.literal(''))

// Optional string with max length
export const optionalStringSchema = (maxLength: number) =>
  z
    .string()
    .max(maxLength, `ต้องไม่เกิน ${maxLength} ตัวอักษร`)
    .optional()
    .or(z.literal(''))

// Required string with min and max
export const requiredStringSchema = (min: number, max: number) =>
  z
    .string()
    .min(min, `ต้องมีอย่างน้อย ${min} ตัวอักษร`)
    .max(max, `ต้องไม่เกิน ${max} ตัวอักษร`)
```

---

## Entity Schemas

```typescript
// lib/validation/entities.ts
import { z } from 'zod'
import {
  nameSchema,
  emailSchema,
  phoneSchema,
  passwordSchema,
  quantitySchema,
  priceSchema,
  serialNumberSchema,
  optionalStringSchema
} from './common'

// User schema
export const userCreateSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  password: passwordSchema,
  phone: phoneSchema,
  department: optionalStringSchema(100),
  position: optionalStringSchema(100),
  roleIds: z.array(z.number().int().positive()).min(1, 'ต้องเลือกอย่างน้อย 1 บทบาท')
})

export const userUpdateSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema,
  department: optionalStringSchema(100),
  position: optionalStringSchema(100),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional()
})

// Inventory item schema
export const itemCreateSchema = z.object({
  code: z.string().max(50).optional(),
  name: z.string().min(1, 'ต้องระบุชื่อสินค้า').max(200),
  description: optionalStringSchema(1000),
  categoryId: z.number().int().positive().optional(),
  unit: z.string().min(1, 'ต้องระบุหน่วย').max(20),
  minStock: z.number().int().min(0).default(0),
  maxStock: z.number().int().min(0).optional(),
  price: priceSchema.optional(),
  serialNumber: serialNumberSchema,
  location: optionalStringSchema(100),
  warehouseId: z.number().int().positive(),
  initialQuantity: quantitySchema.default(0)
})

export const itemUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: optionalStringSchema(1000),
  categoryId: z.number().int().positive().optional(),
  unit: z.string().min(1).max(20).optional(),
  minStock: z.number().int().min(0).optional(),
  maxStock: z.number().int().min(0).optional(),
  price: priceSchema.optional(),
  serialNumber: serialNumberSchema,
  location: optionalStringSchema(100),
  status: z.enum(['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED']).optional()
})

// Request schema
export const requestCreateSchema = z.object({
  type: z.enum(['BORROW', 'WITHDRAW', 'RETURN']),
  notes: optionalStringSchema(500),
  items: z.array(
    z.object({
      itemId: z.number().int().positive(),
      quantity: z.number().int().min(1, 'จำนวนต้องมากกว่า 0'),
      notes: optionalStringSchema(200)
    })
  ).min(1, 'ต้องมีอย่างน้อย 1 รายการ')
})

export const requestApprovalSchema = z.object({
  notes: optionalStringSchema(500)
})

export const requestRejectionSchema = z.object({
  reason: z.string().min(1, 'ต้องระบุเหตุผล').max(500)
})

// Warehouse schema
export const warehouseCreateSchema = z.object({
  name: z.string().min(1, 'ต้องระบุชื่อคลัง').max(100),
  code: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/, 'รหัสต้องเป็นตัวพิมพ์ใหญ่และตัวเลขเท่านั้น'),
  description: optionalStringSchema(500),
  location: optionalStringSchema(200),
  managerId: z.number().int().positive().optional()
})

// Category schema
export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'ต้องระบุชื่อหมวดหมู่').max(100),
  description: optionalStringSchema(500),
  parentId: z.number().int().positive().optional()
})

// Transfer schema
export const stockTransferSchema = z.object({
  itemId: z.number().int().positive(),
  fromWarehouseId: z.number().int().positive(),
  toWarehouseId: z.number().int().positive(),
  quantity: z.number().int().min(1, 'จำนวนต้องมากกว่า 0'),
  notes: optionalStringSchema(500)
}).refine(
  data => data.fromWarehouseId !== data.toWarehouseId,
  'คลังต้นทางและปลายทางต้องไม่ใช่คลังเดียวกัน'
)

// Type exports
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type ItemCreateInput = z.infer<typeof itemCreateSchema>
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>
export type RequestCreateInput = z.infer<typeof requestCreateSchema>
export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>
export type StockTransferInput = z.infer<typeof stockTransferSchema>
```

---

## Sanitization Utilities

```typescript
// lib/validation/sanitize.ts

// Remove HTML tags
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

// Trim and normalize whitespace
export function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, ' ')
}

// Remove special characters, keep only alphanumeric
export function alphanumericOnly(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '')
}

// Sanitize for use in URLs
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Sanitize Thai phone number
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '')
}

// Sanitize for SQL LIKE query
export function sanitizeLikeQuery(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&')
}

// Escape HTML entities
export function escapeHtml(input: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return input.replace(/[&<>"']/g, char => htmlEntities[char] || char)
}

// Remove null bytes
export function removeNullBytes(input: string): string {
  return input.replace(/\0/g, '')
}

// Comprehensive text sanitization
export function sanitizeText(input: string): string {
  return removeNullBytes(normalizeWhitespace(stripHtml(input)))
}

// Sanitize object recursively
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeText(value)
    } else if (typeof value === 'object' && value !== null) {
      result[key] = Array.isArray(value)
        ? value.map(item =>
            typeof item === 'string' ? sanitizeText(item) : item
          )
        : sanitizeObject(value)
    } else {
      result[key] = value
    }
  }

  return result as T
}
```

---

## Validation Utilities

```typescript
// lib/validation/utils.ts
import { z } from 'zod'

// Safe parse with default value
export function safeParse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaultValue: T
): T {
  const result = schema.safeParse(data)
  return result.success ? result.data : defaultValue
}

// Validate and throw
export function validateOrThrow<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  return schema.parse(data)
}

// Validate and return result
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | { success: true; data: T; errors: null }
  | { success: false; data: null; errors: z.ZodError } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data, errors: null }
  }

  return { success: false, data: null, errors: result.error }
}

// Format Zod errors for display
export function formatZodErrors(
  error: z.ZodError
): Array<{ field: string; message: string }> {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }))
}

// Format errors for form fields
export function formatFormErrors(
  error: z.ZodError
): Record<string, string> {
  const errors: Record<string, string> = {}

  error.errors.forEach(err => {
    const field = err.path.join('.')
    if (!errors[field]) {
      errors[field] = err.message
    }
  })

  return errors
}

// Validate partial object
export function validatePartial<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: Partial<z.infer<z.ZodObject<T>>>
) {
  return schema.partial().safeParse(data)
}

// Create async validator for server-side checks
export function createAsyncValidator<T>(
  schema: z.ZodSchema<T>,
  asyncCheck: (data: T) => Promise<boolean | string>
) {
  return z.object({
    data: schema
  }).refine(
    async (val) => {
      const result = await asyncCheck(val.data)
      return result === true
    },
    {
      message: async (val) => {
        const result = await asyncCheck(val.data)
        return typeof result === 'string' ? result : 'Validation failed'
      }
    }
  )
}

// Check unique constraint
export function createUniqueValidator<T>(
  checkFn: (value: T) => Promise<boolean>,
  message: string = 'ค่านี้มีอยู่แล้วในระบบ'
) {
  return z.any().refine(
    async (value) => {
      const exists = await checkFn(value)
      return !exists
    },
    { message }
  )
}
```

---

## Form Validation Hook

```typescript
// hooks/use-form-validation.ts
'use client'

import { useState, useCallback, useMemo } from 'react'
import { z } from 'zod'
import { formatFormErrors } from '@/lib/validation/utils'

interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>
  initialValues: T
  onSubmit: (values: T) => Promise<void> | void
}

export function useFormValidation<T extends Record<string, any>>({
  schema,
  initialValues,
  onSubmit
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isValid = useMemo(() => {
    const result = schema.safeParse(values)
    return result.success
  }, [schema, values])

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [field]: true }))

    // Clear error on change
    setErrors(prev => {
      const next = { ...prev }
      delete next[field as string]
      return next
    })
  }, [])

  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }))
  }, [])

  const validate = useCallback((): boolean => {
    const result = schema.safeParse(values)

    if (result.success) {
      setErrors({})
      return true
    }

    setErrors(formatFormErrors(result.error))
    return false
  }, [schema, values])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit(values)
    } finally {
      setIsSubmitting(false)
    }
  }, [validate, onSubmit, values])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      return touched[field as string] ? errors[field as string] : undefined
    },
    [errors, touched]
  )

  const getFieldProps = useCallback(
    <K extends keyof T>(field: K) => ({
      value: values[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setValue(field, e.target.value as T[K])
      },
      onBlur: () => {
        setTouched(prev => ({ ...prev, [field]: true }))
      },
      error: getFieldError(field)
    }),
    [values, setValue, getFieldError]
  )

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setValue,
    setMultipleValues,
    validate,
    handleSubmit,
    reset,
    getFieldError,
    getFieldProps
  }
}
```

---

## Server Action Validation Wrapper

```typescript
// lib/validation/action-wrapper.ts
import { z } from 'zod'
import { formatZodErrors } from './utils'
import { sanitizeObject } from './sanitize'

interface ValidatedActionOptions<T> {
  schema: z.ZodSchema<T>
  action: (data: T) => Promise<{ success?: boolean; error?: string; data?: any }>
  sanitize?: boolean
}

export function validatedAction<T>({
  schema,
  action,
  sanitize = true
}: ValidatedActionOptions<T>) {
  return async (rawData: unknown) => {
    // Sanitize input if enabled
    const data = sanitize && typeof rawData === 'object' && rawData !== null
      ? sanitizeObject(rawData as Record<string, any>)
      : rawData

    // Validate
    const result = schema.safeParse(data)

    if (!result.success) {
      const errors = formatZodErrors(result.error)
      return {
        error: errors[0]?.message || 'Validation failed',
        errors
      }
    }

    // Execute action
    return action(result.data)
  }
}

// Usage example
export const createUserAction = validatedAction({
  schema: userCreateSchema,
  action: async (data) => {
    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existing) {
      return { error: 'อีเมลนี้มีอยู่แล้วในระบบ' }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: await hash(data.password, 10),
        phone: data.phone,
        department: data.department,
        position: data.position
      }
    })

    // Assign roles
    await prisma.userRole.createMany({
      data: data.roleIds.map(roleId => ({
        userId: user.id,
        roleId
      }))
    })

    return { success: true, data: user }
  }
})
```

---

## Usage Examples

```typescript
// Example 1: Validate form data
import { userCreateSchema } from '@/lib/validation/entities'

async function handleCreateUser(formData: FormData) {
  const data = {
    email: formData.get('email'),
    name: formData.get('name'),
    password: formData.get('password'),
    phone: formData.get('phone'),
    department: formData.get('department'),
    position: formData.get('position'),
    roleIds: JSON.parse(formData.get('roleIds') as string)
  }

  const result = userCreateSchema.safeParse(data)

  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  // Use result.data
}

// Example 2: Use form validation hook
function CreateUserForm() {
  const {
    values,
    errors,
    isValid,
    isSubmitting,
    handleSubmit,
    getFieldProps
  } = useFormValidation({
    schema: userCreateSchema,
    initialValues: {
      email: '',
      name: '',
      password: '',
      phone: '',
      department: '',
      position: '',
      roleIds: []
    },
    onSubmit: async (data) => {
      await createUser(data)
    }
  })

  return (
    <form onSubmit={handleSubmit}>
      <Input {...getFieldProps('email')} error={errors.email} />
      <Input {...getFieldProps('name')} error={errors.name} />
      <Button type="submit" disabled={!isValid || isSubmitting}>
        Create User
      </Button>
    </form>
  )
}

// Example 3: Sanitize user input
const cleanInput = sanitizeText(userInput)
const safeQuery = sanitizeLikeQuery(searchQuery)
```

---

*Version: 1.0.0 | For HR-IMS Project*
