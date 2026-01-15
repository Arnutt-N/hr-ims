---
name: API Development
description: Guide for creating backend APIs with Express, Prisma, validation, and authentication
---

# การพัฒนา API

This skill helps you create robust backend APIs following HR-IMS patterns.

## โครงสร้างโปรเจค

```
backend/src/
├── controllers/    # Business logic
├── routes/         # Route definitions
├── middleware/     # Auth, validation, etc.
├── services/       # Reusable services
└── utils/          # Utilities (prisma, helpers)
```

## Creating a New API Endpoint

### Step 1: Define Controller

**File:** `backend/src/controllers/yourController.ts`

```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';

// Validation schema
const itemSchema = z.object({
    name: z.string(),
    category: z.string(),
    type: z.enum(['durable', 'consumable']),
    stock: z.number().int().min(0).default(1),
    // ... other fields
});

// GET - List all items
export const getItems = async (req: Request, res: Response) => {
    try {
        const items = await prisma.inventoryItem.findMany({
            orderBy: { createdAt: 'desc' },
            include: { stockLevels: true } // Include relations if needed
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error });
    }
};

// POST - Create new item
export const createItem = async (req: Request, res: Response) => {
    try {
        const data = itemSchema.parse(req.body);
        const item = await prisma.inventoryItem.create({ data });
        res.status(201).json(item);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: error.errors 
            });
        }
        res.status(400).json({ message: 'Error creating item', error });
    }
};

// PATCH - Update item
export const updateItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = itemSchema.partial().parse(req.body);
        
        const item = await prisma.inventoryItem.update({
            where: { id: parseInt(id) },
            data,
        });
        res.json(item);
    } catch (error) {
        res.status(400).json({ message: 'Error updating item', error });
    }
};

// DELETE - Delete item
export const deleteItem = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.inventoryItem.delete({
            where: { id: parseInt(id) },
        });
        res.json({ message: 'Item deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error });
    }
};
```

### ขั้นตอน 2: กำหนดเส้นทาง (Routes)

**File:** `backend/src/routes/yourRoute.ts`

```typescript
import { Router } from 'express';
import { getItems, createItem, updateItem, deleteItem } from '../controllers/yourController';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Public route
router.get('/', getItems);

// Protected routes
router.post('/', requireAuth, requireRole(['superadmin', 'admin']), createItem);
router.patch('/:id', requireAuth, requireRole(['superadmin', 'admin']), updateItem);
router.delete('/:id', requireAuth, requireRole(['superadmin']), deleteItem);

export default router;
```

### Step 3: Register Route in Main App

**File:** `backend/src/index.ts`

```typescript
import yourRoute from './routes/yourRoute';

// ... other imports

app.use('/api/your-endpoint', yourRoute);
```

## Authentication Middleware

HR-IMS uses **header-based authentication** for Next.js integration.

### Using Auth Middleware

```typescript
import { requireAuth, requireRole } from '../middleware/auth';

// Require authentication
router.post('/', requireAuth, createItem);

// Require specific role(s)
router.post('/', requireAuth, requireRole(['superadmin', 'admin']), createItem);
```

### Header การยืนยันจาก Next.js

```typescript
// Next.js middleware injects these headers
headers: {
  'x-user-id': '123',
  'x-user-role': 'admin'
}
```

### การเข้าถึงผู้ใช้ใน Controller

```typescript
import { AuthRequest } from '../middleware/auth';

export const createItem = async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;  // User ID from auth
    const userRole = req.user?.role;  // User role
    
    // Use in query
    const item = await prisma.inventoryItem.create({
        data: {
            ...req.body,
            createdBy: userId
        }
    });
};
```

## Validation with Zod

### Basic Schema

```typescript
import { z } from 'zod';

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email(),
    age: z.number().int().min(0).max(150),
    status: z.enum(['active', 'inactive']),
    tags: z.array(z.string()).optional(),
});
```

### Partial Updates

```typescript
// Allow partial updates
const data = schema.partial().parse(req.body);
```

### Custom Validation

```typescript
const schema = z.object({
    password: z.string().min(6),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
```

## Common Prisma Patterns

### Simple Query

```typescript
const items = await prisma.inventoryItem.findMany();
```

### With Relations

```typescript
const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
        user: true,
        requestItems: {
            include: { item: true }
        }
    }
});
```

### การกรองข้อมูล

```typescript
const items = await prisma.inventoryItem.findMany({
    where: {
        category: 'Electronics',
        status: 'available',
        stock: { gt: 0 }
    },
    orderBy: { createdAt: 'desc' },
    take: 10  // Limit results
});
```

### Transactions

```typescript
const result = await prisma.$transaction(async (tx) => {
    // Update stock
    await tx.stockLevel.update({
        where: { id: stockId },
        data: { quantity: { decrement: amount } }
    });
    
    // Create transaction record
    const transaction = await tx.stockTransaction.create({
        data: {
            warehouseId: warehouseId,
            itemId: itemId,
            quantity: -amount,
            type: 'outbound',
            userId: userId
        }
    });
    
    return transaction;
});
```

## การจัดการข้อผิดพลาด

### Standard Pattern

```typescript
export const yourFunction = async (req: Request, res: Response) => {
    try {
        // Your logic
        res.json({ success: true });
    } catch (error) {
        // Zod validation errors
        if (error instanceof z.ZodError) {
            return res.status(400).json({ 
                message: 'Validation failed',
                errors: error.errors 
            });
        }
        
        // Prisma errors
        if (error.code === 'P2002') {
            return res.status(409).json({ 
                message: 'Duplicate entry' 
            });
        }
        
        // Generic error
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};
```

## Role-Based Access Control

### Available Roles

- `superadmin` - Full access
- `admin` - Most operations
- `hr` - HR-specific operations
- `user` - Basic access

### Examples

```typescript
// Only superadmin
router.delete('/:id', requireAuth, requireRole(['superadmin']), deleteItem);

// Admin or superadmin
router.post('/', requireAuth, requireRole(['superadmin', 'admin']), createItem);

// Any authenticated user
router.get('/profile', requireAuth, getProfile);
```

## การทดสอบ API

### Using Thunder Client / Postman

```
GET http://localhost:5000/api/inventory
Headers:
  x-user-id: 1
  x-user-role: admin

POST http://localhost:5000/api/inventory
Headers:
  x-user-id: 1
  x-user-role: admin
  Content-Type: application/json
Body:
{
  "name": "Laptop",
  "category": "Electronics",
  "type": "durable",
  "stock": 5
}
```

## แนวปฏิบัติที่ดีที่สุด

1. ✅ Always validate input with Zod
2. ✅ Use try-catch for error handling
3. ✅ Return appropriate HTTP status codes
4. ✅ Use transactions for multi-step operations
5. ✅ Include relations when needed, but don't over-fetch
6. ✅ Use `requireAuth` and `requireRole` for protected routes
7. ✅ Log errors for debugging
8. ❌ Don't expose sensitive data in error messages
9. ❌ Don't trust client input without validation
10. ❌ Don't forget to handle edge cases

## Quick Reference

| HTTP Method | Purpose | Status Code |
|-------------|---------|-------------|
| GET | Retrieve data | 200 OK |
| POST | Create new | 201 Created |
| PATCH | Update partial | 200 OK |
| PUT | Update full | 200 OK |
| DELETE | Remove | 200 OK / 204 No Content |

| Error Type | Status Code |
|------------|-------------|
| Validation error | 400 Bad Request |
| Unauthorized | 401 Unauthorized |
| Forbidden | 403 Forbidden |
| Not found | 404 Not Found |
| Conflict | 409 Conflict |
| Server error | 500 Internal Server Error |
