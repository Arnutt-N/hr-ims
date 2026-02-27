---
name: query-optimizer
description: Database query optimization and index recommendations for HR-IMS | การเพิ่มประสิทธิภาพการค้นหาฐานข้อมูลและคำแนะนำดัชนีสำหรับ HR-IMS
version: 1.0.0
author: HR-IMS Team
tags: [database, query, optimization, index, performance, prisma]
languages: [en, th]
---

# Query Optimizer / ตัวเพิ่มประสิทธิภาพการค้นหา

Database query optimization and index recommendations for HR-IMS applications.

## Overview / ภาพรวม

**EN**: Comprehensive database query optimization system with automatic analysis, index recommendations, and query pattern detection for improved performance.

**TH**: ระบบเพิ่มประสิทธิภาพการค้นหาฐานข้อมูลที่ครอบคลุมพร้อมการวิเคราะห์อัตโนมัติ คำแนะนำดัชนี และการตรวจจับรูปแบบการค้นหาเพื่อประสิทธิภาพที่ดีขึ้น

## Core Features / คุณสมบัติหลัก

### 1. Query Analyzer / ตัววิเคราะห์การค้นหา

```typescript
// lib/optimization/query-analyzer.ts
import { Prisma } from '@prisma/client'

interface QueryAnalysis {
  query: string
  duration: number
  tables: string[]
  indexes: string[]
  suggestions: QuerySuggestion[]
  severity: 'low' | 'medium' | 'high'
}

interface QuerySuggestion {
  type: 'index' | 'rewrite' | 'cache' | 'pagination'
  message: string
  messageTh: string
  impact: 'low' | 'medium' | 'high'
  sql?: string
}

class QueryAnalyzer {
  private slowQueryLog: QueryAnalysis[] = []
  private readonly SLOW_QUERY_THRESHOLD = 200 // ms

  // Analyze a query / วิเคราะห์การค้นหา
  analyze(query: string, duration: number, params?: unknown): QueryAnalysis {
    const tables = this.extractTables(query)
    const suggestions = this.generateSuggestions(query, duration, params)
    const severity = this.determineSeverity(duration)

    const analysis: QueryAnalysis = {
      query,
      duration,
      tables,
      indexes: [], // Would be populated from schema analysis
      suggestions,
      severity,
    }

    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.slowQueryLog.push(analysis)
    }

    return analysis
  }

  // Extract table names from query / ดึงชื่อตารางจากการค้นหา
  private extractTables(query: string): string[] {
    const tablePatterns = [
      /FROM\s+(\w+)/gi,
      /JOIN\s+(\w+)/gi,
      /INTO\s+(\w+)/gi,
      /UPDATE\s+(\w+)/gi,
    ]

    const tables = new Set<string>()
    tablePatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(query)) !== null) {
        tables.add(match[1])
      }
    })

    return Array.from(tables)
  }

  // Generate optimization suggestions / สร้างคำแนะนำการเพิ่มประสิทธิภาพ
  private generateSuggestions(
    query: string,
    duration: number,
    params?: unknown
  ): QuerySuggestion[] {
    const suggestions: QuerySuggestion[] = []

    // Check for missing WHERE clause on large tables / ตรวจสอบ WHERE clause ที่ขาดหายไป
    if (!query.toUpperCase().includes('WHERE') && this.isLargeTable(query)) {
      suggestions.push({
        type: 'rewrite',
        message: 'Consider adding WHERE clause to limit result set',
        messageTh: 'ควรเพิ่ม WHERE clause เพื่อจำกัดผลลัพธ์',
        impact: 'high',
      })
    }

    // Check for SELECT * / ตรวจสอบ SELECT *
    if (query.toUpperCase().includes('SELECT *')) {
      suggestions.push({
        type: 'rewrite',
        message: 'Avoid SELECT * - specify only needed columns',
        messageTh: 'หลีกเลี่ยง SELECT * - ระบุเฉพาะคอลัมน์ที่ต้องการ',
        impact: 'medium',
      })
    }

    // Check for missing LIMIT / ตรวจสอบ LIMIT ที่ขาดหายไป
    if (!query.toUpperCase().includes('LIMIT') && !query.toUpperCase().includes('OFFSET')) {
      suggestions.push({
        type: 'pagination',
        message: 'Add LIMIT for pagination to reduce data transfer',
        messageTh: 'เพิ่ม LIMIT สำหรับการแบ่งหน้าเพื่อลดการถ่ายโอนข้อมูล',
        impact: 'medium',
      })
    }

    // Check for N+1 query patterns / ตรวจสอบรูปแบบการค้นหา N+1
    if (duration > 100 && this.mightBeNPlusOne(query)) {
      suggestions.push({
        type: 'rewrite',
        message: 'Possible N+1 query - consider using JOIN or batch loading',
        messageTh: 'อาจเป็นการค้นหา N+1 - พิจารณาใช้ JOIN หรือ batch loading',
        impact: 'high',
      })
    }

    // Check for caching opportunity / ตรวจสอบโอกาสในการใช้ cache
    if (this.isCacheable(query)) {
      suggestions.push({
        type: 'cache',
        message: 'This query result could be cached',
        messageTh: 'ผลลัพธ์การค้นหานี้สามารถแคชได้',
        impact: 'medium',
      })
    }

    return suggestions
  }

  private isLargeTable(query: string): boolean {
    const largeTables = ['InventoryItem', 'AuditLog', 'Request', 'User']
    return largeTables.some(table =>
      query.toLowerCase().includes(table.toLowerCase())
    )
  }

  private mightBeNPlusOne(query: string): boolean {
    // Simple heuristic - queries with subqueries or multiple SELECTs
    const subqueryCount = (query.match(/\(SELECT/gi) || []).length
    return subqueryCount > 0
  }

  private isCacheable(query: string): boolean {
    const upperQuery = query.toUpperCase()
    return (
      upperQuery.startsWith('SELECT') &&
      !upperQuery.includes('NOW()') &&
      !upperQuery.includes('CURRENT_TIMESTAMP')
    )
  }

  private determineSeverity(duration: number): 'low' | 'medium' | 'high' {
    if (duration > 500) return 'high'
    if (duration > 200) return 'medium'
    return 'low'
  }

  // Get slow query report / รับรายงานการค้นหาที่ช้า
  getSlowQueryReport(): QueryAnalysis[] {
    return [...this.slowQueryLog].sort((a, b) => b.duration - a.duration)
  }
}

export const queryAnalyzer = new QueryAnalyzer()
```

### 2. Index Recommender / ตัวแนะนำดัชนี

```typescript
// lib/optimization/index-recommender.ts
interface IndexRecommendation {
  table: string
  columns: string[]
  type: 'single' | 'composite' | 'unique'
  reason: string
  reasonTh: string
  estimatedImpact: 'low' | 'medium' | 'high'
  prismaSchema: string
}

class IndexRecommender {
  // Analyze query patterns and recommend indexes / วิเคราะห์รูปแบบการค้นหาและแนะนำดัชนี
  analyzeAndRecommend(
    queries: Array<{ query: string; frequency: number; avgDuration: number }>
  ): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = []
    const columnUsage = this.analyzeColumnUsage(queries)

    for (const [table, columns] of Object.entries(columnUsage)) {
      const sortedColumns = columns.sort((a, b) => b.frequency - a.frequency)

      // Recommend index for frequently queried columns / แนะนำดัชนีสำหรับคอลัมน์ที่ค้นหาบ่อย
      sortedColumns.forEach(col => {
        if (col.frequency > 10 && col.avgDuration > 100) {
          recommendations.push({
            table,
            columns: [col.name],
            type: col.isUnique ? 'unique' : 'single',
            reason: `Column "${col.name}" is queried ${col.frequency} times with avg duration ${col.avgDuration.toFixed(0)}ms`,
            reasonTh: `คอลัมน์ "${col.name}" ถูกค้นหา ${col.frequency} ครั้ง โดยใช้เวลาเฉลี่ย ${col.avgDuration.toFixed(0)}ms`,
            estimatedImpact: col.avgDuration > 300 ? 'high' : 'medium',
            prismaSchema: `@@index([${col.name}])`,
          })
        }
      })

      // Recommend composite index for commonly combined columns / แนะนำ composite index สำหรับคอลัมน์ที่ใช้ร่วมกันบ่อย
      const commonCombinations = this.findCommonCombinations(table, queries)
      commonCombinations.forEach(combo => {
        if (combo.frequency > 5) {
          recommendations.push({
            table,
            columns: combo.columns,
            type: 'composite',
            reason: `Columns ${combo.columns.join(', ')} are often queried together (${combo.frequency} times)`,
            reasonTh: `คอลัมน์ ${combo.columns.join(', ')} มักถูกค้นหาพร้อมกัน (${combo.frequency} ครั้ง)`,
            estimatedImpact: 'high',
            prismaSchema: `@@index([${combo.columns.join(', ')}])`,
          })
        }
      })
    }

    return recommendations
  }

  private analyzeColumnUsage(
    queries: Array<{ query: string; frequency: number; avgDuration: number }>
  ): Record<string, Array<{ name: string; frequency: number; avgDuration: number; isUnique: boolean }>> {
    const usage: Record<string, Array<{ name: string; frequency: number; avgDuration: number; isUnique: boolean }>> = {}

    queries.forEach(({ query, frequency, avgDuration }) => {
      const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/i)
      if (whereMatch) {
        const conditions = whereMatch[1].split(/AND|OR/i)
        conditions.forEach(cond => {
          const columnMatch = cond.trim().match(/(\w+)\s*[=<>]/)
          if (columnMatch) {
            const tableName = this.extractTableName(query)
            const columnName = columnMatch[1]

            if (!usage[tableName]) usage[tableName] = []

            const existing = usage[tableName].find(c => c.name === columnName)
            if (existing) {
              existing.frequency += frequency
              existing.avgDuration = (existing.avgDuration + avgDuration) / 2
            } else {
              usage[tableName].push({
                name: columnName,
                frequency,
                avgDuration,
                isUnique: cond.includes('id') || cond.includes('email'),
              })
            }
          }
        })
      }
    })

    return usage
  }

  private extractTableName(query: string): string {
    const fromMatch = query.match(/FROM\s+(\w+)/i)
    return fromMatch ? fromMatch[1] : 'unknown'
  }

  private findCommonCombinations(
    table: string,
    queries: Array<{ query: string; frequency: number; avgDuration: number }>
  ): Array<{ columns: string[]; frequency: number }> {
    const combinations: Map<string, number> = new Map()

    queries.forEach(({ query, frequency }) => {
      if (!query.toLowerCase().includes(table.toLowerCase())) return

      const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/i)
      if (whereMatch) {
        const columns = whereMatch[1]
          .split(/AND|OR/i)
          .map(cond => cond.trim().match(/(\w+)\s*[=<>]/)?.[1])
          .filter(Boolean)
          .sort() as string[]

        if (columns.length >= 2) {
          const key = columns.join(',')
          combinations.set(key, (combinations.get(key) || 0) + frequency)
        }
      }
    })

    return Array.from(combinations.entries())
      .map(([columns, frequency]) => ({
        columns: columns.split(','),
        frequency,
      }))
      .sort((a, b) => b.frequency - a.frequency)
  }
}

export const indexRecommender = new IndexRecommender()
```

### 3. Prisma Query Optimizer / ตัวเพิ่มประสิทธิภาพการค้นหา Prisma

```typescript
// lib/optimization/prisma-optimizer.ts
import { Prisma } from '@prisma/client'

// Optimized pagination helper / ตัวช่วยการแบ่งหน้าที่เพิ่มประสิทธิภาพ
export async function paginateOptimized<T extends Prisma.ModelName>(
  model: T,
  options: {
    page?: number
    pageSize?: number
    where?: Prisma.Args<Prisma.Client, T>['findMany']['where']
    include?: Prisma.Args<Prisma.Client, T>['findMany']['include']
    orderBy?: Prisma.Args<Prisma.Client, T>['findMany']['orderBy']
    select?: Prisma.Args<Prisma.Client, T>['findMany']['select']
  }
) {
  const { page = 1, pageSize = 20, where, include, orderBy, select } = options
  const skip = (page - 1) * pageSize

  // Use Promise.all for parallel execution / ใช้ Promise.all สำหรับการทำงานแบบขนาน
  const [items, total] = await Promise.all([
    prisma[model].findMany({
      where,
      skip,
      take: pageSize,
      include,
      orderBy,
      select,
    }),
    prisma[model].count({ where }),
  ])

  const totalPages = Math.ceil(total / pageSize)

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

// Batch loader to prevent N+1 / ตัวโหลดแบบกลุ่มเพื่อป้องกัน N+1
export class BatchLoader<T, R> {
  private batch: Map<string, { item: T; resolve: (value: R) => void }> = new Map()
  private timer: NodeJS.Timeout | null = null
  private readonly batchSize: number
  private readonly delay: number
  private loader: (items: T[]) => Promise<R[]>

  constructor(
    loader: (items: T[]) => Promise<R[]>,
    options: { batchSize?: number; delay?: number } = {}
  ) {
    this.loader = loader
    this.batchSize = options.batchSize || 100
    this.delay = options.delay || 10
  }

  async load(item: T, key: string): Promise<R> {
    return new Promise(resolve => {
      this.batch.set(key, { item, resolve })

      if (this.batch.size >= this.batchSize) {
        this.execute()
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.execute(), this.delay)
      }
    })
  }

  private async execute(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }

    const batch = Array.from(this.batch.entries())
    this.batch.clear()

    if (batch.length === 0) return

    try {
      const items = batch.map(([_, { item }]) => item)
      const results = await this.loader(items)

      batch.forEach(([key, { resolve }], index) => {
        resolve(results[index])
      })
    } catch (error) {
      batch.forEach(([_, { resolve }]) => {
        resolve(null as R)
      })
    }
  }
}

// Query result cache / แคชผลลัพธ์การค้นหา
export class QueryCache<T> {
  private cache: Map<string, { data: T; expiry: number }> = new Map()
  private readonly ttl: number

  constructor(ttlMs: number = 60000) {
    this.ttl = ttlMs
  }

  async get(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key)
    if (cached && cached.expiry > Date.now()) {
      return cached.data
    }

    const data = await loader()
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl,
    })

    return data
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}
```

### 4. Query Builder with Optimization / ตัวสร้างการค้นหาพร้อมการเพิ่มประสิทธิภาพ

```typescript
// lib/optimization/query-builder.ts
import { Prisma } from '@prisma/client'

interface OptimizedQueryOptions {
  useCache?: boolean
  cacheTTL?: number
  usePagination?: boolean
  pageSize?: number
  selectFields?: string[]
  includeRelations?: string[]
}

class OptimizedQueryBuilder {
  private cache = new QueryCache<unknown>()

  // Build optimized inventory query / สร้างการค้นหาสินค้าคงคลังที่เพิ่มประสิทธิภาพ
  buildInventoryQuery(options: OptimizedQueryOptions = {}) {
    const {
      selectFields,
      includeRelations,
      usePagination = true,
      pageSize = 20,
    } = options

    // Select only needed fields / เลือกเฉพาะฟิลด์ที่ต้องการ
    const select = selectFields
      ? this.buildSelect(selectFields)
      : undefined

    // Include relations efficiently / รวมความสัมพันธ์อย่างมีประสิทธิภาพ
    const include = includeRelations
      ? this.buildInclude(includeRelations)
      : undefined

    return {
      select,
      include,
      ...(usePagination && { take: pageSize }),
    }
  }

  private buildSelect(fields: string[]): Record<string, boolean> {
    return fields.reduce((acc, field) => {
      acc[field] = true
      return acc
    }, {} as Record<string, boolean>)
  }

  private buildInclude(relations: string[]): Record<string, boolean> {
    return relations.reduce((acc, relation) => {
      acc[relation] = true
      return acc
    }, {} as Record<string, boolean>)
  }

  // Optimized search with full-text / การค้นหาที่เพิ่มประสิทธิภาพด้วย full-text
  buildSearchQuery(searchTerm: string, fields: string[]) {
    if (!searchTerm) return {}

    // Use contains for each field / ใช้ contains สำหรับแต่ละฟิลด์
    return {
      OR: fields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      })),
    }
  }

  // Date range filter / ตัวกรองช่วงวันที่
  buildDateRangeFilter(field: string, from?: Date, to?: Date) {
    const dateFilter: Record<string, Date> = {}

    if (from) dateFilter.gte = from
    if (to) dateFilter.lte = to

    return Object.keys(dateFilter).length > 0 ? { [field]: dateFilter } : {}
  }
}

export const queryBuilder = new OptimizedQueryBuilder()
```

### 5. Prisma Schema Index Examples / ตัวอย่างดัชนี Prisma Schema

```prisma
// prisma/schema.prisma - Recommended indexes / ดัชนีที่แนะนำ

model InventoryItem {
  id          Int       @id @default(autoincrement())
  name        String
  sku         String    @unique
  categoryId  Int
  warehouseId Int
  status      String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  category    Category  @relation(fields: [categoryId], references: [id])
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])

  // Single column indexes / ดัชนีคอลัมน์เดียว
  @@index([sku])           // Fast SKU lookup
  @@index([status])        // Filter by status
  @@index([createdAt])     // Date-based queries

  // Composite indexes for common queries / ดัชนีผสมสำหรับการค้นหาทั่วไป
  @@index([categoryId, status])      // Category + status filter
  @@index([warehouseId, status])     // Warehouse + status filter
  @@index([warehouseId, categoryId]) // Warehouse + category filter

  // Full-text search index (PostgreSQL) / ดัชนีค้นหาแบบเต็ม (PostgreSQL)
  // @@index([name], type: Gin) // Requires pg_trgm extension
}

model Request {
  id          Int       @id @default(autoincrement())
  userId      Int
  status      String
  type        String
  createdAt   DateTime  @default(now())

  user        User      @relation(fields: [userId], references: [id])

  // Indexes for request queries / ดัชนีสำหรับการค้นหาคำขอ
  @@index([userId, status])      // User's requests by status
  @@index([status, createdAt])   // Admin dashboard queries
  @@index([type, status])        // Filter by type and status
  @@index([createdAt])           // Date-based queries
}

model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int
  action    String
  tableName String
  createdAt DateTime @default(now())

  // Indexes for audit queries / ดัชนีสำหรับการค้นหา audit
  @@index([userId, createdAt])
  @@index([tableName, createdAt])
  @@index([action, createdAt])
  @@index([createdAt])
}
```

## Usage Examples / ตัวอย่างการใช้งาน

### Optimized List Query / การค้นหารายการที่เพิ่มประสิทธิภาพ

```typescript
// lib/actions/inventory.ts
import { paginateOptimized } from '@/lib/optimization/prisma-optimizer'
import { queryBuilder } from '@/lib/optimization/query-builder'

export async function getInventoryItems(options: {
  page?: number
  search?: string
  categoryId?: number
  warehouseId?: number
  status?: string
}) {
  const { page = 1, search, categoryId, warehouseId, status } = options

  // Build where clause / สร้าง where clause
  const where = {
    ...queryBuilder.buildSearchQuery(search, ['name', 'sku']),
    ...(categoryId && { categoryId }),
    ...(warehouseId && { warehouseId }),
    ...(status && { status }),
  }

  // Use optimized pagination / ใช้การแบ่งหน้าที่เพิ่มประสิทธิภาพ
  return paginateOptimized('inventoryItem', {
    page,
    pageSize: 20,
    where,
    include: {
      category: { select: { id: true, name: true } },
      warehouse: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
```

## Best Practices / แนวทางปฏิบัติ

1. **Use Select Sparingly**: Only fetch fields you need
   - **ใช้ Select อย่างระมัดระวัง**: ดึงเฉพาะฟิลด์ที่ต้องการ

2. **Batch Related Queries**: Use Promise.all for parallel execution
   - **รวมการค้นหาที่เกี่ยวข้อง**: ใช้ Promise.all สำหรับการทำงานแบบขนาน

3. **Index Strategically**: Create indexes based on query patterns
   - **สร้างดัชนีอย่างยุทธศาสตร์**: สร้างดัชนีตามรูปแบบการค้นหา

4. **Monitor Query Performance**: Use query analyzer regularly
   - **ติดตามประสิทธิภาพการค้นหา**: ใช้ query analyzer อย่างสม่ำเสมอ

## Related Skills / Skills ที่เกี่ยวข้อง

- `performance-monitor` - Performance monitoring
- `caching-optimizer` - Caching strategies
- `prisma-helper` - Prisma ORM patterns
