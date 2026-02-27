---
name: auto-categorization
description: Automatic categorization and tagging using pattern recognition for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["categorize", "auto tag", "classify", "auto category", "tagging"]
  file_patterns: ["*categorize*", "*classify*", "*tagging*"]
  context: auto categorization, classification, tagging, pattern recognition
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# Auto Categorization

## Core Role

Implement automatic categorization and tagging:
- Item classification
- Auto-tagging based on patterns
- Category suggestions
- Learning from user corrections

---

## Categorization Service

```typescript
// lib/categorization/service.ts
import prisma from '@/lib/prisma'
import { cache } from '@/lib/cache'

export interface CategorySuggestion {
  categoryId: number
  categoryName: string
  confidence: number
  matchedKeywords: string[]
}

export interface TagSuggestion {
  tag: string
  confidence: number
  source: 'pattern' | 'history' | 'similarity'
}

// Keyword-based category rules
const CATEGORY_RULES: Record<string, {
  keywords: string[]
  patterns: RegExp[]
}> = {
  'Electronics': {
    keywords: ['computer', 'laptop', 'monitor', 'keyboard', 'mouse', 'printer', 'scanner', 'usb', 'cable', 'adapter', 'charger', 'battery'],
    patterns: [/\b(pc|cpu|ram|ssd|hdd|hdmi|wifi|bluetooth)\b/i]
  },
  'Office Supplies': {
    keywords: ['paper', 'pen', 'pencil', 'stapler', 'clip', 'folder', 'binder', 'notebook', 'envelope', 'tape', 'glue', 'scissors'],
    patterns: [/\b(a4|letter|legal|staple|post-it)\b/i]
  },
  'Furniture': {
    keywords: ['desk', 'chair', 'table', 'shelf', 'cabinet', 'drawer', 'sofa', 'couch', 'bookcase', 'wardrobe'],
    patterns: [/\b(ergonomic|adjustable|standing|office|conference)\b.*(desk|chair|table)\b/i]
  },
  'Tools': {
    keywords: ['hammer', 'screwdriver', 'wrench', 'pliers', 'drill', 'saw', 'tape measure', 'level', 'toolbox'],
    patterns: [/\b(power|hand)\s*(tool)\b/i]
  },
  'Safety Equipment': {
    keywords: ['helmet', 'gloves', 'goggles', 'mask', 'vest', 'boots', 'ear protection', 'fire extinguisher'],
    patterns: [/\b(ppe|safety|protective)\b/i]
  },
  'Cleaning Supplies': {
    keywords: ['detergent', 'soap', 'sanitizer', 'tissue', 'towel', 'mop', 'broom', 'vacuum', 'cleaner'],
    patterns: [/\b(cleaning|disinfectant|sanitary)\b/i]
  }
}

// Suggest category for item
export async function suggestCategory(
  itemData: {
    name: string
    description?: string
    serialNumber?: string
  }
): Promise<CategorySuggestion[]> {
  const text = `${itemData.name} ${itemData.description || ''} ${itemData.serialNumber || ''}`.toLowerCase()
  const suggestions: CategorySuggestion[] = []

  // Get all categories
  const categories = await prisma.category.findMany({
    where: { isActive: true }
  })

  // Score each category
  for (const category of categories) {
    const rules = CATEGORY_RULES[category.name]

    if (rules) {
      const matchedKeywords: string[] = []
      let score = 0

      // Check keywords
      for (const keyword of rules.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matchedKeywords.push(keyword)
          score += 1
        }
      }

      // Check patterns
      for (const pattern of rules.patterns) {
        if (pattern.test(text)) {
          score += 2
        }
      }

      if (score > 0) {
        const confidence = Math.min(0.95, score / 5)

        suggestions.push({
          categoryId: category.id,
          categoryName: category.name,
          confidence,
          matchedKeywords
        })
      }
    }
  }

  // If no rules matched, try similarity-based suggestion
  if (suggestions.length === 0) {
    const similarItems = await findSimilarItems(itemData.name)

    for (const similar of similarItems.slice(0, 3)) {
      if (similar.category) {
        suggestions.push({
          categoryId: similar.category.id,
          categoryName: similar.category.name,
          confidence: similar.similarity * 0.8,
          matchedKeywords: []
        })
      }
    }
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// Find similar items
async function findSimilarItems(
  name: string
): Promise<Array<{
  id: number
  name: string
  category: { id: number; name: string } | null
  similarity: number
}>> {
  // Get recent items with categories
  const items = await prisma.inventoryItem.findMany({
    where: {
      category: { isNot: null }
    },
    include: {
      category: { select: { id: true, name: true } }
    },
    take: 100,
    orderBy: { createdAt: 'desc' }
  })

  const results = []

  for (const item of items) {
    const similarity = calculateSimilarity(name, item.name)
    if (similarity > 0.5) {
      results.push({
        id: item.id,
        name: item.name,
        category: item.category,
        similarity
      })
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity)
}

// Calculate string similarity (Jaccard)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().split(/\s+/)
  const s2 = str2.toLowerCase().split(/\s+/)

  const set1 = new Set(s1)
  const set2 = new Set(s2)

  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return union.size > 0 ? intersection.size / union.size : 0
}

// Suggest tags for item
export async function suggestTags(
  itemData: {
    name: string
    description?: string
    categoryId?: number
  }
): Promise<TagSuggestion[]> {
  const text = `${itemData.name} ${itemData.description || ''}`.toLowerCase()
  const suggestions: TagSuggestion[] = []
  const seenTags = new Set<string>()

  // 1. Pattern-based tags
  const patternTags = extractPatternTags(text)
  for (const tag of patternTags) {
    if (!seenTags.has(tag)) {
      seenTags.add(tag)
      suggestions.push({
        tag,
        confidence: 0.9,
        source: 'pattern'
      })
    }
  }

  // 2. History-based tags
  if (itemData.categoryId) {
    const categoryTags = await getCategoryTags(itemData.categoryId)
    for (const tag of categoryTags) {
      if (!seenTags.has(tag.tag)) {
        seenTags.add(tag.tag)
        suggestions.push({
          tag: tag.tag,
          confidence: tag.frequency / 10,
          source: 'history'
        })
      }
    }
  }

  // 3. Similarity-based tags
  const similarTags = await getSimilarItemTags(itemData.name)
  for (const tag of similarTags) {
    if (!seenTags.has(tag.tag)) {
      seenTags.add(tag.tag)
      suggestions.push({
        tag: tag.tag,
        confidence: tag.similarity * 0.7,
        source: 'similarity'
      })
    }
  }

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10)
}

// Extract tags from text patterns
function extractPatternTags(text: string): string[] {
  const tags: string[] = []

  // Brand patterns
  const brands = ['dell', 'hp', 'lenovo', 'apple', 'samsung', 'logitech', 'microsoft', 'sony', 'lg', 'asus']
  for (const brand of brands) {
    if (text.includes(brand)) {
      tags.push(brand.charAt(0).toUpperCase() + brand.slice(1))
    }
  }

  // Condition patterns
  if (/\b(new|brand new)\b/i.test(text)) tags.push('New')
  if (/\b(used|second hand)\b/i.test(text)) tags.push('Used')
  if (/\b(refurbished)\b/i.test(text)) tags.push('Refurbished')

  // Size patterns
  if (/\b(\d+)(?:\s*)(inch|in|")\b/i.test(text)) {
    const match = text.match(/\b(\d+)(?:\s*)(inch|in|")\b/i)
    if (match) tags.push(`${match[1]} inch`)
  }

  // Color patterns
  const colors = ['black', 'white', 'silver', 'gray', 'grey', 'blue', 'red', 'green']
  for (const color of colors) {
    if (text.includes(color)) {
      tags.push(color.charAt(0).toUpperCase() + color.slice(1))
    }
  }

  // Priority/Importance patterns
  if (/\b(urgent|critical|important|priority)\b/i.test(text)) tags.push('Priority')
  if (/\b(fragile|handle with care)\b/i.test(text)) tags.push('Fragile')

  return tags
}

// Get common tags for category
async function getCategoryTags(
  categoryId: number
): Promise<Array<{ tag: string; frequency: number }>> {
  const cacheKey = `category-tags:${categoryId}`
  const cached = await cache.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // Get items in category with tags
  const items = await prisma.inventoryItem.findMany({
    where: { categoryId },
    select: { tags: true }
  })

  // Count tag frequency
  const tagCounts: Record<string, number> = {}

  for (const item of items) {
    if (item.tags) {
      const tags = JSON.parse(item.tags) as string[]
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }
  }

  const result = Object.entries(tagCounts)
    .map(([tag, frequency]) => ({ tag, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20)

  await cache.set(cacheKey, JSON.stringify(result), 3600)

  return result
}

// Get tags from similar items
async function getSimilarItemTags(
  name: string
): Promise<Array<{ tag: string; similarity: number }>> {
  const similarItems = await findSimilarItems(name)

  const tagSimilarity: Record<string, number> = {}

  for (const item of similarItems.slice(0, 5)) {
    const fullItem = await prisma.inventoryItem.findUnique({
      where: { id: item.id },
      select: { tags: true }
    })

    if (fullItem?.tags) {
      const tags = JSON.parse(fullItem.tags) as string[]
      for (const tag of tags) {
        if (!tagSimilarity[tag] || tagSimilarity[tag] < item.similarity) {
          tagSimilarity[tag] = item.similarity
        }
      }
    }
  }

  return Object.entries(tagSimilarity)
    .map(([tag, similarity]) => ({ tag, similarity }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10)
}

// Auto-categorize item (applies best suggestion)
export async function autoCategorizeItem(
  itemId: number
): Promise<{
  category: { id: number; name: string } | null
  tags: string[]
}> {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId }
  })

  if (!item) {
    throw new Error('Item not found')
  }

  // Get category suggestion
  const categorySuggestions = await suggestCategory({
    name: item.name,
    description: item.description || undefined,
    serialNumber: item.serialNumber || undefined
  })

  let category = null
  if (categorySuggestions.length > 0 && categorySuggestions[0].confidence > 0.7) {
    category = {
      id: categorySuggestions[0].categoryId,
      name: categorySuggestions[0].categoryName
    }

    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { categoryId: category.id }
    })
  }

  // Get tag suggestions
  const tagSuggestions = await suggestTags({
    name: item.name,
    description: item.description || undefined,
    categoryId: category?.id || item.categoryId || undefined
  })

  const tags = tagSuggestions
    .filter(s => s.confidence > 0.6)
    .map(s => s.tag)

  if (tags.length > 0) {
    await prisma.inventoryItem.update({
      where: { id: itemId },
      data: { tags: JSON.stringify(tags) }
    })
  }

  return { category, tags }
}

// Learn from user correction
export async function learnFromCorrection(
  itemId: number,
  correctCategoryId: number,
  userId: number
): Promise<void> {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId }
  })

  if (!item) return

  // Store the correction for future learning
  await prisma.categoryCorrection.create({
    data: {
      itemName: item.name,
      itemDescription: item.description,
      correctCategoryId,
      correctedById: userId
    }
  })

  // Apply the correction
  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { categoryId: correctCategoryId }
  })
}

// Batch auto-categorize
export async function batchAutoCategorize(
  itemIds: number[]
): Promise<{
  successful: number
  failed: number
  results: Array<{ itemId: number; category: string | null; tags: string[] }>
}> {
  const results = []
  let successful = 0
  let failed = 0

  for (const itemId of itemIds) {
    try {
      const result = await autoCategorizeItem(itemId)
      results.push({
        itemId,
        category: result.category?.name || null,
        tags: result.tags
      })
      successful++
    } catch (error) {
      results.push({
        itemId,
        category: null,
        tags: []
      })
      failed++
    }
  }

  return { successful, failed, results }
}
```

---

## Category Suggester Component

```typescript
// components/categorization/category-suggester.tsx
'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useDebounce } from '@/hooks/use-debounce'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  suggestCategory,
  suggestTags,
  learnFromCorrection
} from '@/lib/categorization/service'
import {
  Sparkles,
  Tag,
  Check,
  X,
  Loader2,
  ChevronRight
} from 'lucide-react'

interface CategorySuggesterProps {
  itemName: string
  itemDescription?: string
  itemSerialNumber?: string
  currentCategoryId?: number
  onCategorySelect: (categoryId: number) => void
  onTagsSelect?: (tags: string[]) => void
}

export function CategorySuggester({
  itemName,
  itemDescription,
  itemSerialNumber,
  currentCategoryId,
  onCategorySelect,
  onTagsSelect
}: CategorySuggesterProps) {
  const { locale } = useI18n()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [dismissed, setDismissed] = useState(false)

  const debouncedName = useDebounce(itemName, 500)

  const { data: categorySuggestions, isLoading: catLoading } = useQuery({
    queryKey: ['category-suggestions', debouncedName, itemDescription],
    queryFn: () => suggestCategory({
      name: debouncedName,
      description: itemDescription,
      serialNumber: itemSerialNumber
    }),
    enabled: debouncedName.length >= 3
  })

  const { data: tagSuggestions, isLoading: tagLoading } = useQuery({
    queryKey: ['tag-suggestions', debouncedName, itemDescription, currentCategoryId],
    queryFn: () => suggestTags({
      name: debouncedName,
      description: itemDescription,
      categoryId: currentCategoryId
    }),
    enabled: debouncedName.length >= 3
  })

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleApplyTags = () => {
    onTagsSelect?.(selectedTags)
  }

  if (dismissed || debouncedName.length < 3) return null

  const isLoading = catLoading || tagLoading

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-yellow-500" />
            {locale === 'th' ? 'คำแนะนำอัตโนมัติ' : 'Smart Suggestions'}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Category Suggestions */}
            {categorySuggestions && categorySuggestions.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {locale === 'th' ? 'หมวดหมู่ที่แนะนำ' : 'Suggested Categories'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {categorySuggestions.slice(0, 3).map((suggestion) => (
                    <Button
                      key={suggestion.categoryId}
                      variant={currentCategoryId === suggestion.categoryId ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onCategorySelect(suggestion.categoryId)}
                      className="gap-2"
                    >
                      <span>{suggestion.categoryName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Tag Suggestions */}
            {tagSuggestions && tagSuggestions.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {locale === 'th' ? 'แท็กที่แนะนำ' : 'Suggested Tags'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tagSuggestions.slice(0, 10).map((suggestion) => (
                    <Badge
                      key={suggestion.tag}
                      variant={selectedTags.includes(suggestion.tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => handleTagToggle(suggestion.tag)}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {suggestion.tag}
                      <span className="ml-1 text-xs opacity-70">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </Badge>
                  ))}
                </div>

                {selectedTags.length > 0 && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={handleApplyTags}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {locale === 'th'
                      ? `เพิ่ม ${selectedTags.length} แท็ก`
                      : `Apply ${selectedTags.length} tags`}
                  </Button>
                )}
              </div>
            )}

            {/* No suggestions */}
            {(!categorySuggestions?.length && !tagSuggestions?.length) && (
              <p className="text-sm text-muted-foreground text-center py-2">
                {locale === 'th'
                  ? 'ไม่พบคำแนะนำสำหรับรายการนี้'
                  : 'No suggestions available for this item'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Batch Categorization Dialog

```typescript
// components/categorization/batch-categorization-dialog.tsx
'use client'

import { useState } from 'react'
import { useI18n } from '@/hooks/use-i18n'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles
} from 'lucide-react'
import { batchAutoCategorize } from '@/lib/categorization/service'

interface BatchCategorizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemIds: number[]
  onComplete?: (results: any) => void
}

export function BatchCategorizationDialog({
  open,
  onOpenChange,
  itemIds,
  onComplete
}: BatchCategorizationDialogProps) {
  const { locale } = useI18n()
  const [results, setResults] = useState<any>(null)

  const mutation = useMutation({
    mutationFn: () => batchAutoCategorize(itemIds),
    onSuccess: (data) => {
      setResults(data)
      onComplete?.(data)
    }
  })

  const handleClose = () => {
    setResults(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            {locale === 'th' ? 'จัดหมวดหมู่อัตโนมัติ' : 'Auto Categorize'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'th'
              ? `จัดหมวดหมู่ ${itemIds.length} รายการที่เลือก`
              : `Categorize ${itemIds.length} selected items`}
          </DialogDescription>
        </DialogHeader>

        {mutation.isPending ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">
              {locale === 'th' ? 'กำลังประมวลผล...' : 'Processing...'}
            </p>
          </div>
        ) : results ? (
          <div className="space-y-4">
            <div className="flex gap-4 justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.successful}
                </div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? 'สำเร็จ' : 'Success'}
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {results.failed}
                </div>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? 'ล้มเหลว' : 'Failed'}
                </p>
              </div>
            </div>

            <ScrollArea className="h-48">
              <div className="space-y-2">
                {results.results.map((r: any) => (
                  <div
                    key={r.itemId}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <div className="flex items-center gap-2">
                      {r.category ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Item #{r.itemId}</span>
                    </div>
                    {r.category && (
                      <Badge variant="secondary">{r.category}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {locale === 'th'
                ? 'ระบบจะวิเคราะห์และจัดหมวดหมู่รายการโดยอัตโนมัติ'
                : 'The system will analyze and categorize items automatically'}
            </p>
          </div>
        )}

        <DialogFooter>
          {results ? (
            <Button onClick={handleClose}>
              {locale === 'th' ? 'เสร็จสิ้น' : 'Done'}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                {locale === 'th' ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {locale === 'th' ? 'เริ่มต้น' : 'Start'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Prisma Schema

```prisma
// Category Correction (for learning)
model CategoryCorrection {
  id               Int      @id @default(autoincrement())
  itemName         String
  itemDescription  String?
  correctCategoryId Int
  correctedById    Int
  createdAt        DateTime @default(now())

  category         Category @relation(fields: [correctCategoryId], references: [id])
  correctedBy      User     @relation(fields: [correctedById], references: [id])

  @@index([correctCategoryId])
  @@index([createdAt])
}

// Update existing models
model Category {
  // ... existing fields
  corrections CategoryCorrection[]
}

model User {
  // ... existing fields
  categoryCorrections CategoryCorrection[]
}

model InventoryItem {
  // ... existing fields
  tags String? // JSON array of tags
}
```

---

## Usage Examples

```tsx
// Example 1: Category suggester in item form
import { CategorySuggester } from '@/components/categorization/category-suggester'

function ItemForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number>()
  const [tags, setTags] = useState<string[]>([])

  return (
    <form>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />

      {/* Smart suggestions */}
      <CategorySuggester
        itemName={name}
        itemDescription={description}
        currentCategoryId={categoryId}
        onCategorySelect={setCategoryId}
        onTagsSelect={setTags}
      />

      {/* Display selected tags */}
      {tags.map(tag => (
        <Badge key={tag}>{tag}</Badge>
      ))}
    </form>
  )
}

// Example 2: Batch categorization
import { BatchCategorizationDialog } from '@/components/categorization/batch-categorization-dialog'

function InventoryTable() {
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [showCategorizeDialog, setShowCategorizeDialog] = useState(false)

  return (
    <div>
      <Button
        onClick={() => setShowCategorizeDialog(true)}
        disabled={selectedItems.length === 0}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Auto Categorize ({selectedItems.length})
      </Button>

      <BatchCategorizationDialog
        open={showCategorizeDialog}
        onOpenChange={setShowCategorizeDialog}
        itemIds={selectedItems}
        onComplete={(results) => {
          console.log('Categorized:', results)
        }}
      />
    </div>
  )
}

// Example 3: Learn from user correction
import { learnFromCorrection } from '@/lib/categorization/service'

async function handleCategoryChange(itemId: number, newCategoryId: number, userId: number) {
  // Update the item
  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: { categoryId: newCategoryId }
  })

  // Learn from the correction
  await learnFromCorrection(itemId, newCategoryId, userId)
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
