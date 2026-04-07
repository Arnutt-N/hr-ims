---
name: Prisma Schema Management
description: Guide for managing Prisma schemas, syncing between backend/frontend, and database operations
---

# การจัดการ Prisma Schema

This skill helps you manage Prisma schemas in the HR-IMS project effectively.

## บริบทของโปรเจค

HR-IMS maintains **TWO separate Prisma schemas**:
- **Backend**: `d:\02 genAI\hr-ims\backend\prisma\schema.prisma`
- **Frontend**: `d:\02 genAI\hr-ims\frontend\next-app\prisma\schema.prisma`

Both schemas MUST be kept in sync manually.

## งานทั่วไป

### 1. การเพิ่มโมเดลใหม่

When adding a new model, you MUST update BOTH schemas identically.

**Template:**
```prisma
model ModelName {
  id        Int      @id @default(autoincrement())
  name      String
  status    String   @default("active")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  relatedItems RelatedModel[]
}
```

**After adding model:**
```bash
# Backend
cd backend
npx prisma generate
npx prisma db push

# Frontend
cd frontend/next-app
npx prisma generate
```

### 2. การเพิ่มความสัมพันธ์

**One-to-Many Example:**
```prisma
// Parent model
model User {
  id       Int       @id @default(autoincrement())
  requests Request[]  // One user has many requests
}

// Child model
model Request {
  id     Int  @id @default(autoincrement())
  userId Int
  user   User @relation(fields: [userId], references: [id])
}
```

**Many-to-Many Example:**
```prisma
model Request {
  id           Int           @id @default(autoincrement())
  requestItems RequestItem[]
}

model InventoryItem {
  id           Int           @id @default(autoincrement())
  requestItems RequestItem[]
}

model RequestItem {
  id        Int           @id @default(autoincrement())
  requestId Int
  request   Request       @relation(fields: [requestId], references: [id], onDelete: Cascade)
  itemId    Int
  item      InventoryItem @relation(fields: [itemId], references: [id])
  quantity  Int           @default(1)
}
```

### 3. การใช้ Enum (เข้ากันได้กับ SQLite)

SQLite doesn't support native enums. Use String with validation instead:

```prisma
model User {
  role String @default("user") // admin, hr, user
}

model Request {
  status String @default("pending") // pending, approved, rejected
  type   String // withdraw, borrow, return
}
```

### 4. Unique Constraints

```prisma
model User {
  email String @unique
}

model StockLevel {
  warehouseId Int
  itemId      Int
  
  @@unique([warehouseId, itemId])
}
```

### 5. Cascade Deletes

```prisma
model Request {
  id           Int           @id @default(autoincrement())
  requestItems RequestItem[]
}

model RequestItem {
  id        Int     @id @default(autoincrement())
  requestId Int
  request   Request @relation(fields: [requestId], references: [id], onDelete: Cascade)
}
```

## การซิงค์ Schema

**Critical Steps:**

1. **After ANY schema change:**
   ```bash
   # Test in backend first
   cd backend
   npx prisma format
   npx prisma validate
   npx prisma generate
   npx prisma db push
   ```

2. **Copy to frontend:**
   ```bash
   # Copy the ENTIRE schema.prisma content
   # from backend to frontend
   
   cd ../frontend/next-app
   npx prisma format
   npx prisma validate
   npx prisma generate
   ```

3. **Verify sync:**
   - Check both files are identical
   - Test database operations in both backend and frontend

## การทำงานกับฐานข้อมูล

### Reset Database (Delete all data)
```bash
cd backend
npx prisma db push --force-reset
npx prisma db seed
```

### Update Schema (Preserve data)
```bash
cd backend
npx prisma db push
npx prisma db seed  # Optional: add seed data
```

### View Database
```bash
cd backend
npx prisma studio
```

## Common Patterns in HR-IMS

### Warehouse Management
```prisma
model Warehouse {
  id          Int       @id @default(autoincrement())
  name        String
  code        String    @unique
  type        String    // "central" | "division"
  stockLevels StockLevel[]
}

model StockLevel {
  id          Int           @id @default(autoincrement())
  warehouseId Int
  warehouse   Warehouse     @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  itemId      Int
  item        InventoryItem @relation(fields: [itemId], references: [id], onDelete: Cascade)
  quantity    Int           @default(0)
  minStock    Int?
  maxStock    Int?
  
  @@unique([warehouseId, itemId])
}
```

### User-Item Relations
```prisma
model User {
  id        Int       @id @default(autoincrement())
  role      String    @default("user")
  requests  Request[]
  notifications Notification[]
}

model Request {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  status    String   @default("pending")
  type      String   // withdraw, borrow, return
  warehouseId Int?
  warehouse   Warehouse? @relation(fields: [warehouseId], references: [id])
}
```

## Troubleshooting

### Problem: "Unknown relation field"
**Solution:** Add backward relation to the related model.

### Problem: "Validation failed"
**Solution:** Run `npx prisma format` and check for syntax errors.

### Problem: Frontend can't find model
**Solution:** 
1. Verify schema is copied to frontend
2. Run `npx prisma generate` in frontend
3. Restart dev server

### Problem: Type mismatch between backend/frontend
**Solution:** Schemas are out of sync. Compare both files and make them identical.

## แนวปฏิบัติที่ดีที่สุด

1. ✅ Always update BOTH schemas (backend + frontend)
2. ✅ Use `npx prisma format` before committing
3. ✅ Test in backend first, then sync to frontend
4. ✅ Use `@default(now())` for timestamps
5. ✅ Use `@updatedAt` for automatic update tracking
6. ✅ Add `onDelete: Cascade` for child records
7. ❌ Don't use enums (SQLite limitation)
8. ❌ Don't forget to run `npx prisma generate` after changes
9. ❌ Don't modify schema directly in production

## อ้างอิงอย่างรวดเร็ว

| Task | Backend | Frontend |
|------|---------|----------|
| Generate Client | `cd backend && npx prisma generate` | `cd frontend/next-app && npx prisma generate` |
| Push Schema | `cd backend && npx prisma db push` | N/A (frontend uses backend DB) |
| View DB | `cd backend && npx prisma studio` | Same |
| Format Schema | `npx prisma format` | `npx prisma format` |
| Validate | `npx prisma validate` | `npx prisma validate` |
| Seed DB | `npx prisma db seed` | N/A |
