---
name: theme-manager
description: Theme management with light/dark mode and system preference detection
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["theme", "dark mode", "light mode", "color scheme", "theme switcher"]
  file_patterns: ["*theme*", "components/theme/**"]
  context: theme switching, color modes, user preferences
mcp_servers:
  - sequential
personas:
  - frontend
---

# Theme Manager

## Core Role

Implement theme management for HR-IMS:
- Light/dark mode switching
- System preference detection
- Persistent theme storage
- CSS variable management

---

## Theme Provider

```typescript
// components/providers/theme-provider.tsx
'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
    },
  },
  plugins: [],
}
export default config
```

### CSS Variables

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## Theme Toggle Component

```typescript
// components/theme/theme-toggle.tsx
'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">เปลี่ยนธีม / Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>สว่าง / Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>มืด / Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>ระบบ / System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Simple Toggle Button

```typescript
// components/theme/theme-toggle-simple.tsx
'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggleSimple() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon">
        <Sun className="h-5 w-5" />
      </Button>
    )
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
      <span className="sr-only">เปลี่ยนธีม / Toggle theme</span>
    </Button>
  )
}
```

---

## Theme Hook

```typescript
// hooks/use-theme.ts
'use client'

import { useTheme as useNextTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function useTheme() {
  const { theme, setTheme, systemTheme, resolvedTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'
  const isLight = mounted && resolvedTheme === 'light'
  const isSystem = theme === 'system'

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const setDarkMode = () => setTheme('dark')
  const setLightMode = () => setTheme('light')
  const setSystemMode = () => setTheme('system')

  return {
    theme,
    setTheme,
    systemTheme,
    resolvedTheme,
    mounted,
    isDark,
    isLight,
    isSystem,
    toggleTheme,
    setDarkMode,
    setLightMode,
    setSystemMode
  }
}
```

---

## Layout Integration

```typescript
// app/layout.tsx
import { ThemeProvider } from '@/components/providers/theme-provider'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

## Theme-Aware Components

### Theme-aware Logo

```typescript
// components/theme/theme-logo.tsx
'use client'

import { useTheme } from 'next-themes'
import Image from 'next/image'

interface ThemeLogoProps {
  lightSrc: string
  darkSrc: string
  alt: string
  width: number
  height: number
}

export function ThemeLogo({
  lightSrc,
  darkSrc,
  alt,
  width,
  height
}: ThemeLogoProps) {
  const { resolvedTheme } = useTheme()

  return (
    <Image
      src={resolvedTheme === 'dark' ? darkSrc : lightSrc}
      alt={alt}
      width={width}
      height={height}
    />
  )
}
```

### Theme-aware Icon

```typescript
// components/theme/theme-icon.tsx
'use client'

import { useTheme } from 'next-themes'
import { IconName } from 'lucide-react'

interface ThemeIconProps {
  lightIcon: IconName
  darkIcon: IconName
  className?: string
}

export function ThemeIcon({
  lightIcon: LightIcon,
  darkIcon: DarkIcon,
  className
}: ThemeIconProps) {
  const { resolvedTheme } = useTheme()

  return resolvedTheme === 'dark' ? (
    <DarkIcon className={className} />
  ) : (
    <LightIcon className={className} />
  )
}
```

---

## Theme Switcher with Animation

```typescript
// components/theme/theme-switcher.tsx
'use client'

import * as React from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

const themes = [
  { value: 'light', label: 'สว่าง', labelEn: 'Light', icon: Sun },
  { value: 'dark', label: 'มืด', labelEn: 'Dark', icon: Moon },
  { value: 'system', label: 'ระบบ', labelEn: 'System', icon: Monitor },
]

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className={cn('flex items-center gap-1 p-1 rounded-lg bg-muted', className)}>
      {themes.map((t) => {
        const Icon = t.icon
        const isActive = theme === t.value

        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

---

## User Preference Storage

```typescript
// lib/theme/storage.ts
import { User } from '@prisma/client'

// Store theme preference in database
export async function updateUserTheme(userId: number, theme: string) {
  // This would update a preferences field in the User table
  // or a separate UserPreferences table
}

// Get theme preference from database
export async function getUserTheme(userId: number): Promise<string | null> {
  // This would retrieve from database
  return null
}

// Theme preference in Server Action
export async function saveThemePreference(theme: 'light' | 'dark' | 'system') {
  'use server'

  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  await updateUserTheme(parseInt(session.user.id), theme)

  return { success: true }
}
```

---

## Print Styles

```css
/* app/print.css */
@media print {
  .no-print {
    display: none !important;
  }

  body {
    background: white !important;
    color: black !important;
  }

  .card,
  .table,
  .list {
    break-inside: avoid;
  }

  a {
    text-decoration: none !important;
    color: black !important;
  }
}
```

---

*Version: 1.0.0 | For HR-IMS Project*
