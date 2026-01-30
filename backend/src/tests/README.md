# Testing Guide for HR-IMS

## การรัน Tests

### Unit Tests
```bash
cd backend
npm test
```

### Integration Tests
```bash
cd backend
npm run test:integration
```

### Coverage Report
```bash
cd backend
npm run test:coverage
```

## Test Structure

```
backend/src/tests/
├── unit/                    # Unit tests (ไม่ต้องใช้ database)
│   ├── settings.test.ts
│   ├── passwordPolicy.test.ts
│   └── cache.test.ts
├── integration/             # Integration tests (ต้องใช้ database)
│   ├── settings.api.test.ts
│   └── auth.test.ts
├── security/               # Security tests
│   └── auth/
│       ├── jwt-attacks.test.ts
│       ├── session-security.test.ts
│       └── brute-force.test.ts
└── setup.ts               # Test setup
```

## Test Categories

### 1. Unit Tests
- ทดสอบฟังก์ชันเดี่ยว
- ไม่ต้องเชื่อมต่อ database
- รันเร็ว

### 2. Integration Tests
- ทดสอบ API endpoints
- ต้องใช้งาน database จริง
- ทดสอบการทำงานร่วมกันของ components

### 3. Security Tests
- JWT attacks
- Session security
- Brute force protection
- SQL injection
- XSS prevention

## Writing Tests

### Unit Test Example
```typescript
describe('Settings Validation', () => {
    it('should validate valid settings', () => {
        const settings = {
            orgName: 'Test',
            borrowLimit: 7,
        };
        const result = validateSettings(settings);
        expect(result.valid).toBe(true);
    });
});
```

### Integration Test Example
```typescript
describe('Settings API', () => {
    it('should update settings', async () => {
        const response = await request(app)
            .put('/api/settings')
            .send({ orgName: 'New Name' })
            .expect(200);
        
        expect(response.body.orgName).toBe('New Name');
    });
});
```

## Best Practices

1. **Arrange-Act-Assert** pattern
2. หนึ่ง test ตรวจสอบหนึ่ง behavior
3. ใช้ descriptive test names
4. Mock external dependencies
5. Clean up after tests

## Environment Variables for Testing

```env
NODE_ENV=test
DATABASE_URL=file:./test.db
JWT_SECRET=test-secret
```
