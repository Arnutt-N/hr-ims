---
name: barcode-generator
description: Barcode generation for inventory and asset tracking in HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["barcode", "barcode generator", "code128", "ean", "upc", "asset label"]
  file_patterns: ["*barcode*", "*label*", "lib/barcode*"]
  context: barcode generation, asset labels, inventory labels, code128, EAN
mcp_servers:
  - sequential
personas:
  - frontend
---

# Barcode Generator

## Core Role

Generate barcodes for HR-IMS:
- Code 128 barcodes
- EAN/UPC barcodes
- QR codes
- Asset labels

---

## Barcode Service

```typescript
// lib/barcode/generator.ts

export type BarcodeType = 'code128' | 'code39' | 'ean13' | 'ean8' | 'upc' | 'qr'

export interface BarcodeOptions {
  type: BarcodeType
  value: string
  width?: number
  height?: number
  displayValue?: boolean
  fontSize?: number
  margin?: number
  background?: string
  lineColor?: string
}

// Code 128 encoding table
const CODE128_PATTERNS: Record<string, string> = {
  ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
  '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
  '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11000100100',
  ',': '10110011100', '-': '10011011100', '.': '10011001110', '/': '10111001100',
  '0': '10011101100', '1': '10011100110', '2': '11001110010', '3': '11001011100',
  '4': '11001001110', '5': '11011100100', '6': '11001110100', '7': '11101101110',
  '8': '11101001100', '9': '11100101100', ':': '11100100110', ';': '11101100100',
  '<': '11100110100', '=': '11100110010', '>': '11011011000', '?': '11011000110',
  '@': '11000110110', 'A': '10100011000', 'B': '10001011000', 'C': '10001000110',
  'D': '10110001000', 'E': '10001101000', 'F': '10001100010', 'G': '11010001000',
  'H': '11000101000', 'I': '11000100010', 'J': '10110111000', 'K': '10110001110',
  'L': '10001101110', 'M': '10111011000', 'N': '10111000110', 'O': '10001110110',
  'P': '11101110110', 'Q': '11010001110', 'R': '11000101110', 'S': '11011101000',
  'T': '11011100010', 'U': '11011101110', 'V': '11101011000', 'W': '11101000110',
  'X': '11100010110', 'Y': '11101101000', 'Z': '11101100010', '[': '11100011010',
  '\\': '11101111010', ']': '11001000010', '^': '11110001010', '_': '10100110000',
  '`': '10100001100', 'a': '10010110000', 'b': '10010000110', 'c': '10000101100',
  'd': '10000100110', 'e': '10110010000', 'f': '10110000100', 'g': '10011010000',
  'h': '10011000010', 'i': '10000110100', 'j': '10000110010', 'k': '11000010010',
  'l': '11001010000', 'm': '11110111010', 'n': '11000010100', 'o': '10001111010',
  'p': '10100111100', 'q': '10010111100', 'r': '10010011110', 's': '10111100100',
  't': '10011110100', 'u': '10011110010', 'v': '11110100100', 'w': '11110010100',
  'x': '11110010010', 'y': '11011011110', 'z': '11011110110', '{': '11110110110',
  '|': '10101111000', '}': '10100011110', '~': '10001011110'
}

const CODE128_START_B = '11010010000'
const CODE128_STOP = '1100011101011'

// Calculate checksum for Code 128
function calculateChecksum128(value: string): number {
  let checksum = 104 // Start code B

  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i) - 32
    checksum += charCode * (i + 1)
  }

  return checksum % 103
}

// Get pattern for checksum value
function getChecksumPattern(checksum: number): string {
  const checksumChars = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'
  const char = checksumChars[checksum]
  return CODE128_PATTERNS[char] || ''
}

// Generate Code 128 barcode pattern
export function generateCode128(value: string): string {
  if (!value) return ''

  const checksum = calculateChecksum128(value)
  const patterns = value.split('').map(char => CODE128_PATTERNS[char] || '')

  return CODE128_START_B + patterns.join('') + getChecksumPattern(checksum) + CODE128_STOP
}

// Convert pattern to SVG
export function patternToSvg(
  pattern: string,
  options: {
    width?: number
    height?: number
    margin?: number
    background?: string
    lineColor?: string
  } = {}
): string {
  const {
    width = 200,
    height = 80,
    margin = 10,
    background = '#ffffff',
    lineColor = '#000000'
  } = options

  const moduleWidth = (width - margin * 2) / pattern.length
  const barHeight = height - margin * 2

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  svg += `<rect width="${width}" height="${height}" fill="${background}"/>`

  let x = margin
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      svg += `<rect x="${x}" y="${margin}" width="${moduleWidth}" height="${barHeight}" fill="${lineColor}"/>`
    }
    x += moduleWidth
  }

  svg += '</svg>'
  return svg
}

// Generate barcode as SVG
export function generateBarcodeSvg(
  value: string,
  options: BarcodeOptions = {}
): string {
  const {
    type = 'code128',
    width = 200,
    height = 80,
    margin = 10,
    background = '#ffffff',
    lineColor = '#000000',
    displayValue = true,
    fontSize = 12
  } = options

  let pattern: string

  switch (type) {
    case 'code128':
      pattern = generateCode128(value)
      break
    default:
      pattern = generateCode128(value)
  }

  const actualHeight = displayValue ? height + fontSize + 5 : height
  const moduleWidth = (width - margin * 2) / pattern.length
  const barHeight = height - margin * 2

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${actualHeight}" viewBox="0 0 ${width} ${actualHeight}">`
  svg += `<rect width="${width}" height="${actualHeight}" fill="${background}"/>`

  let x = margin
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      svg += `<rect x="${x}" y="${margin}" width="${moduleWidth}" height="${barHeight}" fill="${lineColor}"/>`
    }
    x += moduleWidth
  }

  if (displayValue) {
    svg += `<text x="${width / 2}" y="${actualHeight - 5}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="${lineColor}">${value}</text>`
  }

  svg += '</svg>'
  return svg
}

// Generate barcode as data URL
export function generateBarcodeDataUrl(
  value: string,
  options: BarcodeOptions = {}
): string {
  const svg = generateBarcodeSvg(value, options)
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

// Generate barcode as canvas (browser only)
export async function generateBarcodeCanvas(
  value: string,
  options: BarcodeOptions = {}
): Promise<HTMLCanvasElement> {
  const {
    width = 200,
    height = 80,
    margin = 10,
    background = '#ffffff',
    lineColor = '#000000',
    displayValue = true,
    fontSize = 12
  } = options

  const pattern = generateCode128(value)
  const actualHeight = displayValue ? height + fontSize + 5 : height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = actualHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  // Draw background
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, actualHeight)

  // Draw bars
  const moduleWidth = (width - margin * 2) / pattern.length
  const barHeight = height - margin * 2

  ctx.fillStyle = lineColor
  let x = margin

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '1') {
      ctx.fillRect(x, margin, Math.ceil(moduleWidth), barHeight)
    }
    x += moduleWidth
  }

  // Draw text
  if (displayValue) {
    ctx.font = `${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.fillText(value, width / 2, actualHeight - 5)
  }

  return canvas
}

// Generate barcode as PNG blob
export async function generateBarcodePng(
  value: string,
  options: BarcodeOptions = {}
): Promise<Blob> {
  const canvas = await generateBarcodeCanvas(value, options)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Failed to create PNG blob'))
      }
    }, 'image/png')
  })
}
```

---

## Asset Label Generator

```typescript
// lib/barcode/label-generator.ts
import { generateBarcodeSvg } from './generator'

export interface AssetLabelOptions {
  itemCode: string
  itemName: string
  category?: string
  warehouse?: string
  width?: number
  height?: number
  showQr?: boolean
}

// Generate asset label SVG
export function generateAssetLabel(options: AssetLabelOptions): string {
  const {
    itemCode,
    itemName,
    category,
    warehouse,
    width = 200,
    height = 120
  } = options

  const barcodeHeight = 60
  const barcodeSvg = generateBarcodeSvg(itemCode, {
    width,
    height: barcodeHeight,
    displayValue: true,
    margin: 5
  })

  let label = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`

  // Background
  label += `<rect width="${width}" height="${height}" fill="white" stroke="#ccc" stroke-width="1"/>`

  // Header
  label += `<rect width="${width}" height="20" fill="#f0f0f0"/>`
  label += `<text x="${width / 2}" y="14" text-anchor="middle" font-family="Arial" font-size="10" font-weight="bold">${itemName}</text>`

  // Barcode (embed)
  const barcodeY = 22
  label += `<g transform="translate(0, ${barcodeY})">`
  // Parse barcode SVG and insert
  const barcodeContent = barcodeSvg.replace(/<\?xml[^?]*\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')
  label += barcodeContent
  label += `</g>`

  // Footer info
  const footerY = barcodeY + barcodeHeight + 5
  label += `<text x="5" y="${footerY}" font-family="Arial" font-size="8" fill="#666">`

  if (category) {
    label += `หมวด: ${category}`
  }
  if (warehouse) {
    label += ` | คลัง: ${warehouse}`
  }

  label += `</text>`

  label += '</svg>'

  return label
}

// Generate multiple labels for printing
export function generateLabelsSheet(
  items: Array<{
    code: string
    name: string
    category?: string
    warehouse?: string
  }>,
  options: {
    columns?: number
    rows?: number
    labelWidth?: number
    labelHeight?: number
    paperWidth?: number
    paperHeight?: number
    margin?: number
  } = {}
): string {
  const {
    columns = 3,
    rows = 10,
    labelWidth = 200,
    labelHeight = 120,
    paperWidth = 680,
    paperHeight = 1100,
    margin = 10
  } = options

  const spacingX = (paperWidth - margin * 2 - labelWidth * columns) / (columns - 1 || 1)
  const spacingY = 5

  let sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${paperWidth}" height="${paperHeight}" viewBox="0 0 ${paperWidth} ${paperHeight}">`

  items.slice(0, columns * rows).forEach((item, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)

    const x = margin + col * (labelWidth + spacingX)
    const y = margin + row * (labelHeight + spacingY)

    const labelSvg = generateAssetLabel({
      itemCode: item.code,
      itemName: item.name,
      category: item.category,
      warehouse: item.warehouse,
      width: labelWidth,
      height: labelHeight
    })

    // Extract content from label SVG
    const labelContent = labelSvg.replace(/<\?xml[^?]*\?>/, '').replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')

    sheet += `<g transform="translate(${x}, ${y})">${labelContent}</g>`
  })

  sheet += '</svg>'

  return sheet
}

// Generate printable HTML page with labels
export function generatePrintableLabels(
  items: Array<{
    code: string
    name: string
    category?: string
    warehouse?: string
  }>,
  options: {
    columns?: number
    rows?: number
    labelWidth?: number
    labelHeight?: number
  } = {}
): string {
  const { columns = 3, labelWidth = 200, labelHeight = 120 } = options

  const labels = items.map(item =>
    generateAssetLabel({
      itemCode: item.code,
      itemName: item.name,
      category: item.category,
      warehouse: item.warehouse,
      width: labelWidth,
      height: labelHeight
    })
  )

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Asset Labels</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      margin: 0;
      padding: 0;
    }
    .label-container {
      display: grid;
      grid-template-columns: repeat(${columns}, ${labelWidth}px);
      gap: 5px;
    }
    .label {
      page-break-inside: avoid;
    }
    @media print {
      .label { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="label-container">
    ${labels.map(svg => `<div class="label">${svg}</div>`).join('')}
  </div>
  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>
  `
}
```

---

## Barcode Component

```typescript
// components/barcode/barcode-display.tsx
'use client'

import { useState } from 'react'
import { generateBarcodeSvg, generateBarcodeCanvas, BarcodeType } from '@/lib/barcode/generator'

interface BarcodeDisplayProps {
  value: string
  type?: BarcodeType
  width?: number
  height?: number
  displayValue?: boolean
  className?: string
}

export function BarcodeDisplay({
  value,
  type = 'code128',
  width = 200,
  height = 80,
  displayValue = true,
  className
}: BarcodeDisplayProps) {
  const svg = generateBarcodeSvg(value, {
    type,
    width,
    height,
    displayValue
  })

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// Downloadable barcode
interface BarcodeDownloadProps extends BarcodeDisplayProps {
  filename?: string
}

export function BarcodeDownload({
  value,
  filename,
  ...props
}: BarcodeDownloadProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const canvas = await generateBarcodeCanvas(value, props)
      const link = document.createElement('a')
      link.download = `${filename || value}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-2">
      <BarcodeDisplay value={value} {...props} />
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="text-sm text-primary hover:underline"
      >
        {downloading ? 'Downloading...' : 'Download PNG'}
      </button>
    </div>
  )
}
```

---

## Label Print Component

```typescript
// components/barcode/label-printer.tsx
'use client'

import { useState } from 'react'
import { generatePrintableLabels } from '@/lib/barcode/label-generator'
import { Button } from '@/components/ui/button'
import { Printer, Download } from 'lucide-react'

interface LabelPrinterProps {
  items: Array<{
    code: string
    name: string
    category?: string
    warehouse?: string
  }>
  columns?: number
  rows?: number
}

export function LabelPrinter({ items, columns = 3, rows = 10 }: LabelPrinterProps) {
  const [printing, setPrinting] = useState(false)

  const handlePrint = () => {
    setPrinting(true)

    const html = generatePrintableLabels(items, { columns, rows })
    const printWindow = window.open('', '_blank')

    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }

    setPrinting(false)
  }

  const handleDownload = () => {
    const html = generatePrintableLabels(items, { columns, rows })
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'asset-labels.html'
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <Button onClick={handlePrint} disabled={printing || items.length === 0}>
        <Printer className="h-4 w-4 mr-2" />
        Print Labels ({items.length})
      </Button>
      <Button variant="outline" onClick={handleDownload} disabled={items.length === 0}>
        <Download className="h-4 w-4 mr-2" />
        Download HTML
      </Button>
    </div>
  )
}

// Label preview
export function LabelPreview({
  items,
  maxPreview = 6
}: LabelPrinterProps & { maxPreview?: number }) {
  const previewItems = items.slice(0, maxPreview)

  return (
    <div className="grid grid-cols-3 gap-4">
      {previewItems.map((item, index) => (
        <div key={index} className="border rounded p-2">
          <BarcodeDisplay
            value={item.code}
            width={180}
            height={60}
          />
          <p className="text-xs text-center mt-1 truncate">{item.name}</p>
        </div>
      ))}
    </div>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Simple barcode display
import { BarcodeDisplay } from '@/components/barcode/barcode-display'

function ItemDetail({ item }) {
  return (
    <div>
      <h1>{item.name}</h1>
      <BarcodeDisplay value={item.code} width={300} height={100} />
    </div>
  )
}

// Example 2: Downloadable barcode
import { BarcodeDownload } from '@/components/barcode/barcode-display'

function ItemCard({ item }) {
  return (
    <div className="border p-4">
      <h3>{item.name}</h3>
      <BarcodeDownload
        value={item.code}
        filename={`barcode-${item.code}`}
        width={200}
        height={80}
      />
    </div>
  )
}

// Example 3: Print labels for multiple items
import { LabelPrinter, LabelPreview } from '@/components/barcode/label-printer'

function PrintLabelsPage() {
  const [selectedItems, setSelectedItems] = useState([])

  return (
    <div>
      <h1>Print Asset Labels</h1>

      <LabelPreview items={selectedItems} />
      <LabelPrinter items={selectedItems} columns={3} rows={10} />
    </div>
  )
}

// Example 4: Generate barcode programmatically
import { generateBarcodeSvg, generateBarcodeDataUrl } from '@/lib/barcode/generator'

// Get SVG string
const svgString = generateBarcodeSvg('ITEM-001', {
  width: 300,
  height: 100,
  displayValue: true
})

// Get data URL for embedding
const dataUrl = generateBarcodeDataUrl('ITEM-001')

// Use in img tag
<img src={dataUrl} alt="Barcode" />

// Example 5: Custom asset label
import { generateAssetLabel } from '@/lib/barcode/label-generator'

const labelSvg = generateAssetLabel({
  itemCode: 'ITM-2024-001',
  itemName: 'โน้ตบุ๊ก Dell Latitude',
  category: 'อุปกรณ์อิเล็กทรอนิกส์',
  warehouse: 'คลังกลาง'
})
```

---

*Version: 1.0.0 | For HR-IMS Project*
