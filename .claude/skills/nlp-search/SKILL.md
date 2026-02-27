---
name: nlp-search
description: Natural language processing search for HR-IMS with intent recognition
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["nlp", "natural language", "intent", "semantic search", "query parsing"]
  file_patterns: ["*nlp*", "*intent*", "*semantic*"]
  context: NLP search, intent recognition, natural language queries
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# NLP Search

## Core Role

Implement natural language processing search:
- Intent recognition
- Query parsing
- Semantic search
- Contextual results

---

## NLP Search Service

```typescript
// lib/nlp/service.ts
import prisma from '@/lib/prisma'

export interface SearchIntent {
  type: 'SEARCH_ITEMS' | 'SEARCH_USERS' | 'SEARCH_REQUESTS' | 'STATS' | 'ACTION' | 'UNKNOWN'
  entities: Entity[]
  filters: SearchFilter[]
  confidence: number
}

export interface Entity {
  type: 'ITEM' | 'USER' | 'CATEGORY' | 'DATE' | 'STATUS' | 'QUANTITY' | 'WAREHOUSE'
  value: string
  normalized: any
}

export interface SearchFilter {
  field: string
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in'
  value: any
}

export interface ParsedQuery {
  original: string
  normalized: string
  intent: SearchIntent
  tokens: string[]
}

// Intent patterns
const INTENT_PATTERNS: Array<{
  type: SearchIntent['type']
  patterns: RegExp[]
  keywords: string[]
}> = [
  {
    type: 'SEARCH_ITEMS',
    patterns: [
      /^(find|search|show|get|list|display)\s+(all\s+)?(items?|inventory|products?|assets?)/i,
      /(items?|inventory|products?|assets?)\s+(with|having|containing|named?)/i,
      /^(what|which)\s+(items?|inventory)/i
    ],
    keywords: ['item', 'items', 'inventory', 'product', 'products', 'asset', 'assets', 'พัสดุ', 'ครุภัณฑ์']
  },
  {
    type: 'SEARCH_USERS',
    patterns: [
      /^(find|search|show|get|list|display)\s+(all\s+)?(users?|employees?|staff)/i,
      /(users?|employees?)\s+(named?|with|in)/i,
      /^(who|which)\s+(is|are)\s+(the\s+)?(users?|employees?)/i
    ],
    keywords: ['user', 'users', 'employee', 'employees', 'staff', 'ผู้ใช้', 'พนักงาน']
  },
  {
    type: 'SEARCH_REQUESTS',
    patterns: [
      /^(find|search|show|get|list|display)\s+(all\s+)?(requests?|orders?|requisitions?)/i,
      /(requests?|orders?)\s+(by|from|for|with|status)/i,
      /^(my|pending|approved|rejected)\s+(requests?|orders?)/i
    ],
    keywords: ['request', 'requests', 'order', 'orders', 'requisition', 'คำขอ', 'การเบิก']
  },
  {
    type: 'STATS',
    patterns: [
      /^(how many|count|total|number of|sum)/i,
      /(statistics|stats|summary|overview|dashboard)/i,
      /^(what is the|show\s+(me\s+)?(the\s+)?(total|count|average))/i
    ],
    keywords: ['how many', 'count', 'total', 'statistics', 'stats', 'summary', 'กี่', 'จำนวน', 'รวม']
  },
  {
    type: 'ACTION',
    patterns: [
      /^(create|add|new|delete|remove|update|edit|modify|approve|reject)/i,
      /^(i want to|i need to|please)\s+(create|add|delete|update|approve)/i
    ],
    keywords: ['create', 'add', 'delete', 'update', 'edit', 'approve', 'reject', 'สร้าง', 'เพิ่ม', 'ลบ', 'แก้ไข', 'อนุมัติ']
  }
]

// Entity patterns
const ENTITY_PATTERNS: Array<{
  type: Entity['type']
  patterns: RegExp[]
  extractors: Array<(match: RegExpMatchArray) => { value: string; normalized: any }>
}> = [
  {
    type: 'STATUS',
    patterns: [
      /\b(pending|approved|rejected|completed|cancelled)\b/i,
      /\b(รอดำเนินการ|อนุมัติแล้ว|ปฏิเสธ|เสร็จสิ้น|ยกเลิก)\b/
    ],
    extractors: [
      (match) => ({
        value: match[0],
        normalized: normalizeStatus(match[0])
      })
    ]
  },
  {
    type: 'DATE',
    patterns: [
      /\b(today|yesterday|tomorrow)\b/i,
      /\b(last|next|this)\s+(week|month|year)\b/i,
      /\b(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{2,4}))?\b/,
      /\b(วันนี้|เมื่อวาน|พรุ่งนี้|สัปดาห์ที่แล้ว|เดือนนี้)\b/
    ],
    extractors: [
      (match) => ({
        value: match[0],
        normalized: normalizeDate(match[0])
      })
    ]
  },
  {
    type: 'QUANTITY',
    patterns: [
      /\b(\d+)\s*(items?|pieces?|units?|pcs)\b/i,
      /\b(more than|less than|at least|at most|over|under)\s*(\d+)\b/i,
      /\b(\d+)\s*(ชิ้น|อัน|หน่วย)\b/
    ],
    extractors: [
      (match) => ({
        value: match[0],
        normalized: { quantity: parseInt(match[1] || match[2]), operator: 'equals' }
      })
    ]
  },
  {
    type: 'CATEGORY',
    patterns: [
      /\b(electronics?|office supplies?|furniture|tools?|safety|cleaning)\b/i,
      /\b(category|categories?|type|types?)\s*[:=]?\s*(\w+)\b/i
    ],
    extractors: [
      (match) => ({
        value: match[0],
        normalized: match[2] || match[1]
      })
    ]
  },
  {
    type: 'WAREHOUSE',
    patterns: [
      /\b(warehouse|warehouse|building|location)\s*[:=]?\s*(\w+)\b/i,
      /\b(in|at)\s+(warehouse|building)\s+(\w+)\b/i
    ],
    extractors: [
      (match) => ({
        value: match[0],
        normalized: match[match.length - 1]
      })
    ]
  }
]

// Parse natural language query
export function parseQuery(query: string): ParsedQuery {
  const normalized = normalizeQuery(query)
  const tokens = tokenize(normalized)
  const intent = detectIntent(normalized, tokens)

  return {
    original: query,
    normalized,
    intent,
    tokens
  }
}

// Normalize query
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\w\s\u0E00-\u0E7F-]/g, ' ') // Keep Thai characters
    .replace(/\s+/g, ' ')
    .trim()
}

// Tokenize query
function tokenize(query: string): string[] {
  return query.split(/\s+/).filter(t => t.length > 0)
}

// Detect intent
function detectIntent(normalized: string, tokens: string[]): SearchIntent {
  let bestMatch: SearchIntent = {
    type: 'UNKNOWN',
    entities: [],
    filters: [],
    confidence: 0
  }

  for (const intentConfig of INTENT_PATTERNS) {
    // Check patterns
    for (const pattern of intentConfig.patterns) {
      if (pattern.test(normalized)) {
        const entities = extractEntities(normalized)
        const filters = buildFilters(entities)

        return {
          type: intentConfig.type,
          entities,
          filters,
          confidence: 0.9
        }
      }
    }

    // Check keywords
    const matchingKeywords = tokens.filter(t =>
      intentConfig.keywords.some(k => t.includes(k.toLowerCase()))
    )

    if (matchingKeywords.length > 0) {
      const confidence = Math.min(0.8, 0.4 + (matchingKeywords.length * 0.2))

      if (confidence > bestMatch.confidence) {
        const entities = extractEntities(normalized)
        const filters = buildFilters(entities)

        bestMatch = {
          type: intentConfig.type,
          entities,
          filters,
          confidence
        }
      }
    }
  }

  // Default to search items
  if (bestMatch.confidence < 0.3) {
    const entities = extractEntities(normalized)
    return {
      type: 'SEARCH_ITEMS',
      entities,
      filters: buildFilters(entities),
      confidence: 0.5
    }
  }

  return bestMatch
}

// Extract entities
function extractEntities(normalized: string): Entity[] {
  const entities: Entity[] = []

  for (const entityConfig of ENTITY_PATTERNS) {
    for (const pattern of entityConfig.patterns) {
      const match = normalized.match(pattern)
      if (match) {
        for (const extractor of entityConfig.extractors) {
          const result = extractor(match)
          entities.push({
            type: entityConfig.type,
            value: result.value,
            normalized: result.normalized
          })
        }
      }
    }
  }

  return entities
}

// Build filters from entities
function buildFilters(entities: Entity[]): SearchFilter[] {
  const filters: SearchFilter[] = []

  for (const entity of entities) {
    switch (entity.type) {
      case 'STATUS':
        filters.push({
          field: 'status',
          operator: 'equals',
          value: entity.normalized
        })
        break

      case 'CATEGORY':
        filters.push({
          field: 'category.name',
          operator: 'contains',
          value: entity.normalized
        })
        break

      case 'WAREHOUSE':
        filters.push({
          field: 'warehouse.name',
          operator: 'contains',
          value: entity.normalized
        })
        break

      case 'DATE':
        if (entity.normalized.start && entity.normalized.end) {
          filters.push({
            field: 'createdAt',
            operator: 'gte',
            value: entity.normalized.start
          })
          filters.push({
            field: 'createdAt',
            operator: 'lte',
            value: entity.normalized.end
          })
        }
        break
    }
  }

  return filters
}

// Normalize status
function normalizeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'PENDING',
    'รอดำเนินการ': 'PENDING',
    'approved': 'APPROVED',
    'อนุมัติแล้ว': 'APPROVED',
    'rejected': 'REJECTED',
    'ปฏิเสธ': 'REJECTED',
    'completed': 'COMPLETED',
    'เสร็จสิ้น': 'COMPLETED',
    'cancelled': 'CANCELLED',
    'ยกเลิก': 'CANCELLED'
  }

  return statusMap[status.toLowerCase()] || status.toUpperCase()
}

// Normalize date
function normalizeDate(dateStr: string): { start: Date; end: Date } | null {
  const now = new Date()
  const lower = dateStr.toLowerCase()

  if (lower === 'today' || lower === 'วันนี้') {
    return {
      start: new Date(now.setHours(0, 0, 0, 0)),
      end: new Date(now.setHours(23, 59, 59, 999))
    }
  }

  if (lower === 'yesterday' || lower === 'เมื่อวาน') {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return {
      start: new Date(yesterday.setHours(0, 0, 0, 0)),
      end: new Date(yesterday.setHours(23, 59, 59, 999))
    }
  }

  if (lower === 'this week' || lower === 'สัปดาห์นี้') {
    const start = new Date(now)
    start.setDate(start.getDate() - start.getDay())
    start.setHours(0, 0, 0, 0)
    return { start, end: now }
  }

  if (lower === 'this month' || lower === 'เดือนนี้') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start, end: now }
  }

  if (lower === 'last month' || lower === 'เดือนที่แล้ว') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { start, end }
  }

  return null
}

// Execute NLP search
export async function executeNLPSearch(
  query: string,
  userId: number
): Promise<{
  intent: SearchIntent
  results: any[]
  suggestions: string[]
}> {
  const parsed = parseQuery(query)
  let results: any[] = []
  let suggestions: string[] = []

  switch (parsed.intent.type) {
    case 'SEARCH_ITEMS':
      results = await searchItems(parsed)
      suggestions = generateItemSuggestions(parsed)
      break

    case 'SEARCH_USERS':
      results = await searchUsers(parsed)
      suggestions = generateUserSuggestions(parsed)
      break

    case 'SEARCH_REQUESTS':
      results = await searchRequests(parsed, userId)
      suggestions = generateRequestSuggestions(parsed)
      break

    case 'STATS':
      results = await getStats(parsed)
      suggestions = ['Show more details', 'Export data', 'View trends']
      break

    case 'ACTION':
      results = await suggestActions(parsed)
      suggestions = ['Confirm action', 'View affected items']
      break

    default:
      // Fallback to item search
      results = await searchItems(parsed)
  }

  return {
    intent: parsed.intent,
    results,
    suggestions
  }
}

// Search items
async function searchItems(parsed: ParsedQuery): Promise<any[]> {
  const where: any = {}

  // Apply filters
  for (const filter of parsed.intent.filters) {
    if (filter.field === 'category.name') {
      where.category = { name: { contains: filter.value } }
    } else if (filter.field === 'status') {
      where.status = filter.value
    }
  }

  // Search by name if no specific filters
  const searchTerms = parsed.tokens.filter(t =>
    !['item', 'items', 'inventory', 'find', 'search', 'show', 'พัสดุ'].includes(t)
  )

  if (searchTerms.length > 0) {
    where.OR = searchTerms.map(term => ({
      OR: [
        { name: { contains: term } },
        { description: { contains: term } },
        { serialNumber: { contains: term } }
      ]
    }))
  }

  return prisma.inventoryItem.findMany({
    where,
    include: {
      category: { select: { name: true } },
      stockLevels: {
        include: { warehouse: { select: { name: true } } },
        take: 1
      }
    },
    take: 20
  })
}

// Search users
async function searchUsers(parsed: ParsedQuery): Promise<any[]> {
  const searchTerms = parsed.tokens.filter(t =>
    !['user', 'users', 'employee', 'employees', 'find', 'search', 'ผู้ใช้'].includes(t)
  )

  const where: any = { status: 'ACTIVE' }

  if (searchTerms.length > 0) {
    where.OR = searchTerms.map(term => ({
      OR: [
        { name: { contains: term } },
        { email: { contains: term } }
      ]
    }))
  }

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      department: { select: { name: true } }
    },
    take: 20
  })
}

// Search requests
async function searchRequests(parsed: ParsedQuery, userId: number): Promise<any[]> {
  const where: any = {}

  // Apply filters
  for (const filter of parsed.intent.filters) {
    if (filter.field === 'status') {
      where.status = filter.value
    } else if (filter.field === 'createdAt') {
      if (!where.createdAt) where.createdAt = {}
      if (filter.operator === 'gte') {
        where.createdAt.gte = filter.value
      } else if (filter.operator === 'lte') {
        where.createdAt.lte = filter.value
      }
    }
  }

  // Check for "my" keyword
  if (parsed.normalized.includes('my ') || parsed.normalized.includes('ของฉัน')) {
    where.userId = userId
  }

  return prisma.request.findMany({
    where,
    include: {
      user: { select: { name: true } },
      items: {
        include: {
          item: { select: { name: true } }
        },
        take: 5
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })
}

// Get statistics
async function getStats(parsed: ParsedQuery): Promise<any[]> {
  const stats: any[] = []

  // Check what kind of stats
  if (parsed.normalized.includes('item') || parsed.normalized.includes('พัสดุ')) {
    const total = await prisma.inventoryItem.count()
    const inStock = await prisma.inventoryItem.count({
      where: { stockLevels: { some: { quantity: { gt: 0 } } } }
    })

    stats.push({
      type: 'stat',
      label: 'Total Items',
      value: total,
      detail: `${inStock} in stock`
    })
  }

  if (parsed.normalized.includes('request') || parsed.normalized.includes('คำขอ')) {
    const total = await prisma.request.count()
    const pending = await prisma.request.count({ where: { status: 'PENDING' } })
    const approved = await prisma.request.count({ where: { status: 'APPROVED' } })

    stats.push({
      type: 'stat',
      label: 'Total Requests',
      value: total,
      detail: `${pending} pending, ${approved} approved`
    })
  }

  if (parsed.normalized.includes('user') || parsed.normalized.includes('ผู้ใช้')) {
    const total = await prisma.user.count({ where: { status: 'ACTIVE' } })

    stats.push({
      type: 'stat',
      label: 'Active Users',
      value: total
    })
  }

  return stats
}

// Suggest actions
async function suggestActions(parsed: ParsedQuery): Promise<any[]> {
  const actions: any[] = []
  const normalized = parsed.normalized

  if (normalized.includes('create') || normalized.includes('add') || normalized.includes('สร้าง')) {
    if (normalized.includes('item') || normalized.includes('พัสดุ')) {
      actions.push({
        type: 'action',
        label: 'Create New Item',
        path: '/inventory/new'
      })
    }
    if (normalized.includes('request') || normalized.includes('คำขอ')) {
      actions.push({
        type: 'action',
        label: 'Create New Request',
        path: '/cart'
      })
    }
  }

  if (normalized.includes('approve') || normalized.includes('อนุมัติ')) {
    actions.push({
      type: 'action',
      label: 'View Pending Approvals',
      path: '/requests?tab=approvals'
    })
  }

  return actions
}

// Generate suggestions
function generateItemSuggestions(parsed: ParsedQuery): string[] {
  const suggestions = [
    'Show low stock items',
    'Items by category',
    'Recently added items',
    'Export item list'
  ]

  if (parsed.intent.filters.length > 0) {
    suggestions.unshift('Clear filters')
  }

  return suggestions
}

function generateUserSuggestions(parsed: ParsedQuery): string[] {
  return [
    'Users by department',
    'Recently active users',
    'Users with pending requests'
  ]
}

function generateRequestSuggestions(parsed: ParsedQuery): string[] {
  return [
    'My pending requests',
    'Requests awaiting approval',
    'Request statistics',
    'Export requests'
  ]
}
```

---

## NLP Search Component

```typescript
// components/nlp/nlp-search.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useDebounce } from '@/hooks/use-debounce'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  Sparkles,
  Package,
  User,
  FileText,
  BarChart3,
  ArrowRight,
  Loader2,
  X
} from 'lucide-react'
import { parseQuery, executeNLPSearch } from '@/lib/nlp/service'
import { useRouter } from 'next/navigation'

interface NLPSearchProps {
  userId: number
  className?: string
  onResultClick?: (result: any) => void
}

export function NLPSearch({ userId, className, onResultClick }: NLPSearchProps) {
  const { locale } = useI18n()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(query, 300)

  const { data: searchResult, isLoading } = useQuery({
    queryKey: ['nlp-search', debouncedQuery, userId],
    queryFn: () => executeNLPSearch(debouncedQuery, userId),
    enabled: debouncedQuery.length >= 3
  })

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getIntentIcon = (type: string) => {
    switch (type) {
      case 'SEARCH_ITEMS':
        return <Package className="h-4 w-4" />
      case 'SEARCH_USERS':
        return <User className="h-4 w-4" />
      case 'SEARCH_REQUESTS':
        return <FileText className="h-4 w-4" />
      case 'STATS':
        return <BarChart3 className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getIntentLabel = (type: string) => {
    const labels: Record<string, { en: string; th: string }> = {
      SEARCH_ITEMS: { en: 'Searching items', th: 'ค้นหาพัสดุ' },
      SEARCH_USERS: { en: 'Searching users', th: 'ค้นหาผู้ใช้' },
      SEARCH_REQUESTS: { en: 'Searching requests', th: 'ค้นหาคำขอ' },
      STATS: { en: 'Getting statistics', th: 'ดึงข้อมูลสถิติ' },
      ACTION: { en: 'Suggested actions', th: 'การดำเนินการที่แนะนำ' }
    }
    return labels[type] ? (locale === 'th' ? labels[type].th : labels[type].en) : type
  }

  const handleResultClick = (result: any) => {
    if (result.path) {
      router.push(result.path)
    } else if (result.id) {
      onResultClick?.(result)
    }
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={locale === 'th'
            ? 'ค้นหาด้วยภาษาธรรมชาติ... (เช่น "พัสดุที่ใกล้หมด")'
            : 'Search with natural language... (e.g. "items running low")'
          }
          className={cn(
            'w-full h-12 pl-10 pr-10 rounded-lg',
            'bg-muted border border-transparent',
            'focus:outline-none focus:ring-2 focus:ring-primary',
            'placeholder:text-muted-foreground'
          )}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && searchResult && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 overflow-hidden">
          {/* Intent Badge */}
          <div className="p-3 border-b bg-muted/50">
            <div className="flex items-center gap-2">
              {getIntentIcon(searchResult.intent.type)}
              <span className="text-sm font-medium">
                {getIntentLabel(searchResult.intent.type)}
              </span>
              <Badge variant="outline" className="ml-auto">
                {Math.round(searchResult.intent.confidence * 100)}%
              </Badge>
            </div>

            {/* Filters */}
            {searchResult.intent.filters.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {searchResult.intent.filters.map((filter, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {filter.field}: {filter.value}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Results */}
          {searchResult.results.length > 0 ? (
            <ScrollArea className="max-h-80">
              <div className="p-2">
                {searchResult.results.map((result: any, index: number) => (
                  <button
                    key={result.id || index}
                    onClick={() => handleResultClick(result)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="p-2 bg-muted rounded">
                      {getIntentIcon(searchResult.intent.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {result.name || result.label || result.type}
                      </p>
                      {result.detail && (
                        <p className="text-sm text-muted-foreground truncate">
                          {result.detail}
                        </p>
                      )}
                      {result.email && (
                        <p className="text-sm text-muted-foreground">
                          {result.email}
                        </p>
                      )}
                      {result.value !== undefined && (
                        <p className="text-lg font-bold">{result.value}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {locale === 'th' ? 'ไม่พบผลลัพธ์' : 'No results found'}
            </div>
          )}

          {/* Suggestions */}
          {searchResult.suggestions.length > 0 && (
            <div className="p-3 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground mb-2">
                {locale === 'th' ? 'คำแนะนำ' : 'Suggestions'}
              </p>
              <div className="flex flex-wrap gap-2">
                {searchResult.suggestions.map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: NLP search in header
import { NLPSearch } from '@/components/nlp/nlp-search'

function Header() {
  const session = useSession()

  return (
    <header className="flex items-center gap-4 p-4">
      <NLPSearch
        userId={parseInt(session.user.id)}
        className="flex-1 max-w-xl"
        onResultClick={(result) => {
          // Handle result click
          router.push(`/inventory/${result.id}`)
        }}
      />
    </header>
  )
}

// Example 2: Parse and execute custom query
import { parseQuery, executeNLPSearch } from '@/lib/nlp/service'

async function handleVoiceCommand(voiceText: string, userId: number) {
  const parsed = parseQuery(voiceText)

  console.log('Intent:', parsed.intent.type)
  console.log('Confidence:', parsed.intent.confidence)
  console.log('Entities:', parsed.intent.entities)

  const result = await executeNLPSearch(voiceText, userId)

  return result
}

// Example 3: Chatbot integration
async function processChatMessage(message: string, userId: number) {
  const result = await executeNLPSearch(message, userId)

  switch (result.intent.type) {
    case 'STATS':
      return {
        type: 'stats',
        message: `Found ${result.results.length} statistics`,
        data: result.results
      }

    case 'SEARCH_ITEMS':
      return {
        type: 'items',
        message: `Found ${result.results.length} items`,
        data: result.results
      }

    case 'ACTION':
      return {
        type: 'actions',
        message: 'Here are the available actions',
        data: result.results
      }

    default:
      return {
        type: 'unknown',
        message: 'I didn\'t understand that. Try searching for items, users, or requests.',
        suggestions: result.suggestions
      }
  }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
