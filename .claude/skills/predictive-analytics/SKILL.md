---
name: predictive-analytics
description: Predictive analytics and forecasting for HR-IMS inventory and usage
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["predict", "forecast", "projection", "trend", "analytics"]
  file_patterns: ["*predict*", "*forecast*", "*projection*"]
  context: predictive analytics, forecasting, trend analysis, projections
mcp_servers:
  - sequential
personas:
  - backend
  - frontend
---

# Predictive Analytics

## Core Role

Implement predictive analytics and forecasting:
- Demand forecasting
- Stock depletion prediction
- Usage trend analysis
- Seasonal patterns

---

## Analytics Service

```typescript
// lib/analytics/predictive.ts
import prisma from '@/lib/prisma'
import { subDays, subMonths, startOfMonth, endOfMonth, format, addMonths, differenceInDays } from 'date-fns'

export interface ForecastResult {
  date: string
  predicted: number
  lowerBound: number
  upperBound: number
  confidence: number
}

export interface StockPrediction {
  itemId: number
  itemName: string
  currentStock: number
  dailyUsage: number
  daysUntilDepletion: number
  depletionDate: Date | null
  recommendedOrderDate: Date | null
  recommendedOrderQuantity: number
  urgency: 'low' | 'medium' | 'high' | 'critical'
}

export interface TrendAnalysis {
  metric: string
  currentValue: number
  previousValue: number
  change: number
  changePercent: number
  trend: 'increasing' | 'decreasing' | 'stable'
  seasonality: 'strong' | 'moderate' | 'weak' | 'none'
}

// Forecast demand for next N periods
export async function forecastDemand(
  months: number = 3
): Promise<Record<string, ForecastResult[]>> {
  const forecasts: Record<string, ForecastResult[]> = {}

  // Get historical data (last 12 months)
  const now = new Date()
  const historicalData: Array<{ month: string; count: number }> = []

  for (let i = 12; i > 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i))
    const monthEnd = endOfMonth(subMonths(now, i))

    const count = await prisma.requestItem.count({
      where: {
        request: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: 'APPROVED'
        }
      }
    })

    historicalData.push({
      month: format(monthStart, 'yyyy-MM'),
      count
    })
  }

  // Calculate moving average and seasonality
  const values = historicalData.map(d => d.count)
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length

  // Simple exponential smoothing forecast
  const alpha = 0.3 // Smoothing factor
  let smoothedValue = values[0]

  for (let i = 1; i < values.length; i++) {
    smoothedValue = alpha * values[i] + (1 - alpha) * smoothedValue
  }

  // Generate forecasts
  const itemForecasts: ForecastResult[] = []

  for (let i = 1; i <= months; i++) {
    const forecastMonth = addMonths(now, i)
    const date = format(forecastMonth, 'yyyy-MM')

    // Apply simple growth factor
    const growthFactor = 1 + (0.02 * i) // 2% monthly growth assumption
    const predicted = Math.round(smoothedValue * growthFactor)

    // Calculate confidence interval (±15%)
    const margin = predicted * 0.15

    itemForecasts.push({
      date,
      predicted,
      lowerBound: Math.round(predicted - margin),
      upperBound: Math.round(predicted + margin),
      confidence: Math.max(0.6, 0.95 - (i * 0.1)) // Confidence decreases with time
    })
  }

  forecasts['overall'] = itemForecasts

  // Per-category forecasts
  const categories = await prisma.category.findMany({
    where: { isActive: true }
  })

  for (const category of categories) {
    const categoryForecasts = await forecastCategoryDemand(category.id, months)
    if (categoryForecasts.length > 0) {
      forecasts[`category-${category.id}`] = categoryForecasts
    }
  }

  return forecasts
}

// Forecast demand for specific category
async function forecastCategoryDemand(
  categoryId: number,
  months: number
): Promise<ForecastResult[]> {
  const now = new Date()
  const historicalData: Array<{ month: string; count: number }> = []

  for (let i = 12; i > 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i))
    const monthEnd = endOfMonth(subMonths(now, i))

    const count = await prisma.requestItem.count({
      where: {
        item: { categoryId },
        request: {
          createdAt: { gte: monthStart, lte: monthEnd },
          status: 'APPROVED'
        }
      }
    })

    historicalData.push({
      month: format(monthStart, 'yyyy-MM'),
      count
    })
  }

  // Calculate forecast
  const values = historicalData.map(d => d.count)
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length

  if (avgValue < 1) return []

  const alpha = 0.3
  let smoothedValue = values[0]

  for (let i = 1; i < values.length; i++) {
    smoothedValue = alpha * values[i] + (1 - alpha) * smoothedValue
  }

  const forecasts: ForecastResult[] = []

  for (let i = 1; i <= months; i++) {
    const forecastMonth = addMonths(now, i)
    const date = format(forecastMonth, 'yyyy-MM')

    const growthFactor = 1 + (0.02 * i)
    const predicted = Math.round(smoothedValue * growthFactor)
    const margin = predicted * 0.15

    forecasts.push({
      date,
      predicted,
      lowerBound: Math.round(predicted - margin),
      upperBound: Math.round(predicted + margin),
      confidence: Math.max(0.6, 0.95 - (i * 0.1))
    })
  }

  return forecasts
}

// Predict stock depletion
export async function predictStockDepletion(
  warehouseId?: number
): Promise<StockPrediction[]> {
  // Get all stock levels
  const stockLevels = await prisma.stockLevel.findMany({
    where: warehouseId ? { warehouseId } : undefined,
    include: {
      item: { select: { id: true, name: true, minQuantity: true } },
      warehouse: { select: { id: true, name: true } }
    }
  })

  const predictions: StockPrediction[] = []

  for (const stock of stockLevels) {
    // Calculate daily usage rate
    const dailyUsage = await calculateDailyUsage(stock.itemId, warehouseId)

    if (dailyUsage === 0) continue

    // Calculate days until depletion
    const daysUntilDepletion = Math.floor(stock.quantity / dailyUsage)
    const depletionDate = daysUntilDepletion > 0
      ? new Date(Date.now() + daysUntilDepletion * 24 * 60 * 60 * 1000)
      : null

    // Calculate recommended order date (14 days before depletion)
    const leadTime = 14 // Days to receive order
    const recommendedOrderDate = daysUntilDepletion > leadTime
      ? new Date(Date.now() + (daysUntilDepletion - leadTime) * 24 * 60 * 60 * 1000)
      : new Date() // Order immediately

    // Calculate recommended order quantity (30-day supply)
    const recommendedOrderQuantity = Math.ceil(dailyUsage * 30)

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' | 'critical'
    if (stock.quantity <= 0) {
      urgency = 'critical'
    } else if (daysUntilDepletion <= 7) {
      urgency = 'critical'
    } else if (daysUntilDepletion <= 14) {
      urgency = 'high'
    } else if (daysUntilDepletion <= 30) {
      urgency = 'medium'
    } else {
      urgency = 'low'
    }

    predictions.push({
      itemId: stock.itemId,
      itemName: stock.item.name,
      currentStock: stock.quantity,
      dailyUsage: Math.round(dailyUsage * 100) / 100,
      daysUntilDepletion,
      depletionDate,
      recommendedOrderDate,
      recommendedOrderQuantity,
      urgency
    })
  }

  // Sort by urgency and days until depletion
  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 }

  return predictions.sort((a, b) => {
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
    if (urgencyDiff !== 0) return urgencyDiff
    return a.daysUntilDepletion - b.daysUntilDepletion
  })
}

// Calculate daily usage rate for item
async function calculateDailyUsage(
  itemId: number,
  warehouseId?: number
): Promise<number> {
  const thirtyDaysAgo = subDays(new Date(), 30)

  const approvedItems = await prisma.requestItem.findMany({
    where: {
      itemId,
      request: {
        status: 'APPROVED',
        createdAt: { gte: thirtyDaysAgo },
        ...(warehouseId && { warehouseId })
      }
    },
    select: { quantity: true }
  })

  const totalQuantity = approvedItems.reduce((sum, item) => sum + item.quantity, 0)

  return totalQuantity / 30
}

// Analyze trends
export async function analyzeTrends(): Promise<TrendAnalysis[]> {
  const trends: TrendAnalysis[] = []
  const now = new Date()

  // 1. Request volume trend
  const thisMonthStart = startOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const thisMonthRequests = await prisma.request.count({
    where: { createdAt: { gte: thisMonthStart } }
  })

  const lastMonthRequests = await prisma.request.count({
    where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }
  })

  const requestChange = thisMonthRequests - lastMonthRequests
  const requestChangePercent = lastMonthRequests > 0
    ? (requestChange / lastMonthRequests) * 100
    : 0

  trends.push({
    metric: 'Request Volume',
    currentValue: thisMonthRequests,
    previousValue: lastMonthRequests,
    change: requestChange,
    changePercent: Math.round(requestChangePercent * 10) / 10,
    trend: requestChangePercent > 5 ? 'increasing' : requestChangePercent < -5 ? 'decreasing' : 'stable',
    seasonality: 'moderate'
  })

  // 2. Approval rate trend
  const thisMonthApproved = await prisma.request.count({
    where: {
      createdAt: { gte: thisMonthStart },
      status: 'APPROVED'
    }
  })

  const lastMonthApproved = await prisma.request.count({
    where: {
      createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      status: 'APPROVED'
    }
  })

  const thisMonthApprovalRate = thisMonthRequests > 0
    ? (thisMonthApproved / thisMonthRequests) * 100
    : 0

  const lastMonthApprovalRate = lastMonthRequests > 0
    ? (lastMonthApproved / lastMonthRequests) * 100
    : 0

  const approvalChange = thisMonthApprovalRate - lastMonthApprovalRate

  trends.push({
    metric: 'Approval Rate',
    currentValue: Math.round(thisMonthApprovalRate),
    previousValue: Math.round(lastMonthApprovalRate),
    change: Math.round(approvalChange * 10) / 10,
    changePercent: Math.round((approvalChange / (lastMonthApprovalRate || 1)) * 100 * 10) / 10,
    trend: approvalChange > 2 ? 'increasing' : approvalChange < -2 ? 'decreasing' : 'stable',
    seasonality: 'weak'
  })

  // 3. Active users trend
  const thisMonthUsers = await prisma.user.count({
    where: {
      status: 'ACTIVE',
      auditLogs: {
        some: { createdAt: { gte: thisMonthStart } }
      }
    }
  })

  const lastMonthUsers = await prisma.user.count({
    where: {
      status: 'ACTIVE',
      auditLogs: {
        some: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }
      }
    }
  })

  const userChange = thisMonthUsers - lastMonthUsers
  const userChangePercent = lastMonthUsers > 0
    ? (userChange / lastMonthUsers) * 100
    : 0

  trends.push({
    metric: 'Active Users',
    currentValue: thisMonthUsers,
    previousValue: lastMonthUsers,
    change: userChange,
    changePercent: Math.round(userChangePercent * 10) / 10,
    trend: userChangePercent > 5 ? 'increasing' : userChangePercent < -5 ? 'decreasing' : 'stable',
    seasonality: 'none'
  })

  // 4. Stock value trend
  const currentStockValue = await prisma.stockLevel.aggregate({
    _sum: { quantity: true }
  })

  // Compare to 30 days ago
  const thirtyDaysAgoRequests = await prisma.requestItem.aggregate({
    where: {
      request: {
        status: 'APPROVED',
        createdAt: { gte: subDays(now, 60), lt: subDays(now, 30) }
      }
    },
    _sum: { quantity: true }
  })

  const currentStock = currentStockValue._sum.quantity || 0
  const previousStock = thirtyDaysAgoRequests._sum.quantity || 0
  const stockChange = currentStock - previousStock

  trends.push({
    metric: 'Total Stock',
    currentValue: currentStock,
    previousValue: previousStock,
    change: stockChange,
    changePercent: previousStock > 0 ? Math.round((stockChange / previousStock) * 100 * 10) / 10 : 0,
    trend: stockChange > 0 ? 'increasing' : stockChange < 0 ? 'decreasing' : 'stable',
    seasonality: 'strong'
  })

  return trends
}

// Detect seasonal patterns
export async function detectSeasonality(): Promise<{
  patterns: Array<{
    name: string
    description: string
    months: number[]
    confidence: number
  }>
  insights: string[]
}> {
  // Get monthly request counts for past 2 years
  const monthlyData: Array<{ month: number; year: number; count: number }> = []

  for (let i = 24; i > 0; i--) {
    const monthStart = startOfMonth(subMonths(new Date(), i))
    const monthEnd = endOfMonth(subMonths(new Date(), i))

    const count = await prisma.request.count({
      where: {
        createdAt: { gte: monthStart, lte: monthEnd }
      }
    })

    monthlyData.push({
      month: monthStart.getMonth(),
      year: monthStart.getFullYear(),
      count
    })
  }

  // Calculate average per month
  const monthlyAverages: Record<number, number[]> = {}

  for (const data of monthlyData) {
    if (!monthlyAverages[data.month]) {
      monthlyAverages[data.month] = []
    }
    monthlyAverages[data.month].push(data.count)
  }

  const avgPerMonth: Record<number, number> = {}
  for (const [month, counts] of Object.entries(monthlyAverages)) {
    avgPerMonth[parseInt(month)] = counts.reduce((a, b) => a + b, 0) / counts.length
  }

  const overallAvg = Object.values(avgPerMonth).reduce((a, b) => a + b, 0) / 12

  // Identify peak and low months
  const patterns: Array<{
    name: string
    description: string
    months: number[]
    confidence: number
  }> = []

  const peakMonths: number[] = []
  const lowMonths: number[] = []

  for (const [monthStr, avg] of Object.entries(avgPerMonth)) {
    const month = parseInt(monthStr)
    const deviation = (avg - overallAvg) / overallAvg

    if (deviation > 0.2) {
      peakMonths.push(month)
    } else if (deviation < -0.2) {
      lowMonths.push(month)
    }
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  if (peakMonths.length > 0) {
    patterns.push({
      name: 'Peak Period',
      description: `High activity in ${peakMonths.map(m => monthNames[m]).join(', ')}`,
      months: peakMonths,
      confidence: 0.8
    })
  }

  if (lowMonths.length > 0) {
    patterns.push({
      name: 'Low Period',
      description: `Reduced activity in ${lowMonths.map(m => monthNames[m]).join(', ')}`,
      months: lowMonths,
      confidence: 0.75
    })
  }

  // Generate insights
  const insights: string[] = []

  if (peakMonths.length > 0) {
    insights.push(`Consider increasing stock levels before ${monthNames[peakMonths[0]]} to meet higher demand`)
  }

  if (lowMonths.length > 0) {
    insights.push(`${monthNames[lowMonths[0]]} typically has lower activity - good time for maintenance and audits`)
  }

  return { patterns, insights }
}

// Get predictive dashboard data
export async function getPredictiveDashboard(): Promise<{
  forecasts: Record<string, ForecastResult[]>
  stockPredictions: StockPrediction[]
  trends: TrendAnalysis[]
  seasonality: Awaited<ReturnType<typeof detectSeasonality>>
}> {
  const [forecasts, stockPredictions, trends, seasonality] = await Promise.all([
    forecastDemand(3),
    predictStockDepletion(),
    analyzeTrends(),
    detectSeasonality()
  ])

  return {
    forecasts,
    stockPredictions,
    trends,
    seasonality
  }
}
```

---

## Forecast Chart Component

```typescript
// components/analytics/forecast-chart.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'
import { forecastDemand, analyzeTrends, predictStockDepletion } from '@/lib/analytics/predictive'

export function ForecastChart() {
  const { locale } = useI18n()

  const { data: forecasts, isLoading } = useQuery({
    queryKey: ['forecasts'],
    queryFn: () => forecastDemand(3)
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const overallForecast = forecasts?.['overall'] || []

  // Simple bar chart using CSS
  const maxValue = Math.max(...overallForecast.map(f => f.upperBound))

  return (
    <div className="space-y-4">
      {overallForecast.map((forecast) => {
        const barWidth = (forecast.predicted / maxValue) * 100
        const lowerWidth = (forecast.lowerBound / maxValue) * 100
        const upperWidth = (forecast.upperBound / maxValue) * 100

        return (
          <div key={forecast.date} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{forecast.date}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {forecast.lowerBound} - {forecast.upperBound}
                </span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(forecast.confidence * 100)}% conf
                </Badge>
              </div>
            </div>
            <div className="relative h-8 bg-muted rounded">
              {/* Range bar */}
              <div
                className="absolute h-full bg-primary/20 rounded"
                style={{
                  left: `${lowerWidth - 5}%`,
                  width: `${upperWidth - lowerWidth + 10}%`
                }}
              />
              {/* Main bar */}
              <div
                className="absolute h-full bg-primary rounded transition-all"
                style={{ width: `${barWidth}%` }}
              />
              {/* Value label */}
              <div
                className="absolute inset-0 flex items-center justify-center text-sm font-medium"
                style={{ left: `${barWidth}%` }}
              >
                {forecast.predicted}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Trends Card Component
export function TrendsCard() {
  const { locale } = useI18n()

  const { data: trends, isLoading } = useQuery({
    queryKey: ['trends'],
    queryFn: analyzeTrends
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-500'
      case 'decreasing':
        return 'text-red-500'
      default:
        return 'text-yellow-500'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {locale === 'th' ? 'แนวโน้ม' : 'Trends'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trends?.map((trend) => (
            <div key={trend.metric} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getTrendIcon(trend.trend)}
                <span className="font-medium">{trend.metric}</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{trend.currentValue}</p>
                <p className={`text-xs ${getTrendColor(trend.trend)}`}>
                  {trend.changePercent > 0 ? '+' : ''}
                  {trend.changePercent}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Stock Prediction Alert Component
export function StockPredictionAlerts() {
  const { locale } = useI18n()

  const { data: predictions, isLoading } = useQuery({
    queryKey: ['stock-predictions'],
    queryFn: () => predictStockDepletion()
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  const urgentPredictions = predictions?.filter(p =>
    p.urgency === 'critical' || p.urgency === 'high'
  ).slice(0, 5)

  if (!urgentPredictions || urgentPredictions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {locale === 'th' ? 'การคาดการณ์สต็อก' : 'Stock Predictions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            {locale === 'th'
              ? 'ไม่มีสินค้าที่ใกล้หมด'
              : 'No items at risk of depletion'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const urgencyColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {locale === 'th' ? 'สินค้าใกล้หมด' : 'Items at Risk'}
          <Badge variant="destructive">{urgentPredictions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {urgentPredictions.map((prediction) => (
            <div
              key={prediction.itemId}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <p className="font-medium">{prediction.itemName}</p>
                <p className="text-sm text-muted-foreground">
                  {locale === 'th' ? 'คงเหลือ' : 'Stock'}: {prediction.currentStock} |
                  {locale === 'th' ? 'ใช้ต่อวัน' : 'Daily use'}: {prediction.dailyUsage}
                </p>
              </div>
              <div className="text-right">
                <Badge className={urgencyColors[prediction.urgency]}>
                  {prediction.daysUntilDepletion} {locale === 'th' ? 'วัน' : 'days'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {locale === 'th' ? 'สั่งซื้อ' : 'Order'}: {prediction.recommendedOrderQuantity}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Predictive dashboard page
import { ForecastChart, TrendsCard, StockPredictionAlerts } from '@/components/analytics/predictive'

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">
        {locale === 'th' ? 'การวิเคราะห์เชิงทำนาย' : 'Predictive Analytics'}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'th' ? 'พยากรณ์ความต้องการ' : 'Demand Forecast'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ForecastChart />
          </CardContent>
        </Card>

        <TrendsCard />
      </div>

      <StockPredictionAlerts />
    </div>
  )
}

// Example 2: Get stock predictions for alerts
import { predictStockDepletion } from '@/lib/analytics/predictive'

async function sendStockAlerts() {
  const predictions = await predictStockDepletion()

  const critical = predictions.filter(p => p.urgency === 'critical')

  for (const item of critical) {
    // Send notification
    await sendNotification({
      type: 'STOCK_CRITICAL',
      title: `Critical: ${item.itemName}`,
      message: `Only ${item.daysUntilDepletion} days of stock remaining`
    })
  }
}

// Example 3: Generate procurement report
import { forecastDemand, predictStockDepletion } from '@/lib/analytics/predictive'

async function generateProcurementReport() {
  const [forecasts, stockPredictions] = await Promise.all([
    forecastDemand(3),
    predictStockDepletion()
  ])

  const itemsToOrder = stockPredictions
    .filter(p => p.urgency === 'high' || p.urgency === 'critical')
    .map(p => ({
      item: p.itemName,
      currentStock: p.currentStock,
      orderQuantity: p.recommendedOrderQuantity,
      urgency: p.urgency
    }))

  return {
    forecastSummary: forecasts['overall'],
    procurementNeeds: itemsToOrder
  }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
