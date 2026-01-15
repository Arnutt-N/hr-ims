---
name: Frontend Components
description: Guide for building Next.js components with Shadcn UI, Server Actions, and React Hook Form
---

# คอมโพเนนต์ Frontend

This skill helps you create frontend components following HR-IMS patterns with Next.js 16, Shadcn UI, and Server Actions.

## โครงสร้างโปรเจค

```
frontend/next-app/
├── app/                  # Next.js App Router
│   ├── (dashboard)/     # Dashboard routes (with layout)
│   ├── login/           # Auth pages
│   └── api/             # API route handlers
├── components/          # Reusable components
│   ├── ui/              # Shadcn UI components
│   └── warehouse/       # Feature-specific components
├── lib/                 # Utilities & actions
│   ├── actions/         # Server Actions
│   ├── types/           # TypeScript types
│   └── utils.ts         # Helper functions
└── auth.ts              # NextAuth config
```

## Creating Components

### 1. คอมโพเนนต์ Client พร้อม Form (react-hook-form + Zod)

```tsx
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Validation schema
const formSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    quantity: z.number().min(1).max(100),
});

type FormData = z.infer<typeof formSchema>;

export default function MyForm() {
    const [loading, setLoading] = useState(false);
    
    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            email: '',
            quantity: 1,
        }
    });
    
    const onSubmit = async (data: FormData) => {
        setLoading(true);
        try {
            const res = await fetch('/api/endpoint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!res.ok) throw new Error('Failed');
            
            toast.success('Success!');
            form.reset();
        } catch (error) {
            toast.error('Error occurred');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                    id="name"
                    {...form.register('name')} 
                />
                {form.formState.errors.name && (
                    <p className="text-sm text-red-500">
                        {form.formState.errors.name.message}
                    </p>
                )}
            </div>
            
            <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit'}
            </Button>
        </form>
    );
}
```

### 2. การใช้ Shadcn UI Components

#### Select Component

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

<Select value={value} onValueChange={setValue}>
    <SelectTrigger>
        <SelectValue placeholder="Select option" />
    </SelectTrigger>
    <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
    </SelectContent>
</Select>
```

#### Dialog Component

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
        <Button>Open Dialog</Button>
    </DialogTrigger>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
        </DialogHeader>
        <p>Dialog content...</p>
    </DialogContent>
</Dialog>
```

#### Alert & Toast

```tsx
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

// Alert
<Alert variant="destructive">
    <AlertDescription>Error message</AlertDescription>
</Alert>

// Toast
toast.success('Success!');
toast.error('Error occurred');
toast.info('Information');
```

### 3. Server Actions

**File:** `lib/actions/myActions.ts`

```typescript
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function createItem(data: { name: string; quantity: number }) {
    const session = await auth();
    if (!session?.user?.email) {
        return { error: 'Unauthorized' };
    }
    
    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });
        
        if (!user) return { error: 'User not found' };
        
        const item = await prisma.inventoryItem.create({
            data: {
                name: data.name,
                quantity: data.quantity,
                userId: user.id
            }
        });
        
        revalidatePath('/inventory');
        return { success: true, item };
        
    } catch (error) {
        console.error('Error creating item:', error);
        return { error: 'Failed to create item' };
    }
}
```

**Using in Component:**

```tsx
"use client";

import { createItem } from '@/lib/actions/myActions';
import { toast } from 'sonner';

const handleSubmit = async (data: FormData) => {
    const result = await createItem(data);
    
    if (result.error) {
        toast.error(result.error);
        return;
    }
    
    toast.success('Item created!');
};
```

### 4. API Route Handler

**File:** `app/api/items/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const items = await prisma.inventoryItem.findMany();
        return NextResponse.json(items);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch items' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const item = await prisma.inventoryItem.create({ data: body });
        return NextResponse.json(item, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create item' },
            { status: 400 }
        );
    }
}
```

## แพทเทิร์นทั่วไป

### ดึงข้อมูลด้วย useEffect

```tsx
"use client";

import { useState, useEffect } from 'react';

export default function ItemList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        fetchItems();
    }, []);
    
    const fetchItems = async () => {
        try {
            const res = await fetch('/api/items');
            const data = await res.json();
            setItems(data);
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) return <div>Loading...</div>;
    
    return (
        <div>
            {items.map(item => (
                <div key={item.id}>{item.name}</div>
            ))}
        </div>
    );
}
```

### การเรนเดอร์แบบมีเงื่อนไข

```tsx
{loading && <Spinner />}
{error && <Alert variant="destructive">{error}</Alert>}
{!loading && !error && <Content />}

{items.length > 0 ? (
    <ItemList items={items} />
) : (
    <EmptyState />
)}
```

### Dynamic Imports

```tsx
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
    loading: () => <p>Loading...</p>,
    ssr: false  // Disable server-side rendering
});
```

## การสไตล์

### TailwindCSS Classes

```tsx
// Layout
<div className="flex items-center justify-between gap-4">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Spacing
<div className="p-4 m-2 space-y-4">

// Typography
<h1 className="text-2xl font-bold text-gray-900">
<p className="text-sm text-gray-500">

// Colors
<div className="bg-blue-500 text-white border border-gray-300">

// Responsive
<div className="w-full md:w-1/2 lg:w-1/3">
```

### cn() Utility

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
    "base-class",
    isActive && "active-class",
    variant === "primary" && "primary-class"
)}>
```

### ประเภท TypeScript

### พร็อพของคอมโพเนนต์

```typescript
interface MyComponentProps {
    userId: number;
    onSuccess?: () => void;
    onCancel?: () => void;
    className?: string;
}

export default function MyComponent({ 
    userId, 
    onSuccess, 
    onCancel,
    className 
}: MyComponentProps) {
    // ...
}
```

### API Response Types

```typescript
interface InventoryItem {
    id: number;
    name: string;
    category: string;
    stockLevels?: StockLevel[];
}

interface StockLevel {
    warehouseId: number;
    quantity: number;
    item: InventoryItem;
}
```

## แนวปฏิบัติที่ดีที่สุด

1. ✅ Use "use client" only when needed (interactivity, hooks)
2. ✅ Use Server Actions for mutations when possible
3. ✅ Validate forms with Zod + react-hook-form
4. ✅ Show loading states and error messages
5. ✅ Use toast for user feedback
6. ✅ Revalidate paths after mutations
7. ✅ Type all props and state
8. ✅ Handle edge cases (empty states, errors)
9. ❌ Don't fetch data on client if you can do it on server
10. ❌ Don't forget to handle loading and error states

## การติดตั้ง Shadcn Components

```bash
cd frontend/next-app

# Install a component
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add alert
```

## อ้างอิงอย่างรวดเร็ว

| Pattern | Use Case |
|---------|----------|
| Server Component | Default, for static content |
| Client Component ("use client") | Forms, interactivity, hooks |
| Server Action | Form submissions, mutations |
| API Route | External API, webhooks, complex logic |
| useEffect | Fetch data on mount, side effects |
| useState | Local component state |
| react-hook-form | Complex forms with validation |
| toast | User notifications |
| revalidatePath | Refresh server data after mutation |
