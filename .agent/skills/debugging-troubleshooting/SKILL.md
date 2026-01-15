---
name: Debugging & Troubleshooting
description: แนวทางการ Debug, Investigate และแก้ไขปัญหาในการพัฒนาซอฟต์แวร์
---

# การ Debug และแก้ไขปัญหา

คู่มือนี้ช่วยในการวินิจฉัย debug และแก้ไขปัญหาต่างๆ ในโปรเจค HR-IMS

## ภาพรวม

| ประเภทปัญหา | เครื่องมือ | แนวทาง |
|-------------|-----------|--------|
| Code Bugs | Debugger, Logs | Breakpoints, Stack Trace |
| Network Issues | DevTools, Postman | Network Tab, Headers |
| Database Problems | Prisma Studio, Logs | Query Analysis |
| Performance | Chrome DevTools, Lighthouse | Profiling, Optimization |
| Build Errors | Terminal, IDE | Error Messages, Dependencies |

## 1. การอ่าน Error Messages

### Error Message Components

```
Error: Cannot read property 'name' of undefined
    at getUserName (/app/utils/user.ts:15:23)
    at processRequest (/app/controllers/request.ts:42:18)
    at /app/routes/requests.ts:12:5
```

**การวิเคราะห์:**
1. **Error Type**: `Error` (TypeError, ReferenceError, etc.)
2. **Message**: `Cannot read property 'name' of undefined`
3. **Stack Trace**: บรรทัดที่เกิดข้อผิดพลาด

### Common Error Types

```typescript
// TypeError - เข้าถึง property ของ undefined/null
const user = null;
console.log(user.name); // TypeError

// ReferenceError - ตัวแปรไม่ถูกประกาศ
console.log(unknownVar); // ReferenceError

// SyntaxError - ไวยากรณ์ผิด
const obj = { name: 'John', }; // อาจเกิด SyntaxError

// Prisma Error
// P2002: Unique constraint failed
// P2025: Record not found
```

## 2. Debugging Tools

### VS Code Debugger

**ไฟล์:** `.vscode/launch.json`

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Next.js",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/frontend/next-app",
      "console": "integratedTerminal",
      "serverReadyAction": {
        "pattern": "started server on .+, url: (https?://.+)",
        "uriFormat": "%s",
        "action": "debugWithChrome"
      }
    }
  ]
}
```

### การใช้ Breakpoints

```typescript
// ตั้ง breakpoint ในโค้ด
export const getUserById = async (id: number) => {
  debugger; // จุดหยุดชั่วคราว
  
  const user = await prisma.user.findUnique({
    where: { id }
  });
  
  console.log('User:', user); // Log เพื่อตรวจสอบ
  
  return user;
};
```

### Chrome DevTools

```javascript
// Console methods
console.log('Basic log');
console.error('Error message');
console.warn('Warning');
console.table([{ name: 'John', age: 30 }]); // แสดงเป็นตาราง
console.time('operation'); // เริ่มจับเวลา
// ... code ...
console.timeEnd('operation'); // จบการจับเวลา

// Grouped logs
console.group('User Details');
console.log('Name:', user.name);
console.log('Email:', user.email);
console.groupEnd();

// Conditional logging
console.assert(user !== null, 'User should not be null');
```

## 3. การ Debug แต่ละประเภท

### Backend API Debugging

```typescript
// ใช้ try-catch พร้อม detailed logging
export const createRequest = async (req: Request, res: Response) => {
  try {
    console.log('[CREATE REQUEST] Start', {
      body: req.body,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });

    const data = requestSchema.parse(req.body);
    
    console.log('[CREATE REQUEST] Validated data:', data);

    const request = await prisma.request.create({ data });
    
    console.log('[CREATE REQUEST] Success:', request.id);
    
    res.status(201).json(request);
  } catch (error) {
    console.error('[CREATE REQUEST] Error:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body
    });
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error',
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
};
```

### Frontend Debugging

```tsx
'use client';

import { useEffect } from 'react';

export default function MyComponent({ data }) {
  // Log เมื่อ component mount
  useEffect(() => {
    console.log('[MyComponent] Mounted', { data });
    
    return () => {
      console.log('[MyComponent] Unmounted');
    };
  }, [data]);

  // Log เมื่อ data เปลี่ยน
  useEffect(() => {
    console.log('[MyComponent] Data changed:', data);
  }, [data]);

  // Conditional rendering debug
  if (!data) {
    console.warn('[MyComponent] No data provided');
    return <div>No data</div>;
  }

  return <div>{data.name}</div>;
}
```

### Database Debugging

```typescript
// เปิด Prisma query logging
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}

// ดู query ที่ถูกรัน
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// ใช้ Prisma Studio
// npx prisma studio

// Debug slow queries
console.time('query');
const users = await prisma.user.findMany({
  include: {
    requests: {
      include: {
        requestItems: true
      }
    }
  }
});
console.timeEnd('query');
```

## 4. Common Problems & Solutions

### Problem: Cannot connect to database

```bash
# ตรวจสอบ connection string
echo $DATABASE_URL

# ตรวจสอบว่า database file มีอยู่
ls -la backend/prisma/dev.db

# Generate Prisma Client ใหม่
cd backend
npx prisma generate
npx prisma db push
```

### Problem: Module not found

```bash
# ลบ node_modules และติดตั้งใหม่
rm -rf node_modules package-lock.json
npm install

# ตรวจสอบ import paths
# ❌ import { Button } from 'components/ui/button'
# ✅ import { Button } from '@/components/ui/button'
```

### Problem: CORS Error

```typescript
// backend/src/index.ts
import cors from 'cors';

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
```

### Problem: NextAuth Session null

```typescript
// ตรวจสอบ environment variables
console.log('AUTH_SECRET:', process.env.AUTH_SECRET ? 'Set' : 'Missing');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);

// ตรวจสอบ middleware
// middleware.ts ต้องมี matcher ที่ถูกต้อง
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
```

### Problem: Build fails

```bash
# ดู error message แบบ verbose
npm run build -- --verbose

# ตรวจสอบ TypeScript errors
npx tsc --noEmit

# ตรวจสอบ ESLint
npm run lint
```

## 5. Network Debugging

### ใช้ Chrome DevTools Network Tab

```
1. เปิด DevTools (F12)
2. ไปที่ tab Network
3. Reload page หรือทำ action
4. ดู requests:
   - Status code (200, 404, 500)
   - Response time
   - Headers
   - Payload
   - Response
```

### Debug API Calls

```typescript
// สร้าง fetch wrapper เพื่อ log
async function fetchWithLog(url: string, options?: RequestInit) {
  console.log('[FETCH] Request:', { url, options });
  
  try {
    const response = await fetch(url, options);
    
    console.log('[FETCH] Response:', {
      url,
      status: response.status,
      ok: response.ok
    });
    
    const data = await response.json();
    console.log('[FETCH] Data:', data);
    
    return { response, data };
  } catch (error) {
    console.error('[FETCH] Error:', { url, error });
    throw error;
  }
}
```

### ใช้ Postman/Thunder Client

```
1. Import API endpoints
2. Set headers (x-user-id, x-user-role)
3. Test individual endpoints
4. Check response status/body
5. Save requests for later
```

## 6. Performance Debugging

### React Profiler

```tsx
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>
```

### Bundle Analysis

```bash
# Next.js bundle analyzer
npm install @next/bundle-analyzer

# next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer({ /* config */ });

# Run
ANALYZE=true npm run build
```

### Database Performance

```typescript
// หา N+1 query problem
// ❌ Bad - N+1 queries
const requests = await prisma.request.findMany();
for (const request of requests) {
  const user = await prisma.user.findUnique({
    where: { id: request.userId }
  });
}

// ✅ Good - Single query with include
const requests = await prisma.request.findMany({
  include: { user: true }
});
```

## 7. Systematic Debugging Approach

### 1. Reproduce the Bug

```
1. ทำตามขั้นตอนที่ทำให้เกิด bug
2. บันทึกขั้นตอนที่ทำ
3. ตรวจสอบว่าเกิดขึ้นทุกครั้งหรือไม่
4. ทดสอบใน environment ต่างๆ
```

### 2. Isolate the Problem

```
1. หาส่วนที่เกิดปัญหา (Frontend? Backend? Database?)
2. แยก code ที่เกี่ยวข้อง
3. Comment code ทีละส่วนเพื่อหาตัวการ
4. ใช้ binary search (comment ครึ่งหนึ่ง)
```

### 3. Understand the Root Cause

```
1. อ่าน error message ละเอียด
2. ดู stack trace
3. ตรวจสอบ data flow
4. ทำความเข้าใจว่าทำไมถึงเกิดปัญหา
```

### 4. Fix and Verify

```
1. แก้ไขปัญหาที่ root cause
2. เขียน test เพื่อป้องกันไม่ให้เกิดซ้ำ
3. ทดสอบว่าแก้ไขสำเร็จ
4. Deploy และ monitor
```

## 8. Logging Best Practices

### Structured Logging

```typescript
// สร้าง logger utility
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  error: (message: string, error: Error, meta?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};

// ใช้งาน
logger.info('Request created', { requestId: 123, userId: 1 });
logger.error('Failed to create request', error, { body: req.body });
```

### Log Levels

```typescript
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export const log = {
  debug: (msg: string, data?: any) => {
    if (levels[LOG_LEVEL] <= levels.debug) {
      console.debug('[DEBUG]', msg, data);
    }
  },
  info: (msg: string, data?: any) => {
    if (levels[LOG_LEVEL] <= levels.info) {
      console.info('[INFO]', msg, data);
    }
  },
  warn: (msg: string, data?: any) => {
    if (levels[LOG_LEVEL] <= levels.warn) {
      console.warn('[WARN]', msg, data);
    }
  },
  error: (msg: string, error?: Error, data?: any) => {
    if (levels[LOG_LEVEL] <= levels.error) {
      console.error('[ERROR]', msg, error, data);
    }
  }
};
```

## 9. Browser DevTools Tips

### Console Commands

```javascript
// Clear console
clear()

// ดู object แบบละเอียด
console.dir(document.body)

// Copy ข้อมูลไปยัง clipboard
copy(JSON.stringify(data, null, 2))

// Monitor function calls
monitor(functionName)
unmonitor(functionName)

// Debug ทุก event type
monitorEvents(document.body, 'click')
unmonitorEvents(document.body)
```

### Network Throttling

```
1. DevTools → Network
2. เลือก throttling profile (Slow 3G, Fast 3G)
3. ทดสอบ loading states
4. ดู performance ในเน็ตช้า
```

## 10. แนวปฏิบัติที่ดีที่สุด

1. ✅ อ่าน error message ทั้งหมดอย่างละเอียด
2. ✅ ใช้ debugger แทนการใส่ console.log มากเกินไป
3. ✅ Reproduce bug ก่อนเริ่มแก้
4. ✅ Fix one bug at a time
5. ✅ เขียน test หลังแก้ bug
6. ✅ ใช้ version control (git) เพื่อ rollback ได้
7. ✅ Log ข้อมูลที่เป็นประโยชน์ พร้อม context
8. ❌ อย่า assume - ตรวจสอบทุกอย่างด้วยข้อมูล
9. ❌ อย่าแก้แบบ trial-and-error โดยไม่เข้าใจ
10. ❌ อย่าลืมลบ console.log หลังแก้เสร็จ

## อ้างอิงอย่างรวดเร็ว

| Problem | Tool | Action |
|---------|------|--------|
| Code not working | VS Code Debugger | Set breakpoints |
| API not responding | Postman | Test endpoint |
| Database error | Prisma Studio | Check data |
| Slow page load | Lighthouse | Profile performance |
| Build fails | Terminal | Read error logs |
| TypeScript error | `tsc --noEmit` | Check types |
| Network issues | DevTools Network | Check requests |
| Cannot find module | Clear & reinstall | `rm -rf node_modules && npm i` |

| HTTP Status | ความหมาย | การแก้ไข |
|-------------|----------|----------|
| 400 | Bad Request | ตรวจสอบ request body/params |
| 401 | Unauthorized | ตรวจสอบ auth headers |
| 403 | Forbidden | ตรวจสอบ permissions |
| 404 | Not Found | ตรวจสอบ URL/route |
| 500 | Server Error | ดู server logs |
