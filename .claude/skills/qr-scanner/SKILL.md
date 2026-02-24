---
name: qr-scanner
description: QR code and barcode scanning for inventory and asset tracking
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["qr", "barcode", "scan", "scanner", "asset tag"]
  file_patterns: ["*scanner*", "*qr*", "app/(dashboard)/scanner/**"]
  context: scanning, asset tracking, identification
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# QR Scanner

## Core Role

Implement QR code and barcode scanning for HR-IMS:
- Generate QR codes for inventory items
- Scan QR/barcodes via camera or input
- Track assets by scanning
- Batch scanning support

---

## QR Code Generation

### Server-Side Generation

```typescript
// lib/utils/qr-generator.ts
import QRCode from 'qrcode'

interface QRData {
  type: 'item' | 'asset' | 'location' | 'user'
  id: number
  code: string
}

export async function generateQRCode(data: QRData): Promise<string> {
  const payload = JSON.stringify({
    t: data.type.charAt(0), // i=item, a=asset, l=location, u=user
    i: data.id,
    c: data.code
  })

  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  })

  return qrDataUrl
}

// Generate for inventory item
export async function generateItemQRCode(itemId: number): Promise<string> {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId }
  })

  if (!item) throw new Error('Item not found')

  return generateQRCode({
    type: 'item',
    id: itemId,
    code: item.serialNumber || `ITEM-${itemId}`
  })
}
```

### Bulk QR Generation

```typescript
// lib/actions/qr.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { generateQRCode } from '@/lib/utils/qr-generator'

export async function generateBulkQRCodes(itemIds: number[]) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  try {
    const items = await prisma.inventoryItem.findMany({
      where: { id: { in: itemIds } }
    })

    const qrCodes = await Promise.all(
      items.map(async (item) => ({
        itemId: item.id,
        itemName: item.name,
        serialNumber: item.serialNumber,
        qrCode: await generateQRCode({
          type: 'item',
          id: item.id,
          code: item.serialNumber || `ITEM-${item.id}`
        })
      }))
    )

    return { success: true, data: qrCodes }
  } catch (error) {
    return { error: 'Failed to generate QR codes', code: 'INTERNAL_ERROR' }
  }
}
```

---

## Scanner Component

```typescript
// components/scanner/qr-scanner.tsx
'use client'

import { useState, useCallback } from 'react'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

interface QRScannerProps {
  onScan: (data: string) => void
  onError?: (error: Error) => void
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [lastScan, setLastScan] = useState<string | null>(null)
  const codeReader = new BrowserMultiFormatReader()

  const startScanning = useCallback(async (videoElement: HTMLVideoElement) => {
    try {
      setIsScanning(true)
      const devices = await codeReader.listVideoInputDevices()

      if (devices.length === 0) {
        throw new Error('No camera found')
      }

      // Prefer back camera on mobile
      const selectedDevice = devices.find(d =>
        d.label.toLowerCase().includes('back')
      ) || devices[0]

      await codeReader.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoElement,
        (result, error) => {
          if (result) {
            const text = result.getText()
            if (text !== lastScan) {
              setLastScan(text)
              onScan(text)
            }
          }
          if (error && !(error instanceof NotFoundException)) {
            onError?.(error)
          }
        }
      )
    } catch (error) {
      onError?.(error as Error)
      setIsScanning(false)
    }
  }, [codeReader, lastScan, onScan, onError])

  const stopScanning = useCallback(() => {
    codeReader.reset()
    setIsScanning(false)
    setLastScan(null)
  }, [codeReader])

  return {
    isScanning,
    startScanning,
    stopScanning,
    lastScan
  }
}
```

### Scanner Page Component

```typescript
// app/(dashboard)/scanner/page.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { processScannedData } from '@/lib/actions/scanner'

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [manualInput, setManualInput] = useState('')
  const [scanHistory, setScanHistory] = useState<string[]>([])

  const handleScan = async (data: string) => {
    setScanHistory(prev => [data, ...prev.slice(0, 9)])

    const result = await processScannedData(data)
    setScanResult(result)
  }

  const handleManualSubmit = async () => {
    if (manualInput.trim()) {
      await handleScan(manualInput.trim())
      setManualInput('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">QR/Barcode Scanner</h1>
        <Button
          variant={isScanning ? 'destructive' : 'default'}
          onClick={() => setIsScanning(!isScanning)}
        >
          {isScanning ? 'Stop Scanning' : 'Start Scanning'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scanner Area */}
        <Card className="p-4">
          <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
            />
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/50 rounded-lg animate-pulse" />
              </div>
            )}
          </div>

          {/* Manual Input */}
          <div className="mt-4 flex gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Enter code manually..."
              className="flex-1 px-3 py-2 border rounded-md"
            />
            <Button onClick={handleManualSubmit}>Search</Button>
          </div>
        </Card>

        {/* Scan Result */}
        <Card className="p-4">
          <h2 className="font-semibold mb-4">Scan Result</h2>
          {scanResult ? (
            <div className="space-y-4">
              {scanResult.success ? (
                <>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="font-medium text-green-800">
                      {scanResult.data.type} Found
                    </p>
                    <p className="text-sm text-green-600">
                      ID: {scanResult.data.id}
                    </p>
                  </div>
                  <Button asChild>
                    <a href={scanResult.data.link}>View Details</a>
                  </Button>
                </>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-red-800">{scanResult.error}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Scan a QR code to see results</p>
          )}
        </Card>
      </div>

      {/* Scan History */}
      <Card className="p-4">
        <h2 className="font-semibold mb-4">Recent Scans</h2>
        {scanHistory.length > 0 ? (
          <div className="space-y-2">
            {scanHistory.map((code, i) => (
              <div key={i} className="flex justify-between p-2 bg-muted rounded">
                <span className="font-mono text-sm">{code}</span>
                <span className="text-muted-foreground text-xs">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No scans yet</p>
        )}
      </Card>
    </div>
  )
}
```

---

## Data Processing

```typescript
// lib/actions/scanner.ts
'use server'

import { auth } from '@/auth'
import prisma from '@/lib/prisma'

interface ScanResult {
  success: boolean
  data?: {
    type: 'item' | 'asset' | 'location' | 'user'
    id: number
    code: string
    link: string
  }
  error?: string
}

export async function processScannedData(scannedData: string): Promise<ScanResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // Try to parse as JSON (our QR format)
    if (scannedData.startsWith('{') || scannedData.startsWith('%7B')) {
      const decoded = decodeURIComponent(scannedData)
      const parsed = JSON.parse(decoded)

      const typeMap: Record<string, string> = {
        'i': 'item',
        'a': 'asset',
        'l': 'location',
        'u': 'user'
      }

      const type = typeMap[parsed.t]

      if (type === 'item') {
        const item = await prisma.inventoryItem.findUnique({
          where: { id: parsed.i }
        })
        if (item) {
          return {
            success: true,
            data: {
              type: 'item',
              id: item.id,
              code: parsed.c,
              link: `/inventory/${item.id}`
            }
          }
        }
      }
    }

    // Try to find by serial number
    const itemBySerial = await prisma.inventoryItem.findFirst({
      where: { serialNumber: scannedData }
    })
    if (itemBySerial) {
      return {
        success: true,
        data: {
          type: 'item',
          id: itemBySerial.id,
          code: scannedData,
          link: `/inventory/${itemBySerial.id}`
        }
      }
    }

    // Try to find by item code
    const itemByCode = await prisma.inventoryItem.findFirst({
      where: {
        OR: [
          { serialNumber: { contains: scannedData } },
          { name: { contains: scannedData } }
        ]
      }
    })
    if (itemByCode) {
      return {
        success: true,
        data: {
          type: 'item',
          id: itemByCode.id,
          code: scannedData,
          link: `/inventory/${itemByCode.id}`
        }
      }
    }

    return { success: false, error: 'Item not found' }

  } catch (error) {
    // Not JSON, try as serial number or code
    try {
      const item = await prisma.inventoryItem.findFirst({
        where: {
          OR: [
            { serialNumber: scannedData },
            { serialNumber: { contains: scannedData } }
          ]
        }
      })

      if (item) {
        return {
          success: true,
          data: {
            type: 'item',
            id: item.id,
            code: scannedData,
            link: `/inventory/${item.id}`
          }
        }
      }

      return { success: false, error: 'Invalid code format' }
    } catch {
      return { success: false, error: 'Scan processing failed' }
    }
  }
}
```

---

## Batch Operations

```typescript
export async function batchScanAction(itemIds: number[], action: 'checkout' | 'checkin' | 'inventory') {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const results = []

  for (const itemId of itemIds) {
    switch (action) {
      case 'checkout':
        // Create checkout request
        results.push({ itemId, status: 'checked_out' })
        break
      case 'checkin':
        // Process return
        results.push({ itemId, status: 'checked_in' })
        break
      case 'inventory':
        // Record inventory count
        results.push({ itemId, status: 'counted' })
        break
    }
  }

  return { success: true, data: results }
}
```

---

## Print QR Labels

```typescript
export async function printQRLabels(itemIds: number[]) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } }
  })

  const labels = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      name: item.name,
      serialNumber: item.serialNumber,
      qrCode: await generateQRCode({
        type: 'item',
        id: item.id,
        code: item.serialNumber || `ITEM-${item.id}`
      })
    }))
  )

  return { success: true, data: labels }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
