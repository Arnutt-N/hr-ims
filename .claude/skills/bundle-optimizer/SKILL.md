---
name: bundle-optimizer
description: Code splitting, lazy loading, and bundle analysis for HR-IMS | การแยกโค้ด การโหลดแบบขี้เกียจ และการวิเคราะห์บันเดิลสำหรับ HR-IMS
version: 1.0.0
author: HR-IMS Team
tags: [bundle, optimization, code-splitting, lazy-loading, webpack, nextjs]
languages: [en, th]
---

# Bundle Optimizer / ตัวเพิ่มประสิทธิภาพบันเดิล

Code splitting, lazy loading, and bundle analysis for HR-IMS applications.

## Overview / ภาพรวม

**EN**: Comprehensive bundle optimization system with code splitting strategies, lazy loading patterns, and bundle analysis tools for optimal frontend performance.

**TH**: ระบบเพิ่มประสิทธิภาพบันเดิลที่ครอบคลุมพร้อมกลยุทธ์การแยกโค้ด รูปแบบการโหลดแบบขี้เกียจ และเครื่องมือวิเคราะห์บันเดิลเพื่อประสิทธิภาพ frontend ที่เหมาะสมที่สุด

## Core Features / คุณสมบัติหลัก

### 1. Dynamic Imports & Lazy Loading / การนำเข้าแบบไดนามิกและการโหลดแบบขี้เกียจ

```typescript
// lib/optimization/lazy-components.tsx
import dynamic from 'next/dynamic'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Lazy load heavy components / โหลดคอมโพเนนต์หนักแบบขี้เกียจ

// Chart components - loaded only when needed / คอมโพเนนต์กราฟ - โหลดเฉพาะเมื่อต้องการ
export const LazyBarChart = dynamic(
  () => import('@/components/charts/bar-chart').then(mod => mod.BarChart),
  {
    loading: () => <LoadingSpinner />,
    ssr: false, // Charts don't need SSR / กราฟไม่ต้องการ SSR
  }
)

export const LazyLineChart = dynamic(
  () => import('@/components/charts/line-chart').then(mod => mod.LineChart),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

// Modal components - loaded on interaction / คอมโพเนนต์ Modal - โหลดเมื่อมีการโต้ตอบ
export const LazyInventoryForm = dynamic(
  () => import('@/components/inventory/inventory-form').then(mod => mod.InventoryForm),
  {
    loading: () => <LoadingSpinner />,
  }
)

export const LazyUserForm = dynamic(
  () => import('@/components/users/user-form').then(mod => mod.UserForm),
  {
    loading: () => <LoadingSpinner />,
  }
)

// Report generator - loaded for reports page / ตัวสร้างรายงาน - โหลดสำหรับหน้ารายงาน
export const LazyReportGenerator = dynamic(
  () => import('@/components/reports/report-generator').then(mod => mod.ReportGenerator),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)

// Scanner component - camera access / คอมโพเนนต์สแกนเนอร์ - เข้าถึงกล้อง
export const LazyQRScanner = dynamic(
  () => import('@/components/scanner/qr-scanner').then(mod => mod.QRScanner),
  {
    loading: () => <LoadingSpinner />,
    ssr: false,
  }
)
```

### 2. Route-Based Code Splitting / การแยกโค้ดตามเส้นทาง

```typescript
// app/(dashboard)/layout.tsx
import dynamic from 'next/dynamic'

// Lazy load dashboard sections / โหลดส่วนแดชบอร์ดแบบขี้เกียจ
const DashboardStats = dynamic(
  () => import('@/components/dashboard/stats').then(mod => mod.DashboardStats),
  { loading: () => <StatsSkeleton /> }
)

const RecentActivity = dynamic(
  () => import('@/components/dashboard/recent-activity').then(mod => mod.RecentActivity),
  { loading: () => <ActivitySkeleton /> }
)

const Notifications = dynamic(
  () => import('@/components/dashboard/notifications').then(mod => mod.Notifications),
  { loading: () => <NotificationsSkeleton /> }
)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {/* Load stats immediately / โหลดสถิติทันที */}
      <DashboardStats />

      {/* Defer less critical sections / เลื่อนส่วนที่ไม่สำคัญน้อย */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentActivity />
        <Notifications />
      </div>

      {children}
    </div>
  )
}
```

### 3. Component-Level Lazy Loading / การโหลดแบบขี้เกียจระดับคอมโพเนนต์

```typescript
// components/optimization/lazy-wrapper.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
  threshold?: number
  trigger?: 'visible' | 'interaction' | 'delay'
  delayMs?: number
}

// Lazy wrapper with intersection observer / ตัวห่อ lazy กับ intersection observer
export function LazyWrapper({
  children,
  fallback = <LoadingSpinner />,
  rootMargin = '200px',
  threshold = 0.1,
  trigger = 'visible',
  delayMs = 0,
}: LazyWrapperProps) {
  const [shouldLoad, setShouldLoad] = useState(trigger === 'delay')
  const [isLoaded, setIsLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Visible trigger - load when in viewport / ทริกเกอร์การมองเห็น - โหลดเมื่ออยู่ในวิวพอร์ต
  useEffect(() => {
    if (trigger !== 'visible' || !ref.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [trigger, rootMargin, threshold])

  // Delay trigger - load after delay / ทริกเกอร์ความล่าช้า - โหลดหลังจากความล่าช้า
  useEffect(() => {
    if (trigger !== 'delay' || delayMs === 0) return

    const timer = setTimeout(() => setShouldLoad(true), delayMs)
    return () => clearTimeout(timer)
  }, [trigger, delayMs])

  // Interaction trigger - load on user interaction / ทริกเกอร์การโต้ตอบ - โหลดเมื่อมีการโต้ตอบ
  const handleInteraction = useCallback(() => {
    if (trigger === 'interaction') {
      setShouldLoad(true)
    }
  }, [trigger])

  if (!shouldLoad) {
    return (
      <div ref={ref} onClick={handleInteraction} onMouseEnter={handleInteraction}>
        {fallback}
      </div>
    )
  }

  return <>{children}</>
}

// Usage example / ตัวอย่างการใช้งาน
// <LazyWrapper trigger="visible">
//   <HeavyComponent />
// </LazyWrapper>
```

### 4. Bundle Analysis Configuration / การกำหนดค่าการวิเคราะห์บันเดิล

```typescript
// next.config.ts - Bundle analysis configuration
import type { NextConfig } from 'next'

const config: NextConfig = {
  // Webpack bundle analyzer / ตัววิเคราะห์บันเดิล Webpack
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
          openAnalyzer: false,
        })
      )
    }
    return config
  },

  // Experimental optimizations / การเพิ่มประสิทธิภาพทดลอง
  experimental: {
    optimizePackageImports: [
      '@tanstack/react-query',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      'lucide-react',
      'date-fns',
    ],
  },

  // Modularize imports / การนำเข้าแบบโมดูล
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
}

export default config
```

### 5. Chunk Splitting Strategy / กลยุทธ์การแยกชั้น

```typescript
// lib/optimization/chunk-config.ts

// Vendor chunks configuration / การกำหนดค่าชั้น vendor
export const VENDOR_CHUNKS = {
  // React core - always needed / React core - ต้องการเสมอ
  react: ['react', 'react-dom', 'react/jsx-runtime'],

  // UI components - commonly used / คอมโพเนนต์ UI - ใช้บ่อย
  ui: [
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-select',
    '@radix-ui/react-tabs',
  ],

  // Data fetching - dashboard pages / การดึงข้อมูล - หน้าแดชบอร์ด
  data: ['@tanstack/react-query'],

  // Charts - reports only / กราฟ - รายงานเท่านั้น
  charts: ['recharts', 'd3'],

  // Date handling - common utility / การจัดการวันที่ - ยูทิลิตี้ทั่วไป
  date: ['date-fns'],

  // Forms - CRUD pages / ฟอร์ม - หน้า CRUD
  forms: ['react-hook-form', '@hookform/resolvers', 'zod'],

  // Icons - spread across pages / ไอคอน - กระจายทั่วหน้า
  icons: ['lucide-react'],
}

// Route-based chunk groups / กลุ่มชั้นตามเส้นทาง
export const ROUTE_CHUNKS = {
  dashboard: [
    'app/(dashboard)/dashboard',
    'components/dashboard',
  ],
  inventory: [
    'app/(dashboard)/inventory',
    'components/inventory',
  ],
  requests: [
    'app/(dashboard)/requests',
    'components/requests',
  ],
  reports: [
    'app/(dashboard)/reports',
    'components/reports',
    'components/charts',
  ],
  admin: [
    'app/(dashboard)/users',
    'app/(dashboard)/settings',
    'app/(dashboard)/logs',
  ],
}

// Estimated chunk sizes / ขนาดชั้นโดยประมาณ
export const CHUNK_SIZE_ESTIMATES = {
  react: '~140KB',
  ui: '~200KB',
  data: '~45KB',
  charts: '~300KB',
  date: '~70KB',
  forms: '~80KB',
  icons: '~20KB per icon set',
}
```

### 6. Preload Strategies / กลยุทธ์การโหลดล่วงหน้า

```typescript
// lib/optimization/preload.ts

// Preload critical resources / โหลดทรัพยากรสำคัญล่วงหน้า
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return

  // Preload fonts / โหลดฟอนต์ล่วงหน้า
  const fontLink = document.createElement('link')
  fontLink.rel = 'preload'
  fontLink.as = 'font'
  fontLink.href = '/fonts/inter-var.woff2'
  fontLink.type = 'font/woff2'
  fontLink.crossOrigin = 'anonymous'
  document.head.appendChild(fontLink)

  // Preload critical CSS / โหลด CSS สำคัญล่วงหน้า
  const cssLink = document.createElement('link')
  cssLink.rel = 'preload'
  cssLink.as = 'style'
  cssLink.href = '/css/critical.css'
  document.head.appendChild(cssLink)
}

// Prefetch likely next pages / ดึงข้อมูลหน้าถัดไปที่น่าจะใช้ล่วงหน้า
export function prefetchLikelyPages(currentPath: string) {
  const prefetchMap: Record<string, string[]> = {
    '/dashboard': ['/inventory', '/requests', '/my-assets'],
    '/inventory': ['/inventory/new', '/requests', '/cart'],
    '/requests': ['/requests/new', '/inventory'],
    '/my-assets': ['/requests/new', '/inventory'],
  }

  const pagesToPrefetch = prefetchMap[currentPath] || []

  pagesToPrefetch.forEach(page => {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = page
    document.head.appendChild(link)
  })
}

// Preconnect to external domains / เชื่อมต่อล่วงหน้ากับโดเมนภายนอก
export function preconnectDomains() {
  if (typeof window === 'undefined') return

  const domains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ]

  domains.forEach(domain => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = domain
    document.head.appendChild(link)
  })
}

// Hook for component preloading / Hook สำหรับการโหลดคอมโพเนนต์ล่วงหน้า
import { useCallback, useEffect } from 'react'

export function usePreloadComponent(
  componentLoader: () => Promise<unknown>,
  options: {
    delay?: number
    onHover?: boolean
    onFocus?: boolean
    onVisible?: boolean
  } = {}
) {
  const { delay = 0, onHover = false, onFocus = false, onVisible = false } = options

  const preload = useCallback(() => {
    const timer = setTimeout(() => {
      componentLoader().catch(console.error)
    }, delay)
    return () => clearTimeout(timer)
  }, [componentLoader, delay])

  useEffect(() => {
    if (!onHover && !onFocus && !onVisible) {
      return preload()
    }
  }, [onHover, onFocus, onVisible, preload])

  return {
    onMouseEnter: onHover ? preload : undefined,
    onFocus: onFocus ? preload : undefined,
  }
}

// Usage example / ตัวอย่างการใช้งาน
// const { onMouseEnter } = usePreloadComponent(
//   () => import('@/components/inventory/inventory-form'),
//   { onHover: true, delay: 200 }
// )
// <Button onMouseEnter={onMouseEnter}>Add Item</Button>
```

### 7. Bundle Size Monitoring / การติดตามขนาดบันเดิล

```typescript
// lib/optimization/bundle-monitor.ts
interface BundleMetrics {
  name: string
  size: number
  gzipSize: number
  chunks: string[]
}

interface BundleWarning {
  chunk: string
  size: number
  threshold: number
  message: string
}

class BundleMonitor {
  private thresholds = {
    page: 200 * 1024,      // 200KB per page
    vendor: 500 * 1024,    // 500KB for vendor chunks
    total: 1024 * 1024,    // 1MB total initial bundle
  }

  // Check bundle sizes against thresholds / ตรวจสอบขนาดบันเดิลกับเกณฑ์
  checkSizes(metrics: BundleMetrics[]): BundleWarning[] {
    const warnings: BundleWarning[] = []

    metrics.forEach(metric => {
      const threshold = metric.name.includes('vendor')
        ? this.thresholds.vendor
        : this.thresholds.page

      if (metric.size > threshold) {
        warnings.push({
          chunk: metric.name,
          size: metric.size,
          threshold,
          message: `Chunk ${metric.name} (${(metric.size / 1024).toFixed(0)}KB) exceeds threshold (${(threshold / 1024).toFixed(0)}KB)`,
        })
      }
    })

    const totalSize = metrics.reduce((sum, m) => sum + m.size, 0)
    if (totalSize > this.thresholds.total) {
      warnings.push({
        chunk: 'total',
        size: totalSize,
        threshold: this.thresholds.total,
        message: `Total bundle size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds threshold (${(this.thresholds.total / 1024 / 1024).toFixed(2)}MB)`,
      })
    }

    return warnings
  }

  // Generate bundle report / สร้างรายงานบันเดิล
  generateReport(metrics: BundleMetrics[]): string {
    const warnings = this.checkSizes(metrics)

    let report = '# Bundle Size Report / รายงานขนาดบันเดิล\n\n'

    report += '## Chunks\n'
    metrics.forEach(m => {
      const status = m.size > this.thresholds.page ? '⚠️' : '✅'
      report += `- ${status} ${m.name}: ${(m.size / 1024).toFixed(0)}KB (gzip: ${(m.gzipSize / 1024).toFixed(0)}KB)\n`
    })

    if (warnings.length > 0) {
      report += '\n## Warnings / คำเตือน\n'
      warnings.forEach(w => {
        report += `- ⚠️ ${w.message}\n`
      })
    }

    return report
  }
}

export const bundleMonitor = new BundleMonitor()
```

## Usage Examples / ตัวอย่างการใช้งาน

### Analyze Bundle / วิเคราะห์บันเดิล

```bash
# Generate bundle analysis / สร้างการวิเคราะห์บันเดิล
ANALYZE=true npm run build

# Output: analyze/client.html and analyze/server.html
```

### Lazy Load Component / โหลดคอมโพเนนต์แบบขี้เกียจ

```typescript
// Using dynamic import / ใช้ dynamic import
const HeavyChart = dynamic(
  () => import('@/components/charts/heavy-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
)

// Using LazyWrapper / ใช้ LazyWrapper
<LazyWrapper trigger="visible" rootMargin="100px">
  <HeavyChart data={chartData} />
</LazyWrapper>
```

## Best Practices / แนวทางปฏิบัติ

1. **Prioritize Critical Path**: Load essential content first
   - **จัดลำดับความสำคัญเส้นทางหลัก**: โหลดเนื้อหาสำคัญก่อน

2. **Use Appropriate Chunk Sizes**: Balance between too many and too few chunks
   - **ใช้ขนาดชั้นที่เหมาะสม**: สมดุลระหว่างชั้นมากเกินไปและน้อยเกินไป

3. **Preload Strategically**: Preload resources that will likely be needed
   - **โหลดล่วงหน้าอย่างยุทธศาสตร์**: โหลดทรัพยากรที่น่าจะต้องการล่วงหน้า

4. **Monitor Bundle Size**: Keep track of bundle size changes
   - **ติดตามขนาดบันเดิล**: ติดตามการเปลี่ยนแปลงขนาดบันเดิล

## Related Skills / Skills ที่เกี่ยวข้อง

- `image-optimizer` - Image optimization
- `performance-monitor` - Performance monitoring
- `caching-optimizer` - Caching strategies
