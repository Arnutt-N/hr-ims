---
name: websocket-realtime
description: WebSocket and real-time updates for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["websocket", "realtime", "real-time", "socket", "live update", "push notification"]
  file_patterns: ["*websocket*", "*socket*", "*realtime*", "hooks/use-realtime*"]
  context: real-time updates, live data, WebSocket connections, push notifications
mcp_servers:
  - sequential
personas:
  - frontend
  - backend
---

# WebSocket Realtime

## Core Role

Handle real-time updates for HR-IMS:
- Live inventory updates
- Real-time notifications
- Request status changes
- Multi-user synchronization

---

## WebSocket Server (Backend)

```typescript
// backend/src/websocket/index.ts
import { WebSocketServer, WebSocket } from 'ws'
import { Server } from 'http'
import jwt from 'jsonwebtoken'

interface WebSocketClient extends WebSocket {
  userId?: number
  role?: string
  subscriptions: Set<string>
}

class WebSocketManager {
  private wss: WebSocketServer
  private clients: Set<WebSocketClient> = new Set()
  private rooms: Map<string, Set<WebSocketClient>> = new Map()

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' })
    this.setupServer()
  }

  private setupServer() {
    this.wss.on('connection', (ws: WebSocketClient, req) => {
      ws.subscriptions = new Set()
      this.clients.add(ws)

      // Authenticate
      const token = this.extractToken(req)
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
          ws.userId = decoded.userId
          ws.role = decoded.role
        } catch (error) {
          ws.close(4001, 'Authentication failed')
          return
        }
      }

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())
          this.handleMessage(ws, message)
        } catch (error) {
          ws.send(JSON.stringify({ error: 'Invalid message format' }))
        }
      })

      ws.on('close', () => {
        this.clients.delete(ws)
        this.removeFromAllRooms(ws)
      })

      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        this.clients.delete(ws)
      })

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'เชื่อมต่อสำเร็จ / Connected successfully',
        timestamp: new Date().toISOString()
      }))
    })
  }

  private extractToken(req: any): string | null {
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    return url.searchParams.get('token')
  }

  private handleMessage(ws: WebSocketClient, message: any) {
    switch (message.type) {
      case 'subscribe':
        this.subscribe(ws, message.channel)
        break
      case 'unsubscribe':
        this.unsubscribe(ws, message.channel)
        break
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }))
        break
      default:
        ws.send(JSON.stringify({ error: 'Unknown message type' }))
    }
  }

  // Subscribe to a channel
  private subscribe(ws: WebSocketClient, channel: string) {
    // Check authorization for protected channels
    if (!this.canSubscribe(ws, channel)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'ไม่มีสิทธิ์เข้าถึงช่องนี้ / Unauthorized for this channel'
      }))
      return
    }

    ws.subscriptions.add(channel)

    if (!this.rooms.has(channel)) {
      this.rooms.set(channel, new Set())
    }
    this.rooms.get(channel)!.add(ws)

    ws.send(JSON.stringify({
      type: 'subscribed',
      channel,
      timestamp: new Date().toISOString()
    }))
  }

  // Unsubscribe from a channel
  private unsubscribe(ws: WebSocketClient, channel: string) {
    ws.subscriptions.delete(channel)
    const room = this.rooms.get(channel)
    if (room) {
      room.delete(ws)
      if (room.size === 0) {
        this.rooms.delete(channel)
      }
    }

    ws.send(JSON.stringify({
      type: 'unsubscribed',
      channel
    }))
  }

  // Check if user can subscribe to channel
  private canSubscribe(ws: WebSocketClient, channel: string): boolean {
    // Public channels
    const publicChannels = ['inventory', 'notifications:public']
    if (publicChannels.includes(channel)) return true

    // Admin channels
    if (channel.startsWith('admin:') && !['admin', 'superadmin'].includes(ws.role || '')) {
      return false
    }

    // User-specific channels
    if (channel.startsWith('user:')) {
      const channelUserId = parseInt(channel.split(':')[1])
      return ws.userId === channelUserId || ['admin', 'superadmin'].includes(ws.role || '')
    }

    return true
  }

  // Remove client from all rooms
  private removeFromAllRooms(ws: WebSocketClient) {
    this.rooms.forEach((clients, channel) => {
      clients.delete(ws)
      if (clients.size === 0) {
        this.rooms.delete(channel)
      }
    })
  }

  // Broadcast to all connected clients
  broadcast(message: any) {
    const data = JSON.stringify({
      ...message,
      timestamp: new Date().toISOString()
    })
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  }

  // Broadcast to specific channel
  broadcastToChannel(channel: string, message: any) {
    const room = this.rooms.get(channel)
    if (!room) return

    const data = JSON.stringify({
      ...message,
      channel,
      timestamp: new Date().toISOString()
    })

    room.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  }

  // Send to specific user
  sendToUser(userId: number, message: any) {
    this.clients.forEach(client => {
      if (client.userId === userId && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString()
        }))
      }
    })
  }

  // Get connected clients count
  getConnectedCount(): number {
    return this.clients.size
  }

  // Get channel subscribers count
  getChannelSubscribers(channel: string): number {
    return this.rooms.get(channel)?.size || 0
  }
}

export let wsManager: WebSocketManager | null = null

export function initWebSocket(server: Server) {
  wsManager = new WebSocketManager(server)
  return wsManager
}
```

---

## Real-time Events Service

```typescript
// backend/src/services/realtime-events.ts
import { wsManager } from '../websocket'

export class RealtimeEvents {
  // Inventory events
  static inventoryUpdated(itemId: number, warehouseId: number, data: any) {
    wsManager?.broadcastToChannel('inventory', {
      type: 'inventory:updated',
      itemId,
      warehouseId,
      data
    })
  }

  static lowStockAlert(itemId: number, itemName: string, currentStock: number, minStock: number) {
    wsManager?.broadcastToChannel('admin:alerts', {
      type: 'alert:low_stock',
      itemId,
      itemName,
      currentStock,
      minStock,
      severity: 'warning'
    })
  }

  // Request events
  static requestCreated(requestId: number, userId: number, approvers: number[]) {
    // Notify requester
    wsManager?.sendToUser(userId, {
      type: 'request:created',
      requestId,
      message: 'คำขอถูกสร้างเรียบร้อย / Request created successfully'
    })

    // Notify approvers
    approvers.forEach(approverId => {
      wsManager?.sendToUser(approverId, {
        type: 'request:pending_approval',
        requestId,
        message: 'มีคำขอใหม่รอการอนุมัติ / New request pending approval'
      })
    })
  }

  static requestStatusChanged(requestId: number, userId: number, status: string) {
    wsManager?.sendToUser(userId, {
      type: 'request:status_changed',
      requestId,
      status,
      message: `สถานะคำขอเปลี่ยนเป็น ${status}`
    })

    wsManager?.broadcastToChannel(`request:${requestId}`, {
      type: 'request:status_changed',
      requestId,
      status
    })
  }

  // Notification events
  static newNotification(userId: number, notification: any) {
    wsManager?.sendToUser(userId, {
      type: 'notification:new',
      notification
    })
  }

  // User events
  static userStatusChanged(userId: number, status: 'online' | 'offline') {
    wsManager?.broadcastToChannel('users:presence', {
      type: 'user:status',
      userId,
      status
    })
  }

  // System events
  static systemAlert(message: string, severity: 'info' | 'warning' | 'error') {
    wsManager?.broadcast({
      type: 'system:alert',
      message,
      severity
    })
  }

  // Warehouse events
  static warehouseUpdated(warehouseId: number, data: any) {
    wsManager?.broadcastToChannel(`warehouse:${warehouseId}`, {
      type: 'warehouse:updated',
      warehouseId,
      data
    })
  }
}
```

---

## Frontend WebSocket Hook

```typescript
// hooks/use-websocket.ts
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface WebSocketMessage {
  type: string
  [key: string]: any
}

interface UseWebSocketOptions {
  url?: string
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url,
    onMessage,
    onConnect,
    onDisconnect,
    reconnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options

  const { data: session } = useSession()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getWebSocketUrl = useCallback(() => {
    if (url) return url
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const token = session?.user ? 'your-jwt-token' : '' // Get from session
    return `${protocol}//${host}/ws?token=${token}`
  }, [url, session])

  const connect = useCallback(() => {
    if (!session) return

    try {
      const wsUrl = getWebSocketUrl()
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setError(null)
        reconnectAttempts.current = 0
        onConnect?.()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          onMessage?.(message)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        onDisconnect?.()

        // Reconnect logic
        if (reconnect && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          setTimeout(connect, reconnectInterval)
        }
      }

      wsRef.current.onerror = (err) => {
        setError('WebSocket connection error')
        console.error('WebSocket error:', err)
      }
    } catch (err) {
      setError('Failed to connect to WebSocket')
    }
  }, [session, getWebSocketUrl, onMessage, onConnect, onDisconnect, reconnect, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const subscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        channel
      }))
    }
  }, [])

  const unsubscribe = useCallback((channel: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        channel
      }))
    }
  }, [])

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return {
    isConnected,
    error,
    subscribe,
    unsubscribe,
    send,
    disconnect,
    reconnect: connect
  }
}
```

---

## Real-time Data Hook

```typescript
// hooks/use-realtime-data.ts
'use client'

import { useEffect, useState } from 'react'
import { useWebSocket } from './use-websocket'

interface RealtimeDataOptions<T> {
  channel: string
  initialData: T
  eventHandler?: (data: T, message: any) => T
}

export function useRealtimeData<T>(options: RealtimeDataOptions<T>) {
  const { channel, initialData, eventHandler } = options
  const [data, setData] = useState<T>(initialData)

  const { isConnected, subscribe, unsubscribe } = useWebSocket({
    onMessage: (message) => {
      if (message.channel === channel || message.type?.startsWith(channel.replace(':*', ''))) {
        if (eventHandler) {
          setData(prev => eventHandler(prev, message))
        } else {
          setData(message.data)
        }
      }
    }
  })

  useEffect(() => {
    if (isConnected) {
      subscribe(channel)
      return () => unsubscribe(channel)
    }
  }, [isConnected, channel, subscribe, unsubscribe])

  return { data, setData, isConnected }
}
```

---

## Live Inventory Hook

```typescript
// hooks/use-live-inventory.ts
'use client'

import { useRealtimeData } from './use-realtime-data'

interface InventoryUpdate {
  itemId: number
  warehouseId: number
  quantity: number
  operation: 'add' | 'subtract' | 'set'
}

export function useLiveInventory(warehouseId?: number) {
  const channel = warehouseId ? `warehouse:${warehouseId}` : 'inventory'

  return useRealtimeData<InventoryUpdate[]>({
    channel,
    initialData: [],
    eventHandler: (prevData, message) => {
      if (message.type === 'inventory:updated') {
        // Update logic based on message
        return prevData
      }
      if (message.type === 'inventory:batch_update') {
        return message.updates
      }
      return prevData
    }
  })
}
```

---

## Real-time Notifications Hook

```typescript
// hooks/use-realtime-notifications.ts
'use client'

import { useWebSocket } from './use-websocket'
import { useState, useCallback } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  timestamp: Date
  read: boolean
}

export function useRealtimeNotifications(userId: number) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const { isConnected, subscribe } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'notification:new') {
        const notification: Notification = {
          id: message.notification.id,
          type: message.notification.type,
          title: message.notification.title,
          message: message.notification.message,
          timestamp: new Date(message.timestamp),
          read: false
        }
        setNotifications(prev => [notification, ...prev])
        setUnreadCount(prev => prev + 1)

        // Show browser notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico'
          })
        }
      }
    }
  })

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [])

  useEffect(() => {
    if (isConnected && userId) {
      subscribe(`user:${userId}`)
    }
  }, [isConnected, userId, subscribe])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected
  }
}
```

---

## Real-time Presence Component

```typescript
// components/realtime/presence-indicator.tsx
'use client'

import { useWebSocket } from '@/hooks/use-websocket'
import { cn } from '@/lib/utils'

interface OnlineUser {
  id: number
  name: string
  status: 'online' | 'offline' | 'away'
  lastSeen?: Date
}

interface PresenceIndicatorProps {
  currentUserId: number
}

export function PresenceIndicator({ currentUserId }: PresenceIndicatorProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])

  const { isConnected, subscribe } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'user:status') {
        setOnlineUsers(prev => {
          const index = prev.findIndex(u => u.id === message.userId)
          if (index >= 0) {
            const updated = [...prev]
            updated[index] = {
              ...updated[index],
              status: message.status,
              lastSeen: new Date()
            }
            return updated
          }
          return prev
        })
      }
      if (message.type === 'users:presence_list') {
        setOnlineUsers(message.users)
      }
    }
  })

  useEffect(() => {
    if (isConnected) {
      subscribe('users:presence')
    }
  }, [isConnected, subscribe])

  const onlineCount = onlineUsers.filter(u => u.status === 'online').length

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'w-2 h-2 rounded-full',
        isConnected ? 'bg-green-500' : 'bg-gray-400'
      )} />
      <span className="text-sm text-muted-foreground">
        {onlineCount} ออนไลน์ / {onlineCount} online
      </span>
      <div className="flex -space-x-2">
        {onlineUsers.slice(0, 5).map(user => (
          <div
            key={user.id}
            className={cn(
              'w-8 h-8 rounded-full border-2 border-background flex items-center justify-center text-xs font-medium',
              user.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            )}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {onlineUsers.length > 5 && (
          <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs">
            +{onlineUsers.length - 5}
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Usage Examples

```typescript
// Example 1: Real-time inventory updates
function InventoryPage() {
  const { data: updates, isConnected } = useLiveInventory()

  return (
    <div>
      {isConnected && <span className="text-green-500">● Live</span>}
      {/* Render inventory with live updates */}
    </div>
  )
}

// Example 2: Real-time notifications
function NotificationBell() {
  const { unreadCount, notifications } = useRealtimeNotifications(userId)

  return (
    <button className="relative">
      <Bell />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  )
}

// Example 3: Backend event emission
import { RealtimeEvents } from '@/services/realtime-events'

// After inventory update
await prisma.stockLevel.update({ ... })
RealtimeEvents.inventoryUpdated(itemId, warehouseId, { quantity: newQuantity })

// After request creation
RealtimeEvents.requestCreated(requestId, userId, approverIds)
```

---

*Version: 1.0.0 | For HR-IMS Project*
