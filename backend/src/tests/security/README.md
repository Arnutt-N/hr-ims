# 🔒 HR-IMS Security Testing Framework

> Enterprise-level security testing suite following OWASP Top 10 2021 and industry best practices.

## 📋 Overview

This security testing framework provides comprehensive penetration testing capabilities for the HR-IMS application. It includes automated tests for authentication, authorization, injection attacks, API security, and infrastructure security.

## 🎯 Security Standards Coverage

| Standard | Coverage |
|----------|----------|
| **OWASP Top 10 2021** | Full coverage |
| **OWASP ASVS Level 2** | Primary controls |
| **CWE Top 25** | Critical vulnerabilities |
| **ISO 27001** | Relevant controls |

## 📁 Directory Structure

```
tests/security/
├── config.ts                 # Security test configuration
├── README.md                 # This file
│
├── utils/
│   ├── payloads.ts          # Attack payloads collection
│   └── http-client.ts       # Security HTTP client
│
├── auth/                     # Authentication tests
│   ├── brute-force.test.ts
│   ├── session-security.test.ts
│   └── jwt-attacks.test.ts
│
├── authz/                    # Authorization tests
│   ├── idor.test.ts
│   └── privilege-escalation.test.ts
│
├── injection/                # Injection attack tests
│   ├── sql-injection.test.ts
│   └── xss.test.ts
│
├── api/                      # API security tests
│   └── rate-limiting.test.ts
│
├── infra/                    # Infrastructure security
│   └── security-headers.test.ts
│
└── pentest/                  # Penetration testing tools
    ├── security-scanner.ts
    └── vuln-reporter.ts
```

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
cd backend
npm install

# Ensure backend server is running
npm run dev
```

### Running Tests

```bash
# Run all security tests
npm test -- --testPathPattern=security

# Run specific test category
npm test -- --testPathPattern=security/auth
npm test -- --testPathPattern=security/injection
npm test -- --testPathPattern=security/authz

# Run with verbose output
npm test -- --testPathPattern=security --verbose
```

### Running Automated Scanner

```bash
# Run full security scan
npx ts-node src/tests/security/pentest/security-scanner.ts

# Generate vulnerability report
npx ts-node src/tests/security/pentest/vuln-reporter.ts ./security-reports/scan-result.json
```

## 🧪 Test Categories

### 1. Authentication Tests (`auth/`)

| Test File | Description | OWASP |
|-----------|-------------|-------|
| `brute-force.test.ts` | Account lockout, rate limiting, password policies | A07:2021 |
| `session-security.test.ts` | Cookie flags, session fixation, session hijacking | A07:2021 |
| `jwt-attacks.test.ts` | Algorithm confusion, signature validation, token replay | A07:2021 |

### 2. Authorization Tests (`authz/`)

| Test File | Description | OWASP |
|-----------|-------------|-------|
| `idor.test.ts` | Direct object reference vulnerabilities | A01:2021 |
| `privilege-escalation.test.ts` | Vertical/horizontal privilege escalation | A01:2021 |

### 3. Injection Tests (`injection/`)

| Test File | Description | OWASP |
|-----------|-------------|-------|
| `sql-injection.test.ts` | Classic, Union, Blind, Time-based SQLi | A03:2021 |
| `xss.test.ts` | Reflected, Stored, DOM-based XSS | A03:2021 |

### 4. API Security Tests (`api/`)

| Test File | Description | OWASP |
|-----------|-------------|-------|
| `rate-limiting.test.ts` | Rate limit enforcement, bypass attempts | A04:2021 |

### 5. Infrastructure Tests (`infra/`)

| Test File | Description | OWASP |
|-----------|-------------|-------|
| `security-headers.test.ts` | HSTS, CSP, CORS, X-Frame-Options | A05:2021 |

## ⚙️ Configuration

Edit `config.ts` to customize:

```typescript
export const securityConfig = {
    // Target URLs
    targets: {
        backend: process.env.TEST_BACKEND_URL || 'http://localhost:3001',
        frontend: process.env.TEST_FRONTEND_URL || 'http://localhost:3000',
    },

    // Test user credentials
    testUsers: {
        superadmin: { ... },
        admin: { ... },
        user: { ... },
    },

    // Attack thresholds
    thresholds: {
        bruteForceAttempts: 10,
        rateLimitRequests: 100,
        sessionTimeoutMinutes: 30,
    },
};
```

## 📊 Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| 🔴 **CRITICAL** | Immediate security risk | Fix before deployment |
| 🟠 **HIGH** | Significant vulnerability | Prioritize in next sprint |
| 🟡 **MEDIUM** | Potential security issue | Plan remediation |
| 🔵 **LOW** | Minor security concern | Review and monitor |
| ⚪ **INFO** | Security observation | Best practice suggestion |

## 📖 Report Output

### Automated Scanner Output

```
╔══════════════════════════════════════════════════╗
║         HR-IMS Security Scanner v1.0             ║
║         Automated Penetration Testing            ║
╚══════════════════════════════════════════════════╝

🎯 Target: http://localhost:3001
📅 Scan Started: 2026-01-28T10:30:00Z

🔍 Scanning Authentication Security
  ⚠️  Found: Username Enumeration [MEDIUM]

🔍 Scanning SQL Injection: GET /api/inventory
  ✓  No vulnerabilities detected

══════════════════════════════════════════════════
               SCAN SUMMARY
══════════════════════════════════════════════════
Scan ID: SCAN-1234567890
Total Vulnerabilities Found: 5
  🔴 Critical: 0
  🟠 High: 1
  🟡 Medium: 3
  🔵 Low: 1
══════════════════════════════════════════════════
```

### Generated Reports

- **JSON Report**: Raw scan results for programmatic processing
- **Markdown Report**: Human-readable report for documentation
- **HTML Report**: Interactive report for stakeholders

## ⚠️ Important Warnings

> [!CAUTION]
> **These tests are designed for TEST ENVIRONMENTS ONLY.**
> 
> Running security tests against production systems without authorization is:
> - Illegal in most jurisdictions
> - A violation of computer crime laws
> - Potentially harmful to systems and data

### Before Running Tests

1. ✅ Ensure you have written authorization
2. ✅ Use TEST or STAGING environment only
3. ✅ Backup all data before testing
4. ✅ Notify relevant stakeholders
5. ✅ Have incident response plan ready

## 🔧 Extending the Framework

### Adding New Payloads

```typescript
// In utils/payloads.ts
export const myNewPayloads = {
    category1: [
        'payload1',
        'payload2',
    ],
};
```

### Creating New Tests

```typescript
// In security/new-category/my-test.test.ts
import securityConfig from '../config';
import { SecurityHttpClient } from '../utils/http-client';

describe('🔒 My Security Test', () => {
    const client = new SecurityHttpClient();

    it('should test something', async () => {
        // Test implementation
    });

    afterAll(() => {
        console.log(client.getSummary());
    });
});
```

## 📚 References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## 📝 License

This security testing framework is part of the HR-IMS project.
For authorized testing purposes only.

---

*Last updated: January 2026*
