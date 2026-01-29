/**
 * Security Testing Configuration
 * Enterprise-level penetration testing configuration for HR-IMS
 * 
 * มาตรฐาน: OWASP Top 10 2021, OWASP ASVS Level 2, ISO 27001
 */

export const securityConfig = {
    // Target URLs (ใช้ environment variables ถ้ามี)
    targets: {
        backend: process.env.TEST_BACKEND_URL || 'http://localhost:3001',
        frontend: process.env.TEST_FRONTEND_URL || 'http://localhost:3000',
    },

    // Test credentials (สำหรับ test environment เท่านั้น)
    testUsers: {
        superadmin: {
            email: 'superadmin@test.com',
            password: 'Test@123456',
            role: 'superadmin',
            id: 1,
        },
        admin: {
            email: 'admin@test.com',
            password: 'Test@123456',
            role: 'admin',
            id: 2,
        },
        user: {
            email: 'user@test.com',
            password: 'Test@123456',
            role: 'user',
            id: 3,
        },
        attacker: {
            email: 'attacker@evil.com',
            password: 'HackAttempt!',
            role: 'user',
            id: 999,
        },
    },

    // API Endpoints to test
    endpoints: {
        auth: {
            login: '/api/auth/login',
            logout: '/api/auth/logout',
            register: '/api/auth/register',
        },
        inventory: {
            list: '/api/inventory',
            create: '/api/inventory',
            update: '/api/inventory/:id',
            delete: '/api/inventory/:id',
        },
        users: {
            list: '/api/users',
            create: '/api/users',
            update: '/api/users/:id',
            delete: '/api/users/:id',
        },
        requests: {
            list: '/api/requests',
            create: '/api/requests',
            approve: '/api/requests/:id/approve',
        },
        warehouses: {
            list: '/api/warehouses',
            create: '/api/warehouses',
        },
        stockLevels: {
            list: '/api/stock-levels',
            adjust: '/api/stock-levels/:id/adjust',
        },
    },

    // Test timing settings
    timing: {
        requestTimeout: 10000,      // 10 seconds
        bruteForceDelay: 100,       // 100ms between attempts
        rateLimitWindow: 60000,     // 1 minute
        maxConcurrentRequests: 10,
    },

    // Attack thresholds
    thresholds: {
        bruteForceAttempts: 10,     // Lock after 10 failed attempts
        rateLimitRequests: 100,     // Max requests per window
        sessionTimeout: 3600000,    // 1 hour
    },

    // OWASP severity levels
    severity: {
        CRITICAL: 'CRITICAL',       // Immediate exploitation possible
        HIGH: 'HIGH',               // Exploitation with minimal effort
        MEDIUM: 'MEDIUM',           // Requires some conditions
        LOW: 'LOW',                 // Minor impact
        INFO: 'INFO',               // Informational finding
    } as const,

    // Report settings
    reporting: {
        outputDir: './security-reports',
        formats: ['json', 'html'] as const,
        includeStackTraces: false,
        includeSensitiveData: false,
    },
};

// Type exports
export type SecurityConfig = typeof securityConfig;
export type Severity = typeof securityConfig.severity[keyof typeof securityConfig.severity];
export type TestUser = typeof securityConfig.testUsers[keyof typeof securityConfig.testUsers];

export default securityConfig;
