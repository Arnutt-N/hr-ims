---
name: Authentication & Authorization
description: NextAuth configuration, Backend JWT validation, and Role-based access control (RBAC)
---

# การยืนยันตัวตนและการกำหนดสิทธิ์

This skill covers authentication and authorization patterns in HR-IMS using NextAuth (frontend) and JWT (backend).

## ภาพรวม

- **Frontend**: NextAuth v5 with Credentials provider
- **Backend**: Header-based authentication (x-user-id, x-user-role)
- **Authorization**: Role-based access control (RBAC)

## การตั้งค่า NextAuth

### Setup File: `auth.ts`

```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import prisma from './lib/prisma';
import bcrypt from 'bcrypt';

async function getUser(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ?? undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                const parsed = z
                    .object({ 
                        email: z.string().email(), 
                        password: z.string().min(6) 
                    })
                    .safeParse(credentials);

                if (parsed.success) {
                    const { email, password } = parsed.data;
                    const user = await getUser(email);
                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(
                        password, 
                        user.password
                    );

                    if (passwordsMatch) {
                        return {
                            ...user,
                            id: user.id.toString(),
                        };
                    }
                }
                return null;
            },
        }),
    ],
    secret: process.env.AUTH_SECRET,
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id?.toString();
                token.role = user.role || "user";
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        },
    },
});
```

### Auth Config: `auth.config.ts`

```typescript
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            
            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect to login
            } else if (isLoggedIn) {
                return Response.redirect(new URL('/dashboard', nextUrl));
            }
            return true;
        },
    },
    providers: [], // Added by auth.ts
};
```

## Middleware (การป้องกันเส้นทาง)

**File:** `middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth';

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    
    const isPublicRoute = nextUrl.pathname === '/login';
    const isDashboardRoute = nextUrl.pathname.startsWith('/dashboard');
    
    // Redirect to dashboard if logged in and trying to access login
    if (isLoggedIn && isPublicRoute) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    
    // Redirect to login if not logged in and trying to access dashboard
    if (!isLoggedIn && isDashboardRoute) {
        return NextResponse.redirect(new URL('/login', req.url));
    }
    
    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
```

## การใช้ Auth ใน Component

### Server Components

```typescript
import { auth } from '@/auth';

export default async function Page() {
    const session = await auth();
    
    if (!session?.user) {
        return <div>Not authenticated</div>;
    }
    
    return (
        <div>
            <p>Welcome, {session.user.email}</p>
            <p>Role: {session.user.role}</p>
        </div>
    );
}
```

### Server Actions

```typescript
'use server';

import { auth } from '@/auth';

export async function myAction() {
    const session = await auth();
    
    if (!session?.user?.email) {
        return { error: 'Unauthorized' };
    }
    
    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    });
    
    // Use user.id, user.role, etc.
}
```

### Client Components

```typescript
'use client';

import { useSession } from 'next-auth/react';

export default function ClientComponent() {
    const { data: session, status } = useSession();
    
    if (status === 'loading') return <div>Loading...</div>;
    if (status === 'unauthenticated') return <div>Not logged in</div>;
    
    return <div>Welcome, {session?.user?.email}</div>;
}
```

### หน้า Login

**File:** `app/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });
            
            if (result?.error) {
                toast.error('Invalid credentials');
            } else {
                router.push('/dashboard');
            }
        } catch (error) {
            toast.error('Login failed');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
            />
            <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
            />
            <Button type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
            </Button>
        </form>
    );
}
```

## การยืนยันตัวตน Backend

### Middleware: `backend/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        role: string;
        email?: string;
    };
}

// Header-based auth (from Next.js middleware)
export const requireAuth = (
    req: AuthRequest, 
    res: Response, 
    next: NextFunction
) => {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    
    if (!userId || !userRole) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }
    
    req.user = {
        id: parseInt(userId),
        role: userRole
    };
    
    next();
};

// Role-based authorization
export const requireRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Required roles: ${allowedRoles.join(', ')}`
            });
        }
        
        next();
    };
};
```

### Using in Routes

```typescript
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getItems, createItem, deleteItem } from '../controllers/itemController';

const router = Router();

// Public route
router.get('/', getItems);

// Authenticated users only
router.post('/', requireAuth, createItem);

// Admin only
router.post('/', requireAuth, requireRole(['superadmin', 'admin']), createItem);

// Superadmin only
router.delete('/:id', requireAuth, requireRole(['superadmin']), deleteItem);

export default router;
```

## RBAC (การควบคุมการเข้าถึงตามบทบาท)

### User Roles

```typescript
type UserRole = 'superadmin' | 'admin' | 'hr' | 'user';
```

| Role | Permissions |
|------|-------------|
| `superadmin` | Full system access, delete operations |
| `admin` | Create, update, approve requests |
| `hr` | HR-specific operations, view reports |
| `user` | Basic access, create requests |

### Frontend Role Checks

```tsx
import { auth } from '@/auth';

export default async function Page() {
    const session = await auth();
    const userRole = session?.user?.role;
    
    return (
        <div>
            {userRole === 'superadmin' && (
                <Button>Delete</Button>
            )}
            
            {['superadmin', 'admin'].includes(userRole) && (
                <Button>Create</Button>
            )}
            
            <Button>View</Button>
        </div>
    );
}
```

### Backend Role Checks

```typescript
export const deleteItem = async (req: AuthRequest, res: Response) => {
    // Check role
    if (req.user?.role !== 'superadmin') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Proceed with deletion
    await prisma.inventoryItem.delete({ where: { id } });
};
```

## ตัวแปร Environment

```env
# .env (Frontend)
AUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# .env (Backend)
JWT_SECRET=your-jwt-secret-here
```

## ประเภท TypeScript

**File:** `next-auth.d.ts`

```typescript
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            role: string;
        } & DefaultSession['user'];
    }
    
    interface User {
        role: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: string;
    }
}
```

## แนวปฏิบัติที่ดีที่สุด

1. ✅ Always validate credentials with Zod
2. ✅ Hash passwords with bcrypt (cost factor: 10-12)
3. ✅ Use `auth()` in Server Components and Server Actions
4. ✅ Protect routes with middleware
5. ✅ Check roles on both frontend and backend
6. ✅ Use `requireAuth` + `requireRole` for API routes
7. ✅ Store minimal data in JWT (id, role only)
8. ❌ Don't trust client-side role checks alone
9. ❌ Don't store sensitive data in session
10. ❌ Don't expose user passwords in API responses

## Quick Reference

| Context | Auth Method |
|---------|-------------|
| Server Component | `await auth()` |
| Server Action | `await auth()` |
| Client Component | `useSession()` |
| API Route | `await auth()` or headers |
| Backend API | Headers (`x-user-id`, `x-user-role`) |
| Middleware | `auth()` wrapper |
