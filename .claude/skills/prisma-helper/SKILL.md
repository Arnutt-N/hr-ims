---
name: prisma-helper
description: Prisma ORM helper for schema, queries, migrations, and best practices
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["prisma", "schema", "migration", "database", "query", "model", "seed"]
  file_patterns: ["prisma/schema.prisma", "prisma/seed.ts", "**/*.prisma"]
  context: database, backend
mcp_servers:
  - context7
personas:
  - backend
  - architect
---

# Prisma Helper

## Core Role

Assist with Prisma ORM operations in HR-IMS:
- Schema design and relationships
- Query patterns and optimization
- Migrations and seeding
- Best practices for SQLite/PostgreSQL

---

## Project Context

```yaml
database:
  type: SQLite (development)
  production_ready: PostgreSQL
  location: backend/prisma/dev.db
  schema: backend/prisma/schema.prisma

clients:
  backend: backend/node_modules/@prisma/client
  frontend: frontend/next-app/node_modules/@prisma/client

commands:
  generate: cd backend && npx prisma generate
  push: cd backend && npx prisma db push
  migrate: cd backend && npx prisma migrate dev --name <name>
  studio: cd backend && npx prisma studio
  seed: cd backend && npx prisma db seed
```

---

## Schema Patterns

### Standard Model Template

```prisma
model Entity {
  id        Int       @id @default(autoincrement())
  name      String
  status    Status    @default(ACTIVE)

  // Relations
  userId    Int
  user      User      @relation(fields: [userId], references: [id])
  items     Item[]

  // Timestamps
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  // Indexes
  @@index([userId])
  @@index([status])
  @@map("entities")
}

enum Status {
  ACTIVE
  INACTIVE
  DELETED
}
```

### Relationship Patterns

```prisma
// One-to-One
model User {
  id        Int       @id @default(autoincrement())
  profile   Profile?  // Optional one-to-one
}

model Profile {
  id        Int       @id @default(autoincrement())
  userId    Int       @unique  // FK must be unique
  user      User      @relation(fields: [userId], references: [id])
}

// One-to-Many
model User {
  id        Int       @id @default(autoincrement())
  posts     Post[]
}

model Post {
  id        Int       @id @default(autoincrement())
  authorId  Int
  author    User      @relation(fields: [authorId], references: [id])
}

// Many-to-Many (Explicit)
model Student {
  id        Int       @id @default(autoincrement())
  courses   Course[]  @relation("StudentCourses")
}

model Course {
  id        Int       @id @default(autoincrement())
  students  Student[] @relation("StudentCourses")
}

// Many-to-Many (Implicit junction table)
model Enrollment {
  studentId  Int
  courseId   Int
  enrolledAt DateTime @default(now())

  student    Student  @relation(fields: [studentId], references: [id])
  course     Course   @relation(fields: [courseId], references: [id])

  @@id([studentId, courseId])
}

// Self-relation (Tree structure)
model Category {
  id        Int        @id @default(autoincrement())
  name      String
  parentId  Int?
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
}
```

---

## Query Patterns

### CRUD Operations

```typescript
import prisma from '@/lib/prisma'

// Create
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    profile: {
      create: { bio: 'Hello world' }
    }
  },
  include: { profile: true }
})

// Read (Single)
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: { posts: true, profile: true }
})

// Read (List with pagination)
const users = await prisma.user.findMany({
  where: { status: 'ACTIVE' },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' },
  include: { _count: { select: { posts: true } } }
})

// Update
const user = await prisma.user.update({
  where: { id: 1 },
  data: { name: 'Updated Name' }
})

// Delete
await prisma.user.delete({ where: { id: 1 } })

// Soft Delete (preferred)
await prisma.user.update({
  where: { id: 1 },
  data: { status: 'DELETED', deletedAt: new Date() }
})
```

### Complex Queries

```typescript
// Filtering
const items = await prisma.item.findMany({
  where: {
    AND: [
      { status: 'ACTIVE' },
      { OR: [
        { name: { contains: search } },
        { description: { contains: search } }
      ]}
    ]
  }
})

// Aggregation
const stats = await prisma.item.aggregate({
  where: { status: 'ACTIVE' },
  _count: { id: true },
  _sum: { quantity: true },
  _avg: { price: true }
})

// Grouping
const byCategory = await prisma.item.groupBy({
  by: ['categoryId'],
  _count: { id: true },
  _sum: { quantity: true }
})

// Transactions
const result = await prisma.$transaction([
  prisma.inventory.update({
    where: { id: itemId },
    data: { quantity: { decrement: quantity } }
  }),
  prisma.request.create({
    data: { itemId, quantity, userId }
  })
])

// Raw SQL (when needed)
const result = await prisma.$queryRaw`
  SELECT * FROM users WHERE created_at > ${date}
`
```

### Optimization Patterns

```typescript
// Select only needed fields
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true }
})

// Use indexes in where clause
const items = await prisma.item.findMany({
  where: {
    warehouseId: warehouseId,  // Indexed
    status: 'ACTIVE'           // Indexed
  }
})

// Batch operations
await prisma.item.createMany({
  data: items,
  skipDuplicates: true
})

// Parallel queries
const [users, items, stats] = await Promise.all([
  prisma.user.findMany(),
  prisma.item.findMany(),
  prisma.item.count()
])
```

---

## Migration Commands

```bash
# Development
cd backend
npx prisma migrate dev --name add_user_table    # Create & apply migration
npx prisma migrate dev --create-only            # Create only (review before applying)
npx prisma db push                               # Quick prototype (no migration file)

# Production
npx prisma migrate deploy                        # Apply pending migrations
npx prisma migrate status                        # Check migration status

# Reset
npx prisma migrate reset                         # Reset database + run seed
npx prisma db push --force-reset                 # Force reset without migrations
```

---

## Seed Template

```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { slug: 'superadmin' },
      update: {},
      create: { name: 'Super Admin', slug: 'superadmin' }
    }),
    prisma.role.upsert({
      where: { slug: 'admin' },
      update: {},
      create: { name: 'Admin', slug: 'admin' }
    }),
    prisma.role.upsert({
      where: { slug: 'user' },
      update: {},
      create: { name: 'User', slug: 'user' }
    })
  ])

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hr-ims.com' },
    update: {},
    create: {
      email: 'admin@hr-ims.com',
      name: 'Admin',
      password: hashedPassword,
      status: 'ACTIVE'
    }
  })

  // Assign role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: admin.id, roleId: roles[0].id }
    },
    update: {},
    create: { userId: admin.id, roleId: roles[0].id }
  })

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

---

## Best Practices

1. **Always use transactions** for operations affecting multiple tables
2. **Index frequently queried fields** (status, foreign keys, search fields)
3. **Use soft delete** instead of hard delete for audit trail
4. **Select only needed fields** to reduce payload
5. **Use `include` sparingly** - prefer explicit `select`
6. **Run `prisma generate`** after schema changes
7. **Always create audit logs** for CUD operations

---

## Troubleshooting

```bash
# Prisma client not generated
npx prisma generate

# Database out of sync
npx prisma db push

# Migration conflicts
npx prisma migrate resolve --rolled-back <migration_name>

# Check database connection
npx prisma db execute --stdin <<< "SELECT 1"

# View database in GUI
npx prisma studio
```

---

*Version: 1.0.0 | For HR-IMS Project*
