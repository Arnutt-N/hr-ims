---
name: i18n-helper
description: Internationalization (i18n) and localization utilities for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["i18n", "internationalization", "localization", "translation", "language", "locale"]
  file_patterns: ["*i18n*", "*locale*", "*translation*", "lib/i18n*"]
  context: internationalization, localization, translations, multi-language support
mcp_servers:
  - sequential
personas:
  - frontend
---

# i18n Helper

## Core Role

Implement internationalization for HR-IMS:
- Multi-language support (Thai/English)
- Translation management
- Date/number formatting
- RTL support (future)

---

## Translation Service

```typescript
// lib/i18n/translations.ts

export type Locale = 'th' | 'en'

export const translations = {
  th: {
    // Common
    common: {
      save: 'บันทึก',
      cancel: 'ยกเลิก',
      delete: 'ลบ',
      edit: 'แก้ไข',
      create: 'สร้าง',
      search: 'ค้นหา',
      filter: 'กรอง',
      export: 'ส่งออก',
      import: 'นำเข้า',
      print: 'พิมพ์',
      confirm: 'ยืนยัน',
      back: 'กลับ',
      next: 'ถัดไป',
      previous: 'ก่อนหน้า',
      loading: 'กำลังโหลด...',
      noData: 'ไม่มีข้อมูล',
      error: 'เกิดข้อผิดพลาด',
      success: 'สำเร็จ',
      warning: 'คำเตือน',
      info: 'ข้อมูล',
      required: 'จำเป็น',
      optional: 'ไม่จำเป็น',
      all: 'ทั้งหมด',
      none: 'ไม่มี',
      yes: 'ใช่',
      no: 'ไม่ใช่',
      or: 'หรือ',
      and: 'และ'
    },

    // Navigation
    nav: {
      dashboard: 'แดชบอร์ด',
      inventory: 'คลังสินค้า',
      requests: 'คำขอ',
      users: 'ผู้ใช้',
      warehouses: 'คลัง',
      settings: 'การตั้งค่า',
      reports: 'รายงาน',
      logs: 'ประวัติ',
      profile: 'โปรไฟล์',
      logout: 'ออกจากระบบ'
    },

    // Inventory
    inventory: {
      title: 'คลังสินค้า',
      addItem: 'เพิ่มสินค้า',
      editItem: 'แก้ไขสินค้า',
      deleteItem: 'ลบสินค้า',
      itemName: 'ชื่อสินค้า',
      itemCode: 'รหัสสินค้า',
      category: 'หมวดหมู่',
      quantity: 'จำนวน',
      minStock: 'สต็อกขั้นต่ำ',
      maxStock: 'สต็อกสูงสุด',
      unit: 'หน่วย',
      price: 'ราคา',
      location: 'ตำแหน่ง',
      status: 'สถานะ',
      available: 'พร้อมใช้งาน',
      unavailable: 'ไม่พร้อมใช้งาน',
      lowStock: 'สต็อกต่ำ',
      outOfStock: 'หมดสต็อก',
      stockLevel: 'ระดับสต็อก'
    },

    // Requests
    requests: {
      title: 'คำขอ',
      createRequest: 'สร้างคำขอ',
      borrow: 'ยืม',
      withdraw: 'เบิก',
      return: 'คืน',
      pending: 'รออนุมัติ',
      approved: 'อนุมัติแล้ว',
      rejected: 'ปฏิเสธแล้ว',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิกแล้ว',
      requester: 'ผู้ขอ',
      approver: 'ผู้อนุมัติ',
      requestDate: 'วันที่ขอ',
      dueDate: 'วันครบกำหนด',
      reason: 'เหตุผล',
      notes: 'หมายเหตุ'
    },

    // Users
    users: {
      title: 'ผู้ใช้',
      addUser: 'เพิ่มผู้ใช้',
      editUser: 'แก้ไขผู้ใช้',
      deleteUser: 'ลบผู้ใช้',
      name: 'ชื่อ',
      email: 'อีเมล',
      role: 'บทบาท',
      department: 'แผนก',
      position: 'ตำแหน่ง',
      phone: 'โทรศัพท์',
      status: 'สถานะ',
      active: 'ใช้งาน',
      inactive: 'ไม่ใช้งาน',
      lastLogin: 'เข้าสู่ระบบล่าสุด'
    },

    // Roles
    roles: {
      superadmin: 'ผู้ดูแลระบบสูงสุด',
      admin: 'ผู้ดูแลระบบ',
      approver: 'ผู้อนุมัติ',
      auditor: 'ผู้ตรวจสอบ',
      technician: 'ช่างเทคนิค',
      user: 'ผู้ใช้ทั่วไป'
    },

    // Warehouses
    warehouses: {
      title: 'คลังสินค้า',
      addWarehouse: 'เพิ่มคลัง',
      editWarehouse: 'แก้ไขคลัง',
      deleteWarehouse: 'ลบคลัง',
      warehouseName: 'ชื่อคลัง',
      address: 'ที่อยู่',
      manager: 'ผู้จัดการ',
      capacity: 'ความจุ'
    },

    // Auth
    auth: {
      login: 'เข้าสู่ระบบ',
      logout: 'ออกจากระบบ',
      register: 'ลงทะเบียน',
      email: 'อีเมล',
      password: 'รหัสผ่าน',
      confirmPassword: 'ยืนยันรหัสผ่าน',
      forgotPassword: 'ลืมรหัสผ่าน',
      resetPassword: 'รีเซ็ตรหัสผ่าน',
      loginError: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      sessionExpired: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'
    },

    // Validation
    validation: {
      required: 'ฟิลด์นี้จำเป็น',
      email: 'รูปแบบอีเมลไม่ถูกต้อง',
      minLength: 'ต้องมีอย่างน้อย {min} ตัวอักษร',
      maxLength: 'ต้องไม่เกิน {max} ตัวอักษร',
      min: 'ต้องมากกว่าหรือเท่ากับ {min}',
      max: 'ต้องน้อยกว่าหรือเท่ากับ {max}',
      pattern: 'รูปแบบไม่ถูกต้อง',
      unique: 'ค่านี้มีอยู่แล้ว',
      passwordMatch: 'รหัสผ่านไม่ตรงกัน'
    },

    // Messages
    messages: {
      createSuccess: 'สร้างสำเร็จ',
      updateSuccess: 'อัปเดตสำเร็จ',
      deleteSuccess: 'ลบสำเร็จ',
      createError: 'ไม่สามารถสร้างได้',
      updateError: 'ไม่สามารถอัปเดตได้',
      deleteError: 'ไม่สามารถลบได้',
      confirmDelete: 'ยืนยันการลบ?',
      unsavedChanges: 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก',
      networkError: 'ข้อผิดพลาดในการเชื่อมต่อ',
      serverError: 'ข้อผิดพลาดของเซิร์ฟเวอร์'
    },

    // Time
    time: {
      today: 'วันนี้',
      yesterday: 'เมื่อวาน',
      tomorrow: 'พรุ่งนี้',
      thisWeek: 'สัปดาห์นี้',
      thisMonth: 'เดือนนี้',
      thisYear: 'ปีนี้',
      daysAgo: '{count} วันที่แล้ว',
      hoursAgo: '{count} ชั่วโมงที่แล้ว',
      minutesAgo: '{count} นาทีที่แล้ว',
      justNow: 'เมื่อสักครู่'
    }
  },

  en: {
    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      create: 'Create',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      print: 'Print',
      confirm: 'Confirm',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      loading: 'Loading...',
      noData: 'No data',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Info',
      required: 'Required',
      optional: 'Optional',
      all: 'All',
      none: 'None',
      yes: 'Yes',
      no: 'No',
      or: 'or',
      and: 'and'
    },

    // Navigation
    nav: {
      dashboard: 'Dashboard',
      inventory: 'Inventory',
      requests: 'Requests',
      users: 'Users',
      warehouses: 'Warehouses',
      settings: 'Settings',
      reports: 'Reports',
      logs: 'Logs',
      profile: 'Profile',
      logout: 'Logout'
    },

    // Inventory
    inventory: {
      title: 'Inventory',
      addItem: 'Add Item',
      editItem: 'Edit Item',
      deleteItem: 'Delete Item',
      itemName: 'Item Name',
      itemCode: 'Item Code',
      category: 'Category',
      quantity: 'Quantity',
      minStock: 'Min Stock',
      maxStock: 'Max Stock',
      unit: 'Unit',
      price: 'Price',
      location: 'Location',
      status: 'Status',
      available: 'Available',
      unavailable: 'Unavailable',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      stockLevel: 'Stock Level'
    },

    // Requests
    requests: {
      title: 'Requests',
      createRequest: 'Create Request',
      borrow: 'Borrow',
      withdraw: 'Withdraw',
      return: 'Return',
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      completed: 'Completed',
      cancelled: 'Cancelled',
      requester: 'Requester',
      approver: 'Approver',
      requestDate: 'Request Date',
      dueDate: 'Due Date',
      reason: 'Reason',
      notes: 'Notes'
    },

    // Users
    users: {
      title: 'Users',
      addUser: 'Add User',
      editUser: 'Edit User',
      deleteUser: 'Delete User',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      department: 'Department',
      position: 'Position',
      phone: 'Phone',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      lastLogin: 'Last Login'
    },

    // Roles
    roles: {
      superadmin: 'Super Admin',
      admin: 'Admin',
      approver: 'Approver',
      auditor: 'Auditor',
      technician: 'Technician',
      user: 'User'
    },

    // Warehouses
    warehouses: {
      title: 'Warehouses',
      addWarehouse: 'Add Warehouse',
      editWarehouse: 'Edit Warehouse',
      deleteWarehouse: 'Delete Warehouse',
      warehouseName: 'Warehouse Name',
      address: 'Address',
      manager: 'Manager',
      capacity: 'Capacity'
    },

    // Auth
    auth: {
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password',
      resetPassword: 'Reset Password',
      loginError: 'Invalid email or password',
      sessionExpired: 'Session expired, please login again'
    },

    // Validation
    validation: {
      required: 'This field is required',
      email: 'Invalid email format',
      minLength: 'Must be at least {min} characters',
      maxLength: 'Must not exceed {max} characters',
      min: 'Must be at least {min}',
      max: 'Must be at most {max}',
      pattern: 'Invalid format',
      unique: 'This value already exists',
      passwordMatch: 'Passwords do not match'
    },

    // Messages
    messages: {
      createSuccess: 'Created successfully',
      updateSuccess: 'Updated successfully',
      deleteSuccess: 'Deleted successfully',
      createError: 'Failed to create',
      updateError: 'Failed to update',
      deleteError: 'Failed to delete',
      confirmDelete: 'Confirm delete?',
      unsavedChanges: 'You have unsaved changes',
      networkError: 'Network error',
      serverError: 'Server error'
    },

    // Time
    time: {
      today: 'Today',
      yesterday: 'Yesterday',
      tomorrow: 'Tomorrow',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      thisYear: 'This Year',
      daysAgo: '{count} days ago',
      hoursAgo: '{count} hours ago',
      minutesAgo: '{count} minutes ago',
      justNow: 'Just now'
    }
  }
}

export type TranslationKey = keyof typeof translations.th
```

---

## i18n Service

```typescript
// lib/i18n/service.ts
import { translations, Locale, TranslationKey } from './translations'

const DEFAULT_LOCALE: Locale = 'th'
const STORAGE_KEY = 'hr-ims-locale'

// Get stored locale
export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'th' || stored === 'en') {
    return stored
  }

  // Detect browser language
  const browserLang = navigator.language.split('-')[0]
  return browserLang === 'th' ? 'th' : 'en'
}

// Store locale
export function storeLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, locale)
}

// Get translation
export function t(
  key: string,
  locale: Locale = DEFAULT_LOCALE,
  params?: Record<string, string | number>
): string {
  const keys = key.split('.')
  let value: any = translations[locale]

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Fallback to default locale
      value = getFallbackValue(key)
      break
    }
  }

  if (typeof value !== 'string') {
    return key
  }

  // Replace parameters
  if (params) {
    return value.replace(/{(\w+)}/g, (_, param) => {
      return params[param]?.toString() ?? `{${param}}`
    })
  }

  return value
}

// Fallback to default locale
function getFallbackValue(key: string): string {
  const keys = key.split('.')
  let value: any = translations[DEFAULT_LOCALE]

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return key
    }
  }

  return typeof value === 'string' ? value : key
}

// Get nested translations object
export function getTranslations<T extends Record<string, any>>(
  namespace: string,
  locale: Locale = DEFAULT_LOCALE
): T {
  const keys = namespace.split('.')
  let value: any = translations[locale]

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      value = {}
      break
    }
  }

  return value as T
}

// Check if locale is RTL
export function isRTL(locale: Locale): boolean {
  return false // Thai and English are LTR
}

// Get locale display name
export function getLocaleDisplayName(locale: Locale, displayIn?: Locale): string {
  const names: Record<Locale, Record<Locale, string>> = {
    th: { th: 'ไทย', en: 'Thai' },
    en: { th: 'อังกฤษ', en: 'English' }
  }

  return names[locale][displayIn || locale]
}

// Get available locales
export function getAvailableLocales(): Array<{ code: Locale; name: string; nativeName: string }> {
  return [
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
    { code: 'en', name: 'English', nativeName: 'English' }
  ]
}
```

---

## i18n Hook

```typescript
// hooks/use-i18n.ts
'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { t, getStoredLocale, storeLocale, Locale, getAvailableLocales } from '@/lib/i18n/service'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string | number>) => string
  availableLocales: Array<{ code: Locale; name: string; nativeName: string }>
}

const I18nContext = createContext<I18nContextType | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('th')

  useEffect(() => {
    setLocaleState(getStoredLocale())
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    storeLocale(newLocale)
  }, [])

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return t(key, locale, params)
    },
    [locale]
  )

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t: translate,
        availableLocales: getAvailableLocales()
      }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}

// Simple translation hook without context
export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>('th')

  useEffect(() => {
    setLocaleState(getStoredLocale())
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    storeLocale(newLocale)
  }, [])

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return t(key, locale, params)
    },
    [locale]
  )

  return {
    locale,
    setLocale,
    t: translate
  }
}
```

---

## Locale Formatting

```typescript
// lib/i18n/format.ts
import { Locale } from './translations'

// Format date
export function formatDate(
  date: Date | string,
  locale: Locale = 'th',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  }

  // Use Buddhist calendar for Thai
  const localeCode = locale === 'th' ? 'th-TH' : 'en-US'

  return d.toLocaleDateString(localeCode, defaultOptions)
}

// Format date with time
export function formatDateTime(
  date: Date | string,
  locale: Locale = 'th'
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }

  const localeCode = locale === 'th' ? 'th-TH' : 'en-US'
  return d.toLocaleString(localeCode, options)
}

// Format time only
export function formatTime(
  date: Date | string,
  locale: Locale = 'th'
): string {
  const d = typeof date === 'string' ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit'
  }

  const localeCode = locale === 'th' ? 'th-TH' : 'en-US'
  return d.toLocaleTimeString(localeCode, options)
}

// Format relative time
export function formatRelativeTime(
  date: Date | string,
  locale: Locale = 'th'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) {
    return locale === 'th' ? 'เมื่อสักครู่' : 'Just now'
  }
  if (diffMin < 60) {
    return locale === 'th'
      ? `${diffMin} นาทีที่แล้ว`
      : `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
  }
  if (diffHour < 24) {
    return locale === 'th'
      ? `${diffHour} ชั่วโมงที่แล้ว`
      : `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
  }
  if (diffDay < 7) {
    return locale === 'th'
      ? `${diffDay} วันที่แล้ว`
      : `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
  }

  return formatDate(d, locale)
}

// Format number
export function formatNumber(
  num: number,
  locale: Locale = 'th',
  options?: Intl.NumberFormatOptions
): string {
  const localeCode = locale === 'th' ? 'th-TH' : 'en-US'
  return num.toLocaleString(localeCode, options)
}

// Format currency
export function formatCurrency(
  amount: number,
  locale: Locale = 'th',
  currency: string = 'THB'
): string {
  const localeCode = locale === 'th' ? 'th-TH' : 'en-US'

  return amount.toLocaleString(localeCode, {
    style: 'currency',
    currency
  })
}

// Format percentage
export function formatPercent(
  value: number,
  locale: Locale = 'th',
  decimals: number = 0
): string {
  const localeCode = locale === 'th' ? 'th-TH' : 'en-US'

  return (value / 100).toLocaleString(localeCode, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

// Format file size
export function formatFileSize(
  bytes: number,
  locale: Locale = 'th'
): string {
  const units = locale === 'th'
    ? ['ไบต์', 'กิโลไบต์', 'เมกะไบต์', 'กิกะไบต์']
    : ['B', 'KB', 'MB', 'GB']

  let unitIndex = 0
  let size = bytes

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`
}

// Pluralize
export function plural(
  count: number,
  singular: string,
  plural: string,
  locale: Locale = 'th'
): string {
  if (locale === 'th') {
    // Thai doesn't have plural forms
    return singular
  }

  return count === 1 ? singular : plural
}
```

---

## Language Selector Component

```typescript
// components/i18n/language-selector.tsx
'use client'

import { useI18n } from '@/hooks/use-i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'

export function LanguageSelector() {
  const { locale, setLocale, availableLocales } = useI18n()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {locale === 'th' ? 'ไทย' : 'EN'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLocales.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => setLocale(loc.code)}
            className={locale === loc.code ? 'bg-muted' : ''}
          >
            <span className="mr-2">{loc.nativeName}</span>
            <span className="text-muted-foreground text-sm">
              ({loc.name})
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## Usage Examples

```tsx
// Example 1: Basic usage
import { useI18n } from '@/hooks/use-i18n'

function MyComponent() {
  const { t, locale, setLocale } = useI18n()

  return (
    <div>
      <h1>{t('inventory.title')}</h1>
      <button>{t('common.save')}</button>
      <p>{t('validation.minLength', { min: 8 })}</p>
    </div>
  )
}

// Example 2: With I18nProvider
import { I18nProvider } from '@/hooks/use-i18n'

function App({ children }) {
  return (
    <I18nProvider>
      {children}
    </I18nProvider>
  )
}

// Example 3: Date formatting
import { formatDate, formatRelativeTime } from '@/lib/i18n/format'

function DateDisplay({ date }) {
  const { locale } = useI18n()

  return (
    <div>
      <p>Full: {formatDate(date, locale)}</p>
      <p>Relative: {formatRelativeTime(date, locale)}</p>
    </div>
  )
}

// Example 4: Number formatting
import { formatCurrency, formatNumber } from '@/lib/i18n/format'

function PriceDisplay({ price }) {
  const { locale } = useI18n()

  return (
    <div>
      <p>Price: {formatCurrency(price, locale)}</p>
      <p>Quantity: {formatNumber(1234.56, locale)}</p>
    </div>
  )
}

// Example 5: Bilingual text component
function BilingualText({ th, en }: { th: string; en: string }) {
  const { locale } = useI18n()
  return <span>{locale === 'th' ? th : en}</span>
}

// Usage
<BilingualText th="สวัสดี" en="Hello" />
```

---

*Version: 1.0.0 | For HR-IMS Project*
