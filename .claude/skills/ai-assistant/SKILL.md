---
name: ai-assistant
description: AI-powered features and intelligent assistance for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["ai", "artificial intelligence", "ml", "machine learning", "smart", "intelligent"]
  file_patterns: ["*ai*", "lib/ai*", "components/ai*"]
  context: AI features, smart suggestions, intelligent automation
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# AI Assistant

## Core Role

Provide AI-powered features for HR-IMS:
- Smart search suggestions
- Inventory recommendations
- Anomaly detection
- Predictive analytics

---

## Smart Search Suggestions

```typescript
// lib/ai/smart-search.ts
import prisma from '@/lib/prisma'

interface SearchSuggestion {
  type: 'item' | 'user' | 'request' | 'category'
  id: number
  name: string
  relevance: number
  reason: string
}

export async function getSmartSearchSuggestions(
  query: string,
  userId: number
): Promise<SearchSuggestion[]> {
  const suggestions: SearchSuggestion[] = []

  // Normalize query
  const normalizedQuery = query.toLowerCase().trim()

  // Get user's recent activity for context
  const recentRequests = await prisma.request.findMany({
    where: { requesterId: userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { items: { include: { item: true } } }
  })

  // Get frequently used items
  const frequentItems = await prisma.requestItem.groupBy({
    by: ['itemId'],
    _count: { itemId: true },
    orderBy: { _count: { itemId: 'desc' } },
    take: 10
  })

  // Search items with relevance scoring
  const items = await prisma.inventoryItem.findMany({
    where: {
      OR: [
        { name: { contains: normalizedQuery, mode: 'insensitive' } },
        { code: { contains: normalizedQuery, mode: 'insensitive' } },
        { description: { contains: normalizedQuery, mode: 'insensitive' } }
      ]
    },
    take: 5
  })

  items.forEach(item => {
    let relevance = 50

    // Boost if frequently used
    if (frequentItems.some(fi => fi.itemId === item.id)) {
      relevance += 30
    }

    // Boost if recently requested
    if (recentRequests.some(rr => rr.items.some(ri => ri.itemId === item.id))) {
      relevance += 20
    }

    suggestions.push({
      type: 'item',
      id: item.id,
      name: item.name,
      relevance,
      reason: 'ตรงกับคำค้นหา / Matches search query'
    })
  })

  // Search users
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: normalizedQuery, mode: 'insensitive' } },
        { email: { contains: normalizedQuery, mode: 'insensitive' } },
        { department: { contains: normalizedQuery, mode: 'insensitive' } }
      ]
    },
    take: 3
  })

  users.forEach(user => {
    suggestions.push({
      type: 'user',
      id: user.id,
      name: user.name,
      relevance: 40,
      reason: 'ตรงกับคำค้นหา / Matches search query'
    })
  })

  // Sort by relevance
  return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, 10)
}
```

---

## Inventory Recommendations

```typescript
// lib/ai/recommendations.ts
import prisma from '@/lib/prisma'

interface RestockRecommendation {
  itemId: number
  itemName: string
  currentStock: number
  recommendedOrder: number
  urgency: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  estimatedCost?: number
}

export async function getRestockRecommendations(
  warehouseId?: number
): Promise<RestockRecommendation[]> {
  const recommendations: RestockRecommendation[] = []

  // Get low stock items
  const lowStockItems = await prisma.stockLevel.findMany({
    where: {
      warehouseId,
      quantity: { lte: prisma.stockLevel.fields.minStock }
    },
    include: {
      item: true,
      warehouse: true
    }
  })

  for (const stock of lowStockItems) {
    // Calculate recommended order quantity
    const avgMonthlyUsage = await calculateAverageMonthlyUsage(stock.item.id)
    const leadTime = 14 // days
    const safetyStock = avgMonthlyUsage * 0.5 // 50% safety buffer
    const reorderPoint = (avgMonthlyUsage / 30) * leadTime + safetyStock

    const recommendedOrder = Math.max(
      Math.ceil((reorderPoint - stock.quantity) * 2), // Order 2x the deficit
      stock.maxStock ? stock.maxStock - stock.quantity : 100 // Or fill to max
    )

    // Determine urgency
    let urgency: RestockRecommendation['urgency'] = 'low'
    if (stock.quantity === 0) {
      urgency = 'critical'
    } else if (stock.quantity <= stock.minStock * 0.25) {
      urgency = 'high'
    } else if (stock.quantity <= stock.minStock * 0.5) {
      urgency = 'medium'
    }

    recommendations.push({
      itemId: stock.item.id,
      itemName: stock.item.name,
      currentStock: stock.quantity,
      recommendedOrder,
      urgency,
      reason: stock.quantity === 0
        ? 'สินค้าหมด / Out of stock'
        : `ใกล้หมดสต็อกขั้นต่ำ / Below minimum stock (${stock.minStock})`,
      estimatedCost: stock.item.price
        ? stock.item.price.toNumber() * recommendedOrder
        : undefined
    })
  }

  // Sort by urgency
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return recommendations.sort(
    (a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
  )
}

async function calculateMonthlyUsage(itemId: number): Promise<number> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentUsage = await prisma.requestItem.aggregate({
    where: {
      itemId,
      request: {
        createdAt: { gte: thirtyDaysAgo },
        status: 'APPROVED'
      }
    },
    _sum: { quantity: true }
  })

  return recentUsage._sum.quantity || 0
}

// Similar items recommendation
export async function getSimilarItems(itemId: number): Promise<Array<{
  id: number
  name: string
  similarity: number
}>> {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: { category: true }
  })

  if (!item) return []

  // Find items in same category
  const similarItems = await prisma.inventoryItem.findMany({
    where: {
      categoryId: item.categoryId,
      id: { not: itemId }
    },
    take: 5
  })

  return similarItems.map(si => ({
    id: si.id,
    name: si.name,
    similarity: 80 // Base similarity for same category
  }))
}
```

---

## Anomaly Detection

```typescript
// lib/ai/anomaly-detection.ts
import prisma from '@/lib/prisma'

interface Anomaly {
  type: 'unusual_quantity' | 'unusual_frequency' | 'unusual_pattern' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high'
  description: string
  entityId: number
  entityType: 'item' | 'user' | 'request'
  detectedAt: Date
  details: Record<string, any>
}

export async function detectAnomalies(): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = []

  // Detect unusual request quantities
  const largeRequests = await prisma.request.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      items: {
        some: {
          quantity: { gte: 50 }
        }
      }
    },
    include: {
      requester: true,
      items: true
    }
  })

  for (const request of largeRequests) {
    const totalQty = request.items.reduce((sum, i) => sum + i.quantity, 0)
    if (totalQty >= 100) {
      anomalies.push({
        type: 'unusual_quantity',
        severity: 'medium',
        description: `คำขอจำนวนมากผิดปกติ: ${totalQty} รายการ`,
        entityId: request.id,
        entityType: 'request',
        detectedAt: new Date(),
        details: {
          requester: request.requester.name,
          totalQuantity: totalQty,
          requestId: request.id
        }
      })
    }
  }

  // Detect unusual request frequency
  const frequentRequesters = await prisma.request.groupBy({
    by: ['requesterId'],
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    },
    _count: { id: true },
    having: {
      id: { _count: { gte: 10 } }
    }
  })

  for (const fr of frequentRequesters) {
    const user = await prisma.user.findUnique({
      where: { id: fr.requesterId }
    })

    anomalies.push({
      type: 'unusual_frequency',
      severity: 'low',
      description: `คำขอบ่อยใน 24 ชั่วโมง: ${fr._count.id} ครั้ง`,
      entityId: fr.requesterId,
      entityType: 'user',
      detectedAt: new Date(),
      details: {
        userName: user?.name,
        requestCount: fr._count.id
      }
    })
  }

  // Detect unusual time patterns (requests outside business hours)
  const afterHoursRequests = await prisma.request.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    }
  })

  for (const request of afterHoursRequests) {
    const hour = request.createdAt.getHours()
    if (hour < 7 || hour > 18) {
      anomalies.push({
        type: 'unusual_pattern',
        severity: 'low',
        description: `คำขอนอกเวลาทำการ: ${request.createdAt.toLocaleTimeString('th-TH')}`,
        entityId: request.id,
        entityType: 'request',
        detectedAt: new Date(),
        details: {
          requestId: request.id,
          time: request.createdAt.toLocaleTimeString('th-TH')
        }
      })
    }
  }

  return anomalies
}

// Detect stock discrepancies
export async function detectStockDiscrepancies(): Promise<Anomaly[]> {
  const anomalies: Anomaly[] = []

  // Compare stock levels with request history
  const items = await prisma.inventoryItem.findMany({
    include: {
      stockLevels: true
    }
  })

  for (const item of items) {
    const totalStock = item.stockLevels.reduce((sum, sl) => sum + sl.quantity, 0)

    // Get total withdrawn in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const withdrawn = await prisma.requestItem.aggregate({
      where: {
        itemId: item.id,
        request: {
          type: 'WITHDRAW',
          status: 'APPROVED',
          createdAt: { gte: thirtyDaysAgo }
        }
      },
      _sum: { quantity: true }
    })

    const totalWithdrawn = withdrawn._sum.quantity || 0

    // If withdrawn more than current stock in last 30 days without restock
    if (totalWithdrawn > totalStock * 1.5 && totalStock > 0) {
      anomalies.push({
        type: 'suspicious_activity',
        severity: 'high',
        description: `สต็อกต่ำกว่าประวัติการเบิก / Stock lower than withdrawal history`,
        entityId: item.id,
        entityType: 'item',
        detectedAt: new Date(),
        details: {
          itemName: item.name,
          currentStock: totalStock,
          recentWithdrawals: totalWithdrawn
        }
      })
    }
  }

  return anomalies
}
```

---

## Predictive Analytics

```typescript
// lib/ai/predictions.ts
import prisma from '@/lib/prisma'

interface StockoutPrediction {
  itemId: number
  itemName: string
  currentStock: number
  dailyUsage: number
  daysUntilStockout: number
  predictedStockoutDate: Date
  confidence: number
}

export async function predictStockouts(): Promise<StockoutPrediction[]> {
  const predictions: StockoutPrediction[] = []

  const items = await prisma.inventoryItem.findMany({
    include: {
      stockLevels: true
    }
  })

  for (const item of items) {
    const totalStock = item.stockLevels.reduce((sum, sl) => sum + sl.quantity, 0)

    if (totalStock === 0) continue

    // Calculate daily usage rate
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const usage = await prisma.requestItem.aggregate({
      where: {
        itemId: item.id,
        request: {
          type: { in: ['WITHDRAW', 'BORROW'] },
          status: 'APPROVED',
          createdAt: { gte: ninetyDaysAgo }
        }
      },
      _sum: { quantity: true }
    })

    const totalUsage = usage._sum.quantity || 0
    const dailyUsage = totalUsage / 90

    if (dailyUsage === 0) continue

    // Predict stockout
    const daysUntilStockout = Math.floor(totalStock / dailyUsage)
    const predictedDate = new Date()
    predictedDate.setDate(predictedDate.getDate() + daysUntilStockout)

    // Calculate confidence based on data consistency
    const confidence = Math.min(95, 50 + (totalUsage / 100) * 10)

    if (daysUntilStockout <= 30) {
      predictions.push({
        itemId: item.id,
        itemName: item.name,
        currentStock: totalStock,
        dailyUsage: Math.round(dailyUsage * 10) / 10,
        daysUntilStockout,
        predictedStockoutDate: predictedDate,
        confidence: Math.round(confidence)
      })
    }
  }

  return predictions.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
}

// Predict demand
interface DemandPrediction {
  itemId: number
  itemName: string
  category: string
  nextMonthDemand: number
  trend: 'increasing' | 'stable' | 'decreasing'
}

export async function predictDemand(): Promise<DemandPrediction[]> {
  const predictions: DemandPrediction[] = []

  // Group by category and analyze trends
  const categories = await prisma.category.findMany({
    include: {
      items: {
        include: {
      requestItems: {
          where: {
            request: {
              status: 'APPROVED',
              createdAt: {
                gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
              }
            }
          }
        }
      }
    }
  })

  for (const category of categories) {
    const totalDemand = category.items.reduce(
      (sum, item) =>
        sum + item.requestItems.reduce((s, ri) => s + ri.quantity, 0),
      0
    )

    if (totalDemand > 0) {
      // Compare with previous period
      const previousPeriodStart = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
      const previousPeriodEnd = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

      const previousDemand = await prisma.requestItem.aggregate({
        where: {
          item: { categoryId: category.id },
          request: {
            status: 'APPROVED',
            createdAt: {
              gte: previousPeriodStart,
              lt: previousPeriodEnd
            }
          }
        },
        _sum: { quantity: true }
      })

      const previousTotal = previousDemand._sum.quantity || 0
      const trend: DemandPrediction['trend'] =
        totalDemand > previousTotal * 1.1
          ? 'increasing'
          : totalDemand < previousTotal * 0.9
          ? 'decreasing'
          : 'stable'

      predictions.push({
        itemId: category.items[0]?.id || 0,
        itemName: category.name,
        category: category.name,
        nextMonthDemand: Math.round((totalDemand / 3) * 1.1), // Extrapolate
        trend
      })
    }
  }

  return predictions
}
```

---

## AI Insights Dashboard Component

```typescript
// components/ai/ai-insights-dashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Brain
} from 'lucide-react'

export function AIInsightsDashboard() {
  const [stockoutPredictions, setStockoutPredictions] = useState<any[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [restockRecs, setRestockRecs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [stockoutRes, anomalyRes, restockRes] = await Promise.all([
        fetch('/api/ai/predictions/stockouts').then(r => r.json()),
        fetch('/api/ai/anomalies').then(r => r.json()),
        fetch('/api/ai/recommendations/restock').then(r => r.json())
      ])

        setStockoutPredictions(stockoutRes)
        setAnomalies(anomalyRes)
        setRestockRecs(restockRes)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Brain className="h-8 w-8 animate-pulse text-muted-foreground" />
        <span className="ml-2">กำลังวิเคราะห์ข้อมูล...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stockout Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            สินค้าใกล้หมดสต็อก / Stockout Predictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stockoutPredictions.length === 0 ? (
            <p className="text-muted-foreground">ไม่มีสินค้าที่คาดว่าจะหมดใน 30 วัน</p>
          ) : (
            <div className="space-y-3">
              {stockoutPredictions.map(prediction => (
                <div
                  key={prediction.itemId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{prediction.itemName}</p>
                    <p className="text-sm text-muted-foreground">
                      สต็อกปัจจุบัน: {prediction.currentStock} |
                      ใช้ต่อวัน: {prediction.dailyUsage}/วัน
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        prediction.daysUntilStockout <= 7
                          ? 'destructive'
                          : prediction.daysUntilStockout <= 14
                          ? 'default'
                          : 'secondary'
                        }
                      }
                    >
                      {prediction.daysUntilStockout} วัน
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                    {prediction.confidence}% มั่นใจ
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anomalies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            พฤติกรรมที่ผิดปกติ / Anomaly Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {anomalies.length === 0 ? (
            <p className="text-muted-foreground">ไม่พบความผิดปกติ</p>
          ) : (
            <div className="space-y-2">
              {anomalies.map((anomaly, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <Badge
                    variant={
                      anomaly.severity === 'high'
                      ? 'destructive'
                      : anomaly.severity === 'medium'
                      ? 'default'
                      : 'secondary'
                    }
                    }
                  >
                    {anomaly.severity}
                  </Badge>
                  <p className="flex-1">{anomaly.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restock Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            คำแนะำำสั่งซื้อ / Restock Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {restockRecs.length === 0 ? (
            <p className="text-muted-foreground">ไม่มีสินค้าที่ต้องสั่งซื้อ</p>
          ) : (
            <div className="space-y-3">
              {restockRecs.map(rec => (
                <div
                  key={rec.itemId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{rec.itemName}</p>
                    <p className="text-sm text-muted-foreground">
                      สต็อกปัจจุบัน: {rec.currentStock} | แนะนำำสั่ง: {rec.recommendedOrder}
                    </p>
                  </div>
                  <Badge
                    variant={
                      rec.urgency === 'critical'
                      ? 'destructive'
                      : rec.urgency === 'high'
                      ? 'default'
                      : 'secondary'
                    }
                  >
                    {rec.urgency}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## API Routes

```typescript
// app/api/ai/predictions/stockouts/route.ts
import { NextResponse } from 'next/server'
import { predictStockouts } from '@/lib/ai/predictions'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const predictions = await predictStockouts()
  return NextResponse.json(predictions)
}

// app/api/ai/anomalies/route.ts
import { NextResponse } from 'next/server'
import { detectAnomalies, detectStockDiscrepancies } from '@/lib/ai/anomaly-detection'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [anomalies, discrepancies] = await Promise.all([
    detectAnomalies(),
    detectStockDiscrepancies()
  ])

  return NextResponse.json([...anomalies, ...discrepancies])
}

// app/api/ai/recommendations/restock/route.ts
import { NextResponse } from 'next/server'
import { getRestockRecommendations } from '@/lib/ai/recommendations'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recommendations = await getRestockRecommendations()
  return NextResponse.json(recommendations)
}
```

---

## Usage Examples

```typescript
// Example 1: Smart search
const suggestions = await getSmartSearchSuggestions('laptop', userId)

// Example 2: Get restock recommendations
const recommendations = await getRestockRecommendations(warehouseId)

// Example 3: Detect anomalies
const anomalies = await detectAnomalies()

// Example 4: Predict stockouts
const predictions = await predictStockouts()
```

---

*Version: 1.0.0 | For HR-IMS Project*
