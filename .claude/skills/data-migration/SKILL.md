---
name: data-migration
description: Data migration utilities for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["migration", "data migration", "schema migration", "database migration", "migrate"]
  file_patterns: ["*migration*", "lib/migration*", "scripts/migrate*"]
  context: data migration, schema changes, database migrations, data transformation
mcp_servers:
  - sequential
personas:
  - backend
  - devops
---

# Data Migration

## Core Role

Handle data migrations for HR-IMS:
- Schema migrations
- Data transformations
- Bulk data updates
- Rollback support

---

## Migration Runner

```typescript
// lib/migration/runner.ts
import prisma from '@/lib/prisma'
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'

export interface Migration {
  id: string
  name: string
  up: () => Promise<void>
  down: () => Promise<void>
}

export interface MigrationRecord {
  id: string
  name: string
  executedAt: Date
  rollbackAvailable: boolean
}

// Migration status
export type MigrationStatus = 'pending' | 'executed' | 'failed' | 'rolled_back'

// Get migrations directory
function getMigrationsDir(): string {
  return join(process.cwd(), 'migrations')
}

// Ensure migrations table exists
async function ensureMigrationsTable(): Promise<void> {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      rollback_available BOOLEAN DEFAULT true
    )
  `
}

// Get executed migrations
async function getExecutedMigrations(): Promise<MigrationRecord[]> {
  await ensureMigrationsTable()
  return prisma.$queryRaw<MigrationRecord[]>`
    SELECT * FROM _migrations ORDER BY executed_at ASC
  `
}

// Get pending migrations
export async function getPendingMigrations(): Promise<string[]> {
  const migrationsDir = getMigrationsDir()

  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true })
    return []
  }

  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
    .sort()

  const executed = await getExecutedMigrations()
  const executedIds = new Set(executed.map(m => m.id))

  return files.filter(f => !executedIds.has(f.replace(/\.(ts|js)$/, '')))
}

// Run single migration
export async function runMigration(migrationFile: string): Promise<{
  success: boolean
  error?: string
}> {
  const migrationsDir = getMigrationsDir()
  const migrationPath = join(migrationsDir, migrationFile)

  if (!existsSync(migrationPath)) {
    return { success: false, error: 'Migration file not found' }
  }

  try {
    // Import migration
    const migration = require(migrationPath) as Migration

    // Run in transaction
    await prisma.$transaction(async (tx) => {
      // Execute migration
      await migration.up()

      // Record migration
      await tx.$executeRaw`
        INSERT INTO _migrations (id, name, executed_at, rollback_available)
        VALUES (${migration.id}, ${migration.name}, CURRENT_TIMESTAMP, true)
      `
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Run all pending migrations
export async function runAllMigrations(): Promise<{
  executed: string[]
  failed: Array<{ file: string; error: string }>
}> {
  const pending = await getPendingMigrations()
  const executed: string[] = []
  const failed: Array<{ file: string; error: string }> = []

  for (const file of pending) {
    const result = await runMigration(file)
    if (result.success) {
      executed.push(file)
    } else {
      failed.push({ file, error: result.error || 'Unknown error' })
      break // Stop on first failure
    }
  }

  return { executed, failed }
}

// Rollback last migration
export async function rollbackLastMigration(): Promise<{
  success: boolean
  error?: string
}> {
  const executed = await getExecutedMigrations()

  if (executed.length === 0) {
    return { success: false, error: 'No migrations to rollback' }
  }

  const lastMigration = executed[executed.length - 1]
  const migrationsDir = getMigrationsDir()
  const migrationPath = join(migrationsDir, `${lastMigration.id}.ts`)

  if (!existsSync(migrationPath)) {
    // Try .js extension
    const jsPath = join(migrationsDir, `${lastMigration.id}.js`)
    if (!existsSync(jsPath)) {
      return { success: false, error: 'Migration file not found' }
    }
  }

  try {
    const migration = require(existsSync(migrationPath) ? migrationPath : join(migrationsDir, `${lastMigration.id}.js`))

    await prisma.$transaction(async (tx) => {
      // Execute rollback
      await migration.down()

      // Remove migration record
      await tx.$executeRaw`
        DELETE FROM _migrations WHERE id = ${lastMigration.id}
      `
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Get migration status
export async function getMigrationStatus(): Promise<{
  executed: MigrationRecord[]
  pending: string[]
}> {
  const [executed, pending] = await Promise.all([
    getExecutedMigrations(),
    getPendingMigrations()
  ])

  return { executed, pending }
}
```

---

## Migration Generator

```typescript
// lib/migration/generator.ts
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface CreateMigrationOptions {
  name: string
  type: 'schema' | 'data' | 'index' | 'constraint'
  description?: string
}

// Generate migration file
export function createMigration(options: CreateMigrationOptions): string {
  const migrationsDir = join(process.cwd(), 'migrations')

  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
  const id = `${timestamp}_${options.type}_${options.name.toLowerCase().replace(/\s+/g, '_')}`
  const filename = `${id}.ts`
  const filepath = join(migrationsDir, filename)

  const template = generateMigrationTemplate(id, options)

  writeFileSync(filepath, template, 'utf-8')

  return filename
}

// Generate migration template
function generateMigrationTemplate(id: string, options: CreateMigrationOptions): string {
  const typeComments: Record<string, string> = {
    schema: 'Schema change migration - modify table structure',
    data: 'Data migration - transform or update data',
    index: 'Index migration - add or remove indexes',
    constraint: 'Constraint migration - add or remove constraints'
  }

  return `import prisma from '@/lib/prisma'
import { Migration } from '@/lib/migration/runner'

/**
 * Migration: ${options.name}
 * Type: ${options.type}
 * ${typeComments[options.type]}
 * ${options.description ? `Description: ${options.description}` : ''}
 */

export const migration: Migration = {
  id: '${id}',
  name: '${options.name}',

  up: async () => {
    // TODO: Implement migration
    // Example:
    // await prisma.$executeRaw\`
    //   ALTER TABLE users ADD COLUMN new_column TEXT
    // \`

    throw new Error('Migration not implemented')
  },

  down: async () => {
    // TODO: Implement rollback
    // Example:
    // await prisma.$executeRaw\`
    //   ALTER TABLE users DROP COLUMN new_column
    // \`

    throw new Error('Rollback not implemented')
  }
}

export default migration
`
}
```

---

## Common Migrations

```typescript
// migrations/20240115000000_schema_add_user_preferences.ts
import prisma from '@/lib/prisma'
import { Migration } from '@/lib/migration/runner'

export const migration: Migration = {
  id: '20240115000000_schema_add_user_preferences',
  name: 'Add user preferences',

  up: async () => {
    await prisma.$executeRaw`
      ALTER TABLE User ADD COLUMN preferences TEXT DEFAULT '{}'
    `
  },

  down: async () => {
    await prisma.$executeRaw`
      ALTER TABLE User DROP COLUMN preferences
    `
  }
}

// migrations/20240115000001_data_migrate_user_roles.ts
import prisma from '@/lib/prisma'
import { Migration } from '@/lib/migration/runner'

export const migration: Migration = {
  id: '20240115000001_data_migrate_user_roles',
  name: 'Migrate user roles to new format',

  up: async () => {
    // Get all users with old role format
    const users = await prisma.$queryRaw<Array<{ id: number; role: string }>>`
      SELECT id, role FROM User WHERE role IS NOT NULL
    `

    for (const user of users) {
      // Create UserRole entry
      const role = await prisma.role.findFirst({
        where: { slug: user.role.toLowerCase() }
      })

      if (role) {
        await prisma.$executeRaw`
          INSERT OR IGNORE INTO UserRole (userId, roleId, assignedAt)
          VALUES (${user.id}, ${role.id}, CURRENT_TIMESTAMP)
        `
      }
    }
  },

  down: async () => {
    // Get UserRole mappings
    const userRoles = await prisma.$queryRaw<Array<{ userId: number; roleSlug: string }>>`
      SELECT ur.userId, r.slug as roleSlug
      FROM UserRole ur
      JOIN Role r ON ur.roleId = r.id
    `

    // Restore old role format (take first role)
    const userPrimaryRoles = new Map<number, string>()
    for (const ur of userRoles) {
      if (!userPrimaryRoles.has(ur.userId)) {
        userPrimaryRoles.set(ur.userId, ur.roleSlug)
      }
    }

    for (const [userId, roleSlug] of userPrimaryRoles) {
      await prisma.$executeRaw`
        UPDATE User SET role = ${roleSlug} WHERE id = ${userId}
      `
    }

    // Clear UserRole table
    await prisma.$executeRaw`DELETE FROM UserRole`
  }
}

// migrations/20240115000002_index_add_inventory_indexes.ts
import prisma from '@/lib/prisma'
import { Migration } from '@/lib/migration/runner'

export const migration: Migration = {
  id: '20240115000002_index_add_inventory_indexes',
  name: 'Add inventory performance indexes',

  up: async () => {
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_inventory_item_code ON InventoryItem(code)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_inventory_item_name ON InventoryItem(name)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_inventory_item_category ON InventoryItem(categoryId)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_stock_level_warehouse ON StockLevel(warehouseId)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_request_status ON Request(status)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_request_user ON Request(userId)
    `
  },

  down: async () => {
    await prisma.$executeRaw`DROP INDEX IF EXISTS idx_inventory_item_code`
    await prisma.$executeRaw`DROP INDEX IF EXISTS idx_inventory_item_name`
    await prisma.$executeRaw`DROP INDEX IF EXISTS idx_inventory_item_category`
    await prisma.$executeRaw`DROP INDEX IF EXISTS idx_stock_level_warehouse`
    await prisma.$executeRaw`DROP INDEX IF EXISTS idx_request_status`
    await prisma.$executeRaw`DROP INDEX IF EXISTS idx_request_user`
  }
}
```

---

## Data Transformation Utilities

```typescript
// lib/migration/transformers.ts
import prisma from '@/lib/prisma'

// Batch update with progress
export async function batchUpdate<T>(
  table: string,
  updates: Array<{ id: number; data: Partial<T> }>,
  options: { batchSize?: number; onProgress?: (done: number, total: number) => void } = {}
): Promise<{ updated: number; failed: number }> {
  const { batchSize = 100, onProgress } = options
  let updated = 0
  let failed = 0

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)

    for (const item of batch) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE ${table} SET ${Object.keys(item.data)
            .map(k => `${k} = ?`)
            .join(', ')} WHERE id = ?`,
          ...Object.values(item.data),
          item.id
        )
        updated++
      } catch {
        failed++
      }
    }

    onProgress?.(Math.min(i + batchSize, updates.length), updates.length)
  }

  return { updated, failed }
}

// Transform data with mapping function
export async function transformData<TInput, TOutput>(
  table: string,
  transform: (row: TInput) => TOutput,
  options: {
    select?: string[]
    where?: string
    batchSize?: number
  } = {}
): Promise<{ transformed: number }> {
  const { select = ['*'], where = '1=1', batchSize = 100 } = options

  let transformed = 0
  let offset = 0

  while (true) {
    const rows = await prisma.$queryRawUnsafe<TInput[]>(
      `SELECT ${select.join(', ')} FROM ${table} WHERE ${where} LIMIT ${batchSize} OFFSET ${offset}`
    )

    if (rows.length === 0) break

    for (const row of rows) {
      const transformedRow = transform(row)
      // Update or insert transformed data
      // Implementation depends on use case
      transformed++
    }

    offset += batchSize
  }

  return { transformed }
}

// Duplicate data detection
export async function findDuplicates(
  table: string,
  columns: string[]
): Promise<Array<{ values: any; count: number; ids: number[] }>> {
  const columnList = columns.join(', ')

  const duplicates = await prisma.$queryRaw<Array<{ values: any; count: bigint; ids: string }>>`
    SELECT
      ${columnList} as values,
      COUNT(*) as count,
      GROUP_CONCAT(id) as ids
    FROM ${prisma.$queryRawUnsafe(table)}
    GROUP BY ${columnList}
    HAVING COUNT(*) > 1
  `

  return duplicates.map(d => ({
    values: d.values,
    count: Number(d.count),
    ids: d.ids.split(',').map(Number)
  }))
}

// Merge duplicate records
export async function mergeDuplicates(
  table: string,
  duplicateIds: number[],
  keepId: number,
  relations: Array<{ table: string; column: string }>
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Update all relations to point to kept record
    for (const rel of relations) {
      await tx.$executeRawUnsafe(
        `UPDATE ${rel.table} SET ${rel.column} = ? WHERE ${rel.column} IN (?)`,
        keepId,
        duplicateIds.filter(id => id !== keepId).join(',')
      )
    }

    // Delete duplicate records
    await tx.$executeRawUnsafe(
      `DELETE FROM ${table} WHERE id IN (?)`,
      duplicateIds.filter(id => id !== keepId).join(',')
    )
  })
}
```

---

## Migration CLI Script

```typescript
// scripts/migrate.ts
import { Command } from 'commander'
import {
  getMigrationStatus,
  runAllMigrations,
  runMigration,
  rollbackLastMigration,
  getPendingMigrations
} from '@/lib/migration/runner'
import { createMigration } from '@/lib/migration/generator'

const program = new Command()

program
  .name('migrate')
  .description('HR-IMS Database Migration Tool')

// Status command
program
  .command('status')
  .description('Show migration status')
  .action(async () => {
    const status = await getMigrationStatus()

    console.log('\n📋 Migration Status\n')
    console.log('Executed migrations:')
    status.executed.forEach(m => {
      console.log(`  ✅ ${m.id} - ${m.name} (${m.executedAt.toISOString()})`)
    })

    console.log('\nPending migrations:')
    if (status.pending.length === 0) {
      console.log('  No pending migrations')
    } else {
      status.pending.forEach(m => {
        console.log(`  ⏳ ${m}`)
      })
    }
    console.log()
  })

// Run command
program
  .command('up')
  .description('Run pending migrations')
  .option('-f, --file <file>', 'Run specific migration file')
  .action(async (options) => {
    if (options.file) {
      console.log(`Running migration: ${options.file}`)
      const result = await runMigration(options.file)
      if (result.success) {
        console.log('✅ Migration executed successfully')
      } else {
        console.error('❌ Migration failed:', result.error)
        process.exit(1)
      }
    } else {
      console.log('Running all pending migrations...')
      const result = await runAllMigrations()

      result.executed.forEach(f => console.log(`  ✅ ${f}`))
      result.failed.forEach(f => console.error(`  ❌ ${f.file}: ${f.error}`))

      if (result.failed.length > 0) {
        process.exit(1)
      }
    }
  })

// Rollback command
program
  .command('down')
  .description('Rollback last migration')
  .action(async () => {
    console.log('Rolling back last migration...')
    const result = await rollbackLastMigration()

    if (result.success) {
      console.log('✅ Rollback successful')
    } else {
      console.error('❌ Rollback failed:', result.error)
      process.exit(1)
    }
  })

// Create command
program
  .command('create <name>')
  .description('Create new migration')
  .option('-t, --type <type>', 'Migration type (schema|data|index|constraint)', 'schema')
  .action(async (name, options) => {
    const filename = createMigration({
      name,
      type: options.type,
      description: `Created via CLI`
    })

    console.log(`✅ Migration created: migrations/${filename}`)
  })

program.parse()
```

---

## Usage Examples

```bash
# CLI Commands

# Check migration status
npx ts-node scripts/migrate.ts status

# Run all pending migrations
npx ts-node scripts/migrate.ts up

# Run specific migration
npx ts-node scripts/migrate.ts up -f 20240115000000_schema_add_user_preferences.ts

# Rollback last migration
npx ts-node scripts/migrate.ts down

# Create new migration
npx ts-node scripts/migrate.ts create "Add user avatar" -t schema
```

```typescript
// Example 1: Programmatic migration
import { runAllMigrations, getMigrationStatus } from '@/lib/migration/runner'

// Run migrations
const result = await runAllMigrations()
console.log(`Executed: ${result.executed.length}, Failed: ${result.failed.length}`)

// Check status
const status = await getMigrationStatus()
console.log(`Pending: ${status.pending.length}`)

// Example 2: Create migration programmatically
import { createMigration } from '@/lib/migration/generator'

const filename = createMigration({
  name: 'Add audit log indexes',
  type: 'index',
  description: 'Add indexes for faster audit log queries'
})

// Example 3: Batch data update
import { batchUpdate } from '@/lib/migration/transformers'

const updates = users.map(u => ({
  id: u.id,
  data: { updatedAt: new Date() }
}))

const result = await batchUpdate('User', updates, {
  batchSize: 50,
  onProgress: (done, total) => console.log(`${done}/${total}`)
})

// Example 4: Find and merge duplicates
import { findDuplicates, mergeDuplicates } from '@/lib/migration/transformers'

const duplicates = await findDuplicates('User', ['email'])
for (const dup of duplicates) {
  // Keep the oldest record
  const keepId = Math.min(...dup.ids)
  await mergeDuplicates('User', dup.ids, keepId, [
    { table: 'Request', column: 'userId' },
    { table: 'Notification', column: 'userId' }
  ])
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
