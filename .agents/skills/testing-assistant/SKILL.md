---
name: Testing Assistant
description: แนวทางการทดสอบ Unit, Integration, E2E สำหรับ HR-IMS
---

# ผู้ช่วยการทดสอบ (Testing Assistant)

คู่มือนี้ช่วยให้คุณเขียนและรันการทดสอบสำหรับโปรเจค HR-IMS

## ภาพรวม

| ประเภท | เครื่องมือ | ขอบเขต |
|--------|-----------|--------|
| Unit Test | Jest/Vitest | ฟังก์ชันเดียว |
| Integration Test | Jest + Supertest | API endpoints |
| E2E Test | Playwright | User flows |

## การติดตั้ง

### Backend

```bash
cd backend
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

### Frontend

```bash
cd frontend/next-app
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
```

## Unit Testing

### Jest Configuration

**ไฟล์:** `backend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
```

### ตัวอย่าง Unit Test

**ไฟล์:** `backend/src/utils/helpers.test.ts`

```typescript
import { calculateTotal, formatDate, validateEmail } from './helpers';

describe('calculateTotal', () => {
  it('ควรคำนวณยอดรวมถูกต้อง', () => {
    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 },
    ];
    expect(calculateTotal(items)).toBe(250);
  });

  it('ควรคืนค่า 0 เมื่อไม่มีรายการ', () => {
    expect(calculateTotal([])).toBe(0);
  });
});

describe('validateEmail', () => {
  it('ควรตรวจสอบอีเมลถูกต้อง', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid')).toBe(false);
  });
});
```

### Testing Prisma Queries

```typescript
import { prismaMock } from '../__mocks__/prisma';
import { getItems, createItem } from './inventoryService';

jest.mock('../utils/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

describe('inventoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ควรดึงรายการสินค้าทั้งหมด', async () => {
    const mockItems = [
      { id: 1, name: 'Laptop', category: 'Electronics' },
    ];
    prismaMock.inventoryItem.findMany.mockResolvedValue(mockItems);

    const result = await getItems();

    expect(result).toEqual(mockItems);
    expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledTimes(1);
  });

  it('ควรสร้างสินค้าใหม่', async () => {
    const newItem = { name: 'Monitor', category: 'Electronics' };
    const createdItem = { id: 1, ...newItem };
    prismaMock.inventoryItem.create.mockResolvedValue(createdItem);

    const result = await createItem(newItem);

    expect(result).toEqual(createdItem);
    expect(prismaMock.inventoryItem.create).toHaveBeenCalledWith({
      data: newItem,
    });
  });
});
```

## Integration Testing

### Supertest สำหรับ API

**ไฟล์:** `backend/src/routes/inventory.test.ts`

```typescript
import request from 'supertest';
import app from '../app';
import prisma from '../utils/prisma';

describe('Inventory API', () => {
  beforeAll(async () => {
    // Setup test data
    await prisma.inventoryItem.create({
      data: { name: 'Test Item', category: 'Test' },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.inventoryItem.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/inventory', () => {
    it('ควรส่งคืนรายการสินค้าทั้งหมด', async () => {
      const response = await request(app)
        .get('/api/inventory')
        .set('x-user-id', '1')
        .set('x-user-role', 'admin');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/inventory', () => {
    it('ควรสร้างสินค้าใหม่', async () => {
      const newItem = {
        name: 'New Item',
        category: 'Electronics',
        type: 'durable',
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('x-user-id', '1')
        .set('x-user-role', 'admin')
        .send(newItem);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(newItem.name);
    });

    it('ควร reject เมื่อข้อมูลไม่ครบ', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .set('x-user-id', '1')
        .set('x-user-role', 'admin')
        .send({});

      expect(response.status).toBe(400);
    });

    it('ควร reject เมื่อไม่มี auth headers', async () => {
      const response = await request(app)
        .post('/api/inventory')
        .send({ name: 'Test' });

      expect(response.status).toBe(401);
    });
  });
});
```

## E2E Testing

### Playwright Configuration

**ไฟล์:** `frontend/next-app/playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

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
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### ตัวอย่าง E2E Tests

**ไฟล์:** `frontend/next-app/tests/e2e/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('ควรแสดงหน้า login', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: /เข้าสู่ระบบ/i })).toBeVisible();
    await expect(page.getByLabel('อีเมล')).toBeVisible();
    await expect(page.getByLabel('รหัสผ่าน')).toBeVisible();
  });

  test('ควรแสดง error เมื่อใส่ข้อมูลไม่ถูกต้อง', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('อีเมล').fill('invalid@test.com');
    await page.getByLabel('รหัสผ่าน').fill('wrongpassword');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/i }).click();

    await expect(page.getByText(/ข้อมูลไม่ถูกต้อง/i)).toBeVisible();
  });

  test('ควร redirect ไป dashboard หลัง login สำเร็จ', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('อีเมล').fill('admin@test.com');
    await page.getByLabel('รหัสผ่าน').fill('password123');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/i }).click();

    await expect(page).toHaveURL(/.*dashboard/);
  });
});
```

**ไฟล์:** `frontend/next-app/tests/e2e/inventory.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel('อีเมล').fill('admin@test.com');
    await page.getByLabel('รหัสผ่าน').fill('password123');
    await page.getByRole('button', { name: /เข้าสู่ระบบ/i }).click();
    await page.waitForURL(/.*dashboard/);
  });

  test('ควรแสดงรายการสินค้า', async ({ page }) => {
    await page.goto('/dashboard/inventory');

    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount.greaterThan(1);
  });

  test('ควรค้นหาสินค้าได้', async ({ page }) => {
    await page.goto('/dashboard/inventory');

    await page.getByPlaceholder('ค้นหา').fill('Laptop');
    await page.keyboard.press('Enter');

    await expect(page.getByText('Laptop')).toBeVisible();
  });
});
```

## React Component Testing

### Vitest + Testing Library

**ไฟล์:** `frontend/next-app/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**ไฟล์:** `frontend/next-app/tests/setup.ts`

```typescript
import '@testing-library/jest-dom/vitest';
```

**ไฟล์:** `frontend/next-app/components/Button.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './ui/button';

describe('Button Component', () => {
  it('ควร render ข้อความถูกต้อง', () => {
    render(<Button>คลิกที่นี่</Button>);
    expect(screen.getByText('คลิกที่นี่')).toBeInTheDocument();
  });

  it('ควรเรียก onClick เมื่อกด', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>กด</Button>);
    
    fireEvent.click(screen.getByText('กด'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('ควร disabled เมื่อ loading', () => {
    render(<Button disabled>กำลังโหลด</Button>);
    expect(screen.getByText('กำลังโหลด')).toBeDisabled();
  });
});
```

## Commands

```bash
# Backend
cd backend
npm test              # รัน tests ทั้งหมด
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report

# Frontend - Unit/Component
cd frontend/next-app
npm test              # Vitest
npm run test:coverage # Coverage

# Frontend - E2E
npx playwright test   # รัน E2E tests
npx playwright test --ui  # UI mode
npx playwright show-report # View report
```

## แนวปฏิบัติที่ดีที่สุด

1. ✅ เขียน test ก่อน fix bug (TDD)
2. ✅ ใช้ชื่อ test ที่อธิบายสิ่งที่ทดสอบ
3. ✅ แยก unit, integration, e2e tests
4. ✅ Mock external dependencies
5. ✅ รัน tests ใน CI pipeline
6. ✅ ตั้งเป้า coverage 80%+
7. ❌ อย่าทดสอบ implementation details
8. ❌ อย่าให้ tests ขึ้นกับ data จริง

## อ้างอิงอย่างรวดเร็ว

| เครื่องมือ | ใช้สำหรับ |
|-----------|-----------|
| Jest | Backend unit/integration |
| Vitest | Frontend unit/component |
| Supertest | API testing |
| Testing Library | React components |
| Playwright | E2E testing |
| MSW | API mocking |

| Coverage | ระดับ |
|----------|-------|
| < 50% | ❌ Low |
| 50-79% | ⚠️ Medium |
| 80%+ | ✅ Good |
