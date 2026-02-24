---
name: test-generator
description: Generate tests for HR-IMS using Vitest, Jest, and Playwright
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["test", "spec", "vitest", "jest", "playwright", "e2e", "unit test", "coverage"]
  file_patterns: ["*.test.*", "*.spec.*", "tests/**", "__tests__/**", "e2e/**"]
  context: testing, qa, quality
mcp_servers:
  - playwright
  - sequential
personas:
  - qa
  - backend
  - frontend
---

# Test Generator

## Core Role

Generate comprehensive tests for HR-IMS:
- **Unit tests** with Vitest (frontend) and Jest (backend)
- **E2E tests** with Playwright
- **Integration tests** for Server Actions
- Achieve good coverage on critical paths

---

## Test Stack

```yaml
frontend:
  framework: Vitest
  location: frontend/next-app/tests/
  config: frontend/next-app/vitest.config.ts
  commands:
    run: npm test
    ui: npm run test:ui
    coverage: npm run test:coverage

backend:
  framework: Jest
  location: backend/src/tests/
  config: backend/jest.config.js
  commands:
    run: npm test
    watch: npm run test:watch
    coverage: npm run test:coverage

e2e:
  framework: Playwright
  location: frontend/next-app/tests/e2e/
  config: frontend/next-app/playwright.config.ts
  commands:
    run: npx playwright test
    ui: npx playwright test --ui
    debug: npx playwright test --debug
```

---

## Unit Test Templates

### Frontend Component Test (Vitest)

```typescript
// tests/components/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click me</Button>)

    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows loading state', () => {
    render(<Button disabled>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies variant styles', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-destructive')

    rerender(<Button variant="outline">Cancel</Button>)
    expect(screen.getByRole('button')).toHaveClass('border')
  })
})
```

### Frontend Form Test (Vitest)

```typescript
// tests/components/entity-form.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EntityForm } from '@/components/forms/entity-form'

// Mock server action
vi.mock('@/lib/actions/entity', () => ({
  createEntity: vi.fn()
}))

describe('EntityForm', () => {
  it('renders all form fields', () => {
    render(<EntityForm onSubmit={vi.fn()} />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('shows validation errors', async () => {
    render(<EntityForm onSubmit={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<EntityForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test Item' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Test Item',
        description: '',
        status: 'ACTIVE',
        quantity: 0
      })
    })
  })

  it('shows loading state during submission', async () => {
    const onSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
    render(<EntityForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: /create/i }))

    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### Backend Server Action Test (Jest)

```typescript
// backend/src/tests/actions/inventory.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { createItem, updateItem, deleteItem } from '../../lib/actions/inventory'
import { auth } from '../../auth'
import prisma from '../../lib/prisma'

// Mocks
jest.mock('../../auth')
jest.mock('../../lib/prisma', () => ({
  inventoryItem: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  }
}))

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Inventory Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createItem', () => {
    it('returns unauthorized when not logged in', async () => {
      mockAuth.mockResolvedValue(null as any)

      const result = await createItem({ name: 'Test', quantity: 10 })

      expect(result).toEqual({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
    })

    it('returns forbidden for non-admin users', async () => {
      mockAuth.mockResolvedValue({
        user: { id: '1', role: 'user' }
      } as any)

      const result = await createItem({ name: 'Test', quantity: 10 })

      expect(result).toEqual({ error: 'Forbidden', code: 'FORBIDDEN' })
    })

    it('creates item and audit log for admin', async () => {
      mockAuth.mockResolvedValue({
        user: { id: '1', role: 'admin' }
      } as any)

      mockPrisma.inventoryItem.create.mockResolvedValue({
        id: 1,
        name: 'Test Item',
        quantity: 10,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any)

      const result = await createItem({ name: 'Test Item', quantity: 10 })

      expect(result).toEqual({ success: true, data: expect.objectContaining({ id: 1 }) })
      expect(mockPrisma.auditLog.create).toHaveBeenCalled()
    })

    it('validates input data', async () => {
      mockAuth.mockResolvedValue({
        user: { id: '1', role: 'admin' }
      } as any)

      const result = await createItem({ name: '', quantity: -1 })

      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('code', 'VALIDATION_ERROR')
    })
  })

  describe('updateItem', () => {
    it('creates audit log with old and new data', async () => {
      mockAuth.mockResolvedValue({
        user: { id: '1', role: 'admin' }
      } as any)

      const oldItem = { id: 1, name: 'Old Name', quantity: 5 }
      const newItem = { id: 1, name: 'New Name', quantity: 10 }

      mockPrisma.inventoryItem.findUnique.mockResolvedValue(oldItem as any)
      mockPrisma.inventoryItem.update.mockResolvedValue(newItem as any)

      await updateItem(1, { name: 'New Name', quantity: 10 })

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'UPDATE',
          oldData: expect.objectContaining({ name: 'Old Name' }),
          newData: expect.objectContaining({ name: 'New Name' })
        })
      })
    })
  })

  describe('deleteItem', () => {
    it('returns not found for non-existent item', async () => {
      mockAuth.mockResolvedValue({
        user: { id: '1', role: 'admin' }
      } as any)

      mockPrisma.inventoryItem.findUnique.mockResolvedValue(null)

      const result = await deleteItem(999)

      expect(result).toEqual({ error: 'Not found', code: 'NOT_FOUND' })
    })
  })
})
```

---

## E2E Test Templates (Playwright)

### Authentication Flow

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email/i).fill('admin@hr-ims.com')
    await page.getByLabel(/password/i).fill('admin123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel(/email/i).fill('wrong@email.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/invalid/i)).toBeVisible()
  })

  test('redirects to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login/)
  })

  test('logout redirects to login page', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@hr-ims.com')
    await page.getByLabel(/password/i).fill('admin123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL(/\/dashboard/)

    // Logout
    await page.getByRole('button', { name: /logout/i }).click()

    await expect(page).toHaveURL(/\/login/)
  })
})
```

### Inventory CRUD

```typescript
// tests/e2e/inventory.spec.ts
import { test, expect } from '@playwright/test'

// Helper to login
async function login(page: any) {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('admin@hr-ims.com')
  await page.getByLabel(/password/i).fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('displays inventory list', async ({ page }) => {
    await page.goto('/inventory')

    await expect(page.getByRole('heading', { name: /inventory/i })).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('creates new inventory item', async ({ page }) => {
    await page.goto('/inventory')
    await page.getByRole('button', { name: /add|create/i }).click()

    await page.getByLabel(/name/i).fill('Test Item E2E')
    await page.getByLabel(/quantity/i).fill('100')
    await page.getByRole('button', { name: /save|create/i }).click()

    await expect(page.getByText('Test Item E2E')).toBeVisible()
  })

  test('searches inventory items', async ({ page }) => {
    await page.goto('/inventory')

    await page.getByPlaceholder(/search/i).fill('laptop')
    await page.keyboard.press('Enter')

    // Check that results are filtered
    const rows = page.getByRole('row')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('updates inventory item', async ({ page }) => {
    await page.goto('/inventory')

    // Click edit on first item
    await page.getByRole('button', { name: /edit/i }).first().click()

    await page.getByLabel(/quantity/i).fill('999')
    await page.getByRole('button', { name: /save|update/i }).click()

    await expect(page.getByText('999')).toBeVisible()
  })

  test('deletes inventory item with confirmation', async ({ page }) => {
    await page.goto('/inventory')

    const initialCount = await page.getByRole('row').count()

    await page.getByRole('button', { name: /delete/i }).first().click()

    // Confirm deletion in dialog
    await page.getByRole('button', { name: /^delete$/i }).click()

    await expect(page.getByRole('row')).toHaveCount(initialCount - 1)
  })

  test('pagination works correctly', async ({ page }) => {
    await page.goto('/inventory')

    const nextButton = page.getByRole('button', { name: /next/i })
    if (await nextButton.isEnabled()) {
      await nextButton.click()
      await expect(page.getByText(/page 2/i)).toBeVisible()
    }
  })
})
```

### Role-Based Access Control

```typescript
// tests/e2e/rbac.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Role-Based Access Control', () => {
  test('regular user cannot access admin pages', async ({ page }) => {
    // Login as regular user
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('user@hr-ims.com')
    await page.getByLabel(/password/i).fill('user123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Try to access admin-only page
    await page.goto('/users')

    await expect(page.getByText(/forbidden|unauthorized/i)).toBeVisible()
  })

  test('admin can access user management', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('admin@hr-ims.com')
    await page.getByLabel(/password/i).fill('admin123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await page.goto('/users')

    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible()
  })

  test('UI elements hidden based on role', async ({ page }) => {
    // Login as regular user
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('user@hr-ims.com')
    await page.getByLabel(/password/i).fill('user123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await page.goto('/inventory')

    // Delete button should not be visible
    await expect(page.getByRole('button', { name: /delete/i })).not.toBeVisible()
  })
})
```

---

## Test Configuration

### Vitest Config (Frontend)

```typescript
// frontend/next-app/vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['components/**', 'lib/**'],
      exclude: ['node_modules/**']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
})
```

### Jest Config (Backend)

```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}
```

### Playwright Config

```typescript
// frontend/next-app/playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
})
```

---

## Coverage Targets

```yaml
unit_tests:
  statements: 70%
  branches: 60%
  functions: 70%
  lines: 70%

critical_paths:
  - Authentication flow: 90%
  - Authorization checks: 90%
  - Data validation: 85%
  - Audit logging: 90%

e2e_tests:
  - Login/Logout: required
  - CRUD operations: required
  - Role-based access: required
```

---

## Best Practices

1. **Test behavior, not implementation** - Focus on user-visible outcomes
2. **Use test IDs sparingly** - Prefer accessible selectors
3. **Mock external dependencies** - Database, APIs, auth
4. **Test error states** - Not just happy paths
5. **Keep tests isolated** - No shared state between tests
6. **Use descriptive test names** - Should read like documentation

---

*Version: 1.0.0 | For HR-IMS Project*
