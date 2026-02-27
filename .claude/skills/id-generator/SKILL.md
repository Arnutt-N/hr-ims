---
name: id-generator
description: ID generation utilities for unique identifiers in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["id", "uuid", "unique id", "generate id", "nanoid", "cuid"]
  file_patterns: ["*id*", "lib/id*"]
  context: generating unique identifiers, serial numbers, reference codes
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# ID Generator

## Core Role

Generate unique identifiers for HR-IMS:
- UUID generation
- Nanoid for short IDs
- Custom reference codes
- Sequential numbers with prefixes

---

## Install Dependencies

```bash
npm install nanoid cuid2
```

---

## ID Generation Utilities

```typescript
// lib/id/index.ts
import { nanoid } from 'nanoid'
import { createId } from '@paralleldrive/cuid2'
import { randomBytes } from 'crypto'

// UUID v4
export function uuid(): string {
  return crypto.randomUUID()
}

// Nanoid - URL-safe, short IDs
export function shortId(length: number = 10): string {
  return nanoid(length)
}

// CUID2 - Collision-resistant, horizontal scaling
export function cuid(): string {
  return createId()
}

// Custom alphanumeric ID
export function alphanumericId(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  const randomValues = new Uint8Array(length)

  crypto.getRandomValues(randomValues)

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }

  return result
}

// Numeric ID with padding
export function paddedNumberId(number: number, length: number = 6): string {
  return number.toString().padStart(length, '0')
}
```

---

## HR-IMS Reference Code Generator

```typescript
// lib/id/reference-codes.ts

type ReferenceType =
  | 'INV'    // Inventory Item
  | 'REQ'    // Request
  | 'USR'    // User
  | 'WH'     // Warehouse
  | 'CAT'    // Category
  | 'TKT'    // Maintenance Ticket
  | 'LOG'    // Audit Log
  | 'NTF'    // Notification

// Format: PREFIX-YYYYMMDD-XXXXX
// Example: INV-20260225-00001
export function generateReferenceCode(
  type: ReferenceType,
  sequence: number,
  date: Date = new Date()
): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const dateStr = `${year}${month}${day}`
  const seqStr = sequence.toString().padStart(5, '0')

  return `${type}-${dateStr}-${seqStr}`
}

// Short reference: PREFIX-XXXXX
// Example: REQ-A3F8K
export function generateShortReference(type: ReferenceType): string {
  return `${type}-${alphanumericId(5)}`
}

// Thai government style: กท. XXXXXXX/XXXX
export function generateThaiReference(
  department: string,
  sequence: number,
  year?: number
): string {
  const thaiYear = (year || new Date().getFullYear()) + 543 // Buddhist era
  const seqStr = sequence.toString().padStart(4, '0')

  return `${department} ${alphanumericId(7)}/${thaiYear}`
}
```

---

## Database Sequence Manager

```typescript
// lib/id/sequence.ts
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Get next sequence number (transaction-safe)
export async function getNextSequence(
  type: string,
  date: Date = new Date()
): Promise<number> {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const result = await prisma.$transaction(async (tx) => {
    // Try to get existing sequence
    let sequence = await tx.sequence.findUnique({
      where: {
        type_year_month_day: {
          type,
          year,
          month,
          day
        }
      }
    })

    if (sequence) {
      // Increment existing
      sequence = await tx.sequence.update({
        where: { id: sequence.id },
        data: { value: { increment: 1 } }
      })
    } else {
      // Create new
      sequence = await tx.sequence.create({
        data: {
          type,
          year,
          month,
          day,
          value: 1
        }
      })
    }

    return sequence.value
  })

  return result
}

// Prisma schema for sequence
/*
model Sequence {
  id    Int @id @default(autoincrement())
  type  String
  year  Int
  month Int
  day   Int
  value Int

  @@unique([type, year, month, day])
  @@map("sequences")
}
*/
```

---

## Server Action Integration

```typescript
// lib/id/server-generator.ts
'use server'

import { getNextSequence } from './sequence'
import { generateReferenceCode, generateShortReference } from './reference-codes'

export async function generateInventoryCode(): Promise<string> {
  const sequence = await getNextSequence('INV')
  return generateReferenceCode('INV', sequence)
}

export async function generateRequestCode(): Promise<string> {
  const sequence = await getNextSequence('REQ')
  return generateReferenceCode('REQ', sequence)
}

export async function generateTicketCode(): Promise<string> {
  const sequence = await getNextSequence('TKT')
  return generateReferenceCode('TKT', sequence)
}

// For non-critical cases (no DB transaction needed)
export function generateQuickCode(type: string): string {
  return `${type}-${Date.now().toString(36).toUpperCase()}-${alphanumericId(4)}`
}
```

---

## QR Code Value Generator

```typescript
// lib/id/qr-code.ts

interface QRCodeData {
  type: 'item' | 'asset' | 'request' | 'user'
  id: string
  code: string
  timestamp: number
}

export function generateQRValue(
  type: QRCodeData['type'],
  id: string,
  code: string
): string {
  const data: QRCodeData = {
    type,
    id,
    code,
    timestamp: Date.now()
  }

  return JSON.stringify(data)
}

export function parseQRValue(value: string): QRCodeData | null {
  try {
    const data = JSON.parse(value) as QRCodeData

    if (!data.type || !data.id || !data.code) {
      return null
    }

    return data
  } catch {
    return null
  }
}

// URL-based QR (for public access)
export function generatePublicQRUrl(
  type: 'item' | 'asset',
  code: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hr-ims.example.com'
  return `${baseUrl}/public/${type}/${code}`
}
```

---

## Serial Number Generator

```typescript
// lib/id/serial-number.ts

interface SerialNumberConfig {
  prefix?: string
  suffix?: string
  length?: number
  includeYear?: boolean
  includeMonth?: boolean
}

export function generateSerialNumber(
  sequence: number,
  config: SerialNumberConfig = {}
): string {
  const {
    prefix = '',
    suffix = '',
    length = 8,
    includeYear = false,
    includeMonth = false
  } = config

  const parts: string[] = []

  if (prefix) parts.push(prefix)

  if (includeYear) {
    const year = new Date().getFullYear().toString().slice(-2)
    parts.push(year)
  }

  if (includeMonth) {
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0')
    parts.push(month)
  }

  parts.push(sequence.toString().padStart(length, '0'))

  if (suffix) parts.push(suffix)

  return parts.join('-')
}

// Examples
// SN-00000001
// S/N: 25-02-00000001
// INV2026-0001
```

---

## Client-Side ID Hook

```typescript
// hooks/use-id.ts
'use client'

import { useCallback } from 'react'
import { nanoid, uuid, alphanumericId } from '@/lib/id'

export function useId() {
  const generateId = useCallback(() => {
    return {
      uuid: uuid(),
      nanoid: nanoid(),
      short: alphanumericId(8),
      reference: (type: string) => `${type}-${alphanumericId(6)}`
    }
  }, [])

  return { generateId }
}

// Usage
function CreateItemForm() {
  const { generateId } = useId()

  const handleCreate = () => {
    const id = generateId()
    console.log(id.uuid)     // 550e8400-e29b-41d4-a716-446655440000
    console.log(id.nanoid)   // V1StGXR8_Z5jdHi6B-myT
    console.log(id.short)    // A3F8K2B1
    console.log(id.reference('INV')) // INV-A3F8K2
  }
}
```

---

## Bulk ID Generation

```typescript
// lib/id/bulk.ts

export function generateBulkIds(
  count: number,
  type: 'uuid' | 'nanoid' | 'alphanumeric' = 'nanoid',
  length: number = 10
): string[] {
  const ids: string[] = []

  for (let i = 0; i < count; i++) {
    switch (type) {
      case 'uuid':
        ids.push(uuid())
        break
      case 'nanoid':
        ids.push(nanoid(length))
        break
      case 'alphanumeric':
        ids.push(alphanumericId(length))
        break
    }
  }

  return ids
}

// Check for uniqueness
export function ensureUnique(ids: string[]): string[] {
  const unique = new Set(ids)
  if (unique.size !== ids.length) {
    throw new Error('Duplicate IDs detected')
  }
  return ids
}
```

---

## Usage Examples

```typescript
// Example 1: Generate item code on creation
async function createItem(data: CreateItemInput) {
  const code = await generateInventoryCode()
  // code = "INV-20260225-00001"

  const item = await prisma.inventoryItem.create({
    data: {
      ...data,
      code
    }
  })

  return item
}

// Example 2: Generate QR code value
async function generateItemQR(itemId: string, code: string) {
  const qrValue = generateQRValue('item', itemId, code)
  // qrValue = '{"type":"item","id":"123","code":"INV-20260225-00001","timestamp":1740432000000}'

  return qrValue
}

// Example 3: Generate request reference
async function createRequest(data: CreateRequestInput) {
  const code = await generateRequestCode()
  // code = "REQ-20260225-00001"

  const request = await prisma.request.create({
    data: {
      ...data,
      code
    }
  })

  return request
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
