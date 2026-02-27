---
name: log-viewer
description: Log viewing and debugging utilities for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["log", "logging", " "debug log", " "console", " "debugger"]
  file_patterns: ["*log*", "lib/log*", "components/log*"]
  context: log viewing, debugging, console output
 monitoring
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# Log Viewer

## Core Role

View and manage logs for HR-IMS:
- Console log viewer
- Server log viewer
- Audit log viewer
- Error log viewer

---

## Console Log Hook

```typescript
// hooks/use-console-log.ts
'use client'

import { useEffect, useRef } from 'react'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id: string
  level: LogLevel
  message: string
  timestamp: Date
  data?: any
}

export function useConsoleLog(maxEntries: number = 100) {
  const logsRef = useRef<LogEntry[]>([])
  const idRef = useRef(0)

  const addLog = (level: LogLevel, message: string, data?: any) => {
    const entry: LogEntry = {
      id: `log-${++idRef.current}`,
      level,
      message,
      timestamp: new Date(),
      data
    }

    logsRef.current = [entry, ...logsRef.current].slice(0, maxEntries - 1)
)

  useEffect(() => {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    }

    console.log = (...args: any[]) => {
      originalConsole.log(...args)
      addLog('info', args.map(formatArg).join(' '))
    }

    console.info = (...args: any[]) => {
      originalConsole.info(...args)
      addLog('info', args.map(formatArg).join(' '))
    }

    console.warn = (...args: any[]) => {
      originalConsole.warn(...args)
      addLog('warn', args.map(formatArg).join(' '))
    }

    console.error = (...args: any[]) => {
      originalConsole.error(...args)
      addLog('error', args.map(formatArg).join(' '))
    }

    console.debug = (...args: any[]) => {
      originalConsole.debug(...args)
      addLog('debug', args.map(formatArg).join(' '))
    }

    return () => {
      console.log = originalConsole.log
      console.info = originalConsole.info
      console.warn = originalConsole.warn
      console.error = originalConsole.error
      console.debug = originalConsole.debug
    }
  }, [])

  return {
    logs: logsRef.current,
    addLog,
    clear: () => {
      logsRef.current = []
    }
    getLogsByLevel: (level: LogLevel) =>
      logsRef.current.filter(log => log.level === level)
  }
}

function formatArg(arg: any): string {
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg)
    } catch {
      return String(arg)
    }
  }
  return String(arg)
}
```

---

## Log Viewer Component

```typescript
// components/debug/log-viewer.tsx
'use client'

import { useState } from 'react'
import { useConsoleLog, LogLevel, LogEntry } from '@/hooks/use-console-log'
import { cn } from '@/lib/utils'
import {
  Bug,
  Info,
  AlertTriangle,
  AlertCircle,
  Trash2,
  Download
} from 'lucide-react'

const levelStyles: Record<LogLevel, { icon: typeof Info; color: string; bg: string }> = {
  debug: { icon: Bug, color: 'text-gray-500', bg: 'bg-gray-50' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
  warn: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' }
}

export function LogViewer() {
  const { logs, clear } = useConsoleLog()
  const [filter, setFilter] = useState<LogLevel | 'all'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.level === filter)

  const handleExport = () => {
    const content = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-muted p-3 flex items-center justify-between">
        <h3 className="font-semibold">Console Logs</h3>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as LogLevel | 'all')}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
          <button onClick={handleExport} className="p-1">
            <Download className="h-4 w-4" />
          </button>
          <button onClick={clear} className="p-1">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="max-h-96 overflow-auto">
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No logs to display
          </div>
        ) : (
          filteredLogs.map(log => (
            <LogEntryItem
              key={log.id}
              log={log}
              expanded={expanded === log.id}
              onToggle={() => setExpanded(expanded === log.id ? null : log.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function LogEntryItem({
  log,
  expanded,
  onToggle
}: {
  log: LogEntry
  expanded: boolean
  onToggle: () => void
}) {
  const style = levelStyles[log.level]
  const Icon = style.icon

  return (
    <div
      className={cn('p-2 border-b cursor-pointer', style.bg)}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn('h-4 w-4 mt-0.5', style.color)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{log.timestamp.toLocaleTimeString()}</span>
            <span className="uppercase font-semibold">{log.level}</span>
          </div>
          <p className="text-sm break-all">{log.message}</p>
          {log.data && expanded && (
            <pre className="mt-2 p-2 bg-black/5 rounded text-xs overflow-auto">
              {JSON.stringify(log.data, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## Server Log Viewer

```typescript
// components/debug/server-log-viewer.tsx
'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ServerLog {
  id: string
  timestamp: Date
  level: string
  message: string
  source?: string
  metadata?: Record<string, any>
}

export function ServerLogViewer() {
  const [logs, setLogs] = useState<ServerLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/logs')
      const data = await response.json()
      setLogs(data)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.level === filter)

  const levels = ['all', '...new Set(logs.map(l => l.level))]

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted p-3 flex items-center justify-between">
        <h3 className="font-semibold">Server Logs</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          {levels.map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      <div className="max-h-96 overflow-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No logs
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="p-2 border-b hover:bg-muted/50">
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={cn(
                  'text-xs font-semibold uppercase',
                  log.level === 'error' && 'text-red-500',
                  log.level === 'warn' && 'text-yellow-500',
                  log.level === 'info' && 'text-blue-500'
                )}>
                  {log.level}
                </span>
                {log.source && (
                  <span className="text-xs text-muted-foreground">
                    [{log.source}]
                  </span>
                )}
              </div>
              <p className="text-sm mt-1">{log.message}</p>
              {log.metadata && (
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
```

---

## Audit Log Viewer

```typescript
// components/debug/audit-log-viewer.tsx
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, RefreshCw } from 'lucide-react'

interface AuditLog {
  id: number
  action: string
  tableName: string
  recordId: string
  userId: number
  userName: string
  createdAt: Date
  ipAddress?: string
  oldData?: any
  newData?: any
}

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    action: '',
    tableName: '',
    userId: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v)
        )
      })

      const response = await fetch(`/api/audit-logs?${params}`)
      const data = await response.json()
      setLogs(data.logs)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, filters])

  const actionLabels: Record<string, string> = {
    CREATE: 'สร้าง / Create',
    UPDATE: 'แก้ไข / Update',
    DELETE: 'ลบ / Delete'
  }

  const tableLabels: Record<string, string> = {
    User: 'ผู้ใช้ / User',
    InventoryItem: 'สินค้า / Item',
    Request: 'คำขอ / Request',
    Warehouse: 'คลัง / Warehouse'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <Input
            placeholder="ค้นหา..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            className="w-48"
          />
        </div>

        <Select
          value={filters.action}
          onValueChange={(v) => setFilters(f => ({ ...f, action: v }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Actions</SelectItem>
            {Object.entries(actionLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.tableName}
          onValueChange={(v) => setFilters(f => ({ ...f, tableName: v }))}
        >
          <SelectTrigger className="w-32">
          <SelectValue placeholder="Table" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Tables</SelectItem>
            {Object.entries(tableLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setFilters({ action: '', tableName: '', userId: '', search: '', dateFrom: '', dateTo: '' })}
        >
          <Filter className="h-4 w-4 mr-2" />
          Clear
        </Button>

        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่/เวลา</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead>ผู้ใช้</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>รายละเอียด</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map(log => (
                <AuditLogRow key={log.id} log={log} />
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AuditLogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setExpanded(!expanded)}>
        <TableCell className="text-sm">
          {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm:ss', { locale: th })}
        </TableCell>
        <TableCell>
          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
            {log.action}
          </span>
        </TableCell>
        <TableCell>{log.tableName}</TableCell>
        <TableCell>{log.recordId}</TableCell>
        <TableCell>{log.userName}</TableCell>
        <TableCell className="text-muted-foreground">
          {log.ipAddress || '-'}
        </TableCell>
        <TableCell>
          <Button variant="ghost" size="sm">
            {expanded ? 'Hide' : 'View'}
          </Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="p-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-4">
              {log.oldData && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">ข้อมูลเดิม / Old Data:</h4>
                  <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(log.oldData, null, 2)}
                  </pre>
                </div>
              )}
              {log.newData && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">ข้อมูลใหม่ / New Data:</h4>
                  <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(log.newData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
```

---

## Debug Panel

```typescript
// components/debug/debug-panel.tsx
'use client'

import { useState } from 'react'
import { LogViewer } from './log-viewer'
import { ServerLogViewer } from './server-log-viewer'
import { AuditLogViewer } from './audit-log-viewer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bug, Server, FileText, X } from 'lucide-react'

export function DebugPanel() {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-2 bg-destructive text-white rounded-full shadow-lg hover:bg-destructive/90"
      >
        <Bug className="h-5 w-5" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-4 bg-background border rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Debug Panel</h2>
          <button onClick={() => setOpen(false)} className="p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <Tabs defaultValue="console">
            <TabsList>
              <TabsTrigger value="console">
                <Bug className="h-4 w-4 mr-2" />
                Console
              </TabsTrigger>
              <TabsTrigger value="server">
                <Server className="h-4 w-4 mr-2" />
                Server
              </TabsTrigger>
              <TabsTrigger value="audit">
                <FileText className="h-4 w-4 mr-2" />
                Audit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="console">
              <LogViewer />
            </TabsContent>
            <TabsContent value="server">
              <ServerLogViewer />
            </TabsContent>
            <TabsContent value="audit">
              <AuditLogViewer />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
```

---

## Usage

```typescript
// Add to layout or pages
import { DebugPanel } from '@/components/debug/debug-panel'

function RootLayout({ children }) {
  return (
    <>
      {children}
      {process.env.NODE_ENV === 'development' && <DebugPanel />}
    </>
  )
  return (
    <>
      {children}
      <DebugPanel />
    </>
  )
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
