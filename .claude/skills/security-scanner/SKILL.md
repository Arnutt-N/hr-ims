---
name: security-scanner
description: Security vulnerability scanner and OWASP Top 10 prevention for HR-IMS
version: 1.0.0
author: Claude Code
triggers:
  keywords: ["security", "vulnerability", "OWASP", "XSS", "injection", "CSRF", "audit", "sanitize"]
  file_patterns: ["lib/actions/*", "middleware/*", "*auth*"]
  context: security, compliance, penetration testing
mcp_servers:
  - sequential
personas:
  - security
  - analyzer
---

# Security Scanner

## Core Role

Identify and prevent security vulnerabilities in HR-IMS:
- SQL Injection prevention
- XSS (Cross-Site Scripting) prevention
- CSRF protection
- Authentication & authorization flaws
- Sensitive data exposure
- Security headers validation

---

## OWASP Top 10 Checklist

```yaml
A01_broken_access_control:
  risk: HIGH
  checks:
    - Role-based access control on all routes
    - Server-side authorization checks
    - Resource ownership validation
    - API endpoint protection
  mitigation:
    - Use rbac-guard skill patterns
    - Always check session + roles in Server Actions
    - Never trust client-side checks only

A02_cryptographic_failures:
  risk: HIGH
  checks:
    - Password hashing (bcrypt)
    - JWT secret strength
    - HTTPS enforcement
    - Sensitive data encryption
  mitigation:
    - Use bcrypt for passwords (cost factor >= 10)
    - Strong JWT secrets (32+ chars)
    - Never store passwords in plain text

A03_injection:
  risk: CRITICAL
  checks:
    - SQL injection in Prisma queries
    - NoSQL injection
    - Command injection
    - LDAP injection
  mitigation:
    - Use Prisma parameterized queries
    - Never concatenate user input in queries
    - Validate all inputs with Zod

A04_insecure_design:
  risk: MEDIUM
  checks:
    - Rate limiting
    - Session management
    - Error handling exposure
    - Input validation
  mitigation:
    - Implement rate limiting
    - Secure session configuration
    - Generic error messages

A05_security_misconfiguration:
  risk: MEDIUM
  checks:
    - Default credentials
    - Debug mode enabled
    - Unnecessary features enabled
    - Missing security headers
  mitigation:
    - Change default passwords
    - Disable debug in production
    - Use Helmet.js for headers

A06_vulnerable_components:
  risk: MEDIUM
  checks:
    - Outdated dependencies
    - Known CVEs
    - Unpatched libraries
  mitigation:
    - Regular npm audit
    - Update dependencies
    - Use Dependabot

A07_identification_failures:
  risk: HIGH
  checks:
    - Weak password policy
    - No MFA
    - Session fixation
    - Missing account lockout
  mitigation:
    - Strong password requirements
    - Implement MFA
    - Regenerate session on login

A08_software_integrity_failures:
  risk: MEDIUM
  checks:
    - CI/CD pipeline security
    - Code signing
    - Auto-update security
  mitigation:
    - Secure CI/CD
    - Verify dependencies

A09_logging_failures:
  risk: MEDIUM
  checks:
    - Sensitive data in logs
    - Insufficient logging
    - Log injection
  mitigation:
    - Never log passwords/tokens
    - Log security events
    - Sanitize log input

A10_ssrf:
  risk: MEDIUM
  checks:
    - URL validation
    - Internal network access
    - Cloud metadata access
  mitigation:
    - Validate and sanitize URLs
    - Block internal IPs
    - Use allowlists
```

---

## Security Patterns

### Input Validation

```typescript
// Always use Zod for validation
import { z } from 'zod'

// User input schema
const userSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
  name: z.string().min(2).max(100).regex(/^[\p{L}\s'-]+$/, 'Invalid characters')
})

// Item input schema
const itemSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.number().int().min(0).max(999999),
  serialNumber: z.string().max(100).regex(/^[A-Za-z0-9-]+$/).optional(),
  description: z.string().max(2000).optional()
})

// Sanitize HTML output
import DOMPurify from 'isomorphic-dompurify'

function sanitizeOutput(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  })
}
```

### SQL Injection Prevention

```typescript
// SAFE - Prisma parameterized queries
const items = await prisma.inventoryItem.findMany({
  where: {
    name: { contains: userInput }  // Parameterized automatically
  }
})

// SAFE - Prisma raw with parameters
const result = await prisma.$queryRaw`
  SELECT * FROM items WHERE name = ${userInput}
`

// DANGEROUS - Never do this
const query = `SELECT * FROM items WHERE name = '${userInput}'`
await prisma.$queryRawUnsafe(query)  // NEVER USE
```

### XSS Prevention

```typescript
// In React components - React escapes by default
<div>{userInput}</div>  // Safe

// In dangerouslySetInnerHTML - MUST sanitize
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />

// In server responses
return { message: sanitizeOutput(userInput) }
```

### CSRF Protection

```typescript
// NextAuth handles CSRF automatically
// For custom forms, include CSRF token

// In layout
import { getCsrfToken } from 'next-auth/react'

const csrfToken = await getCsrfToken()

// In form
<input type="hidden" name="csrfToken" value={csrfToken} />

// In Server Action
import { getServerSession } from 'next-auth'

export async function submitForm(formData: FormData) {
  const session = await getServerSession()
  // NextAuth validates CSRF automatically for Server Actions
}
```

### Authentication Security

```typescript
// Password hashing
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Session configuration (auth.ts)
export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    }
  }
  }
}
```

### Authorization Patterns

```typescript
// Always check in Server Actions
export async function sensitiveAction(id: number) {
  const session = await auth()

  // 1. Check authentication
  if (!session?.user?.id) {
    return { error: 'Unauthorized', code: 'UNAUTHORIZED' }
  }

  // 2. Check authorization
  const hasPermission = await hasAnyRole(
    parseInt(session.user.id),
    ['admin', 'superadmin']
  )
  if (!hasPermission) {
    return { error: 'Forbidden', code: 'FORBIDDEN' }
  }

  // 3. Check resource ownership (if applicable)
  const resource = await prisma.someResource.findUnique({ where: { id } })
  if (resource.userId !== parseInt(session.user.id)) {
    // Only allow if admin
    if (!hasPermission) {
      return { error: 'Forbidden', code: 'FORBIDDEN' }
    }
  }

  // 4. Proceed with action
}

// Role checking helper
async function hasAnyRole(userId: number, roles: string[]): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: { role: { select: { slug: true } } }
      }
    }
  })

  return user?.userRoles.some(ur => roles.includes(ur.role.slug)) ?? false
}
```

### Rate Limiting

```typescript
// middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit'

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 login attempts per hour
  message: { error: 'Too many login attempts', code: 'RATE_LIMITED' }
})

// Apply to routes
app.use('/api/', apiLimiter)
app.use('/login', authLimiter)
```

### Security Headers (Helmet)

```typescript
// backend/index.ts
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}))
```

---

## Security Audit Checklist

```typescript
// Run this periodically
const securityChecklist = [
  // Authentication
  { check: 'All passwords are hashed with bcrypt', critical: true },
  { check: 'JWT secret is 32+ characters', critical: true },
  { check: 'Session expires after 24 hours', critical: false },
  { check: 'Login rate limiting is enabled', critical: true },

  // Authorization
  { check: 'All Server Actions check session', critical: true },
  { check: 'All Server Actions check roles', critical: true },
  { check: 'Resource ownership is validated', critical: true },

  // Input Validation
  { check: 'All inputs validated with Zod', critical: true },
  { check: 'File uploads are validated', critical: true },
  { check: 'URLs are sanitized for SSRF', critical: false },

  // Data Protection
  { check: 'Passwords never logged', critical: true },
  { check: 'Sensitive data encrypted at rest', critical: false },
  { check: 'Error messages are generic', critical: false },

  // Headers
  { check: 'Helmet.js is configured', critical: true },
  { check: 'CSP headers are set', critical: true },
  { check: 'CORS is restricted', critical: true },

  // Dependencies
  { check: 'npm audit shows no critical vulnerabilities', critical: true },
  { check: 'Dependencies are up to date', critical: false }
]
```

---

## Security Testing

```typescript
// tests/security/sql-injection.test.ts
import { createItem } from '@/lib/actions/inventory'

describe('SQL Injection Prevention', () => {
  it('should sanitize malicious input', async () => {
    const maliciousInput = {
      name: "'; DROP TABLE items; --",
      quantity: 10
    }

    // Should not throw or cause SQL injection
    const result = await createItem(maliciousInput)

    // Should either validate and reject, or safely store
    expect(result).toBeDefined()
  })

  it('should handle special characters safely', async () => {
    const input = {
      name: '<script>alert("xss")</script>',
      quantity: 5
    }

    const result = await createItem(input)

    if (result.success) {
      expect(result.data.name).not.toContain('<script>')
    }
  })
})

// tests/security/auth.test.ts
describe('Authorization', () => {
  it('should reject unauthenticated requests', async () => {
    // Mock no session
    const result = await createItem({ name: 'Test', quantity: 1 })
    expect(result.error).toBe('Unauthorized')
  })

  it('should reject unauthorized roles', async () => {
    // Mock user session with 'user' role
    const result = await createItem({ name: 'Test', quantity: 1 })
    expect(result.error).toBe('Forbidden')
  })

  it('should allow authorized roles', async () => {
    // Mock admin session
    const result = await createItem({ name: 'Test', quantity: 1 })
    expect(result.success).toBe(true)
  })
})
```

---

*Version: 1.0.0 | For HR-IMS Project*
