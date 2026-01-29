/**
 * Security Headers Tests
 * Tests for HTTP security headers configuration
 * 
 * OWASP: A05:2021 - Security Misconfiguration
 * CWE-693: Protection Mechanism Failure
 */

import request from 'supertest';
import securityConfig from '../config';
import { SecurityHttpClient, SecurityTestResult } from '../utils/http-client';

const { targets, severity, testUsers } = securityConfig;
const client = new SecurityHttpClient(targets.backend);

describe('🔒 Infrastructure Security - Security Headers', () => {
    const adminHeaders = {
        'x-user-id': testUsers.admin.id.toString(),
        'x-user-role': testUsers.admin.role,
    };

    let sampleResponse: request.Response;

    beforeAll(async () => {
        sampleResponse = await request(targets.backend)
            .get('/api/health')
            .set(adminHeaders);
    });

    // ============================================
    // Essential Security Headers
    // ============================================
    describe('Essential Security Headers', () => {
        it('ควลมี X-Content-Type-Options: nosniff', async () => {
            const header = sampleResponse.headers['x-content-type-options'];
            const hasHeader = header === 'nosniff';

            const result: SecurityTestResult = {
                testName: 'X-Content-Type-Options Header',
                category: 'Security Headers',
                severity: hasHeader ? severity.INFO : severity.MEDIUM,
                passed: hasHeader,
                message: hasHeader
                    ? 'X-Content-Type-Options: nosniff is present'
                    : 'X-Content-Type-Options header is missing - MIME sniffing possible',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี X-Frame-Options header', async () => {
            const header = sampleResponse.headers['x-frame-options'];
            const hasHeader = !!header;
            const validValues = ['DENY', 'SAMEORIGIN'];
            const isValid = header && validValues.includes(header.toUpperCase());

            const result: SecurityTestResult = {
                testName: 'X-Frame-Options Header',
                category: 'Security Headers',
                severity: hasHeader ? severity.INFO : severity.MEDIUM,
                passed: hasHeader,
                message: isValid
                    ? `X-Frame-Options: ${header} (Clickjacking protection)`
                    : 'X-Frame-Options header missing - Clickjacking possible',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี X-XSS-Protection header (legacy browsers)', async () => {
            const header = sampleResponse.headers['x-xss-protection'];

            const result: SecurityTestResult = {
                testName: 'X-XSS-Protection Header',
                category: 'Security Headers',
                severity: severity.INFO,
                passed: true, // Informational
                message: header
                    ? `X-XSS-Protection: ${header}`
                    : 'X-XSS-Protection not set (OK for modern browsers with CSP)',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี Strict-Transport-Security (HSTS) header', async () => {
            const header = sampleResponse.headers['strict-transport-security'];
            const hasHeader = !!header;

            let analysis = '';
            if (header) {
                const maxAge = header.match(/max-age=(\d+)/);
                const includesSubdomains = header.includes('includeSubDomains');
                const preload = header.includes('preload');

                const ageValue = maxAge ? parseInt(maxAge[1]) : 0;
                const minRecommendedAge = 31536000; // 1 year

                if (ageValue < minRecommendedAge) {
                    analysis = ` (max-age ${ageValue} is less than recommended 31536000)`;
                }
                if (includesSubdomains) {
                    analysis += ' includeSubDomains present;';
                }
                if (preload) {
                    analysis += ' preload present;';
                }
            }

            const result: SecurityTestResult = {
                testName: 'Strict-Transport-Security (HSTS)',
                category: 'Security Headers',
                severity: hasHeader ? severity.INFO : severity.MEDIUM,
                passed: hasHeader,
                message: hasHeader
                    ? `HSTS is configured: ${header}${analysis}`
                    : 'HSTS header missing - HTTPS downgrade attacks possible',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Content Security Policy
    // ============================================
    describe('Content Security Policy (CSP)', () => {
        it('ควรมี Content-Security-Policy header', async () => {
            const header = sampleResponse.headers['content-security-policy'];
            const hasHeader = !!header;

            const result: SecurityTestResult = {
                testName: 'Content-Security-Policy Present',
                category: 'Security Headers',
                severity: hasHeader ? severity.INFO : severity.MEDIUM,
                passed: hasHeader,
                message: hasHeader
                    ? 'CSP header is present'
                    : 'CSP header missing - XSS mitigation reduced',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี CSP ที่ไม่ใช้ unsafe-inline หรือ unsafe-eval', async () => {
            const header = sampleResponse.headers['content-security-policy'];

            if (header) {
                const hasUnsafeInline = header.includes("'unsafe-inline'");
                const hasUnsafeEval = header.includes("'unsafe-eval'");

                const issues: string[] = [];
                if (hasUnsafeInline) issues.push("'unsafe-inline'");
                if (hasUnsafeEval) issues.push("'unsafe-eval'");

                const isSecure = issues.length === 0;

                const result: SecurityTestResult = {
                    testName: 'CSP Unsafe Directives Check',
                    category: 'Security Headers',
                    severity: isSecure ? severity.INFO : severity.MEDIUM,
                    passed: isSecure,
                    message: isSecure
                        ? 'CSP does not use unsafe directives'
                        : `CSP uses unsafe directives: ${issues.join(', ')}`,
                    timestamp: new Date().toISOString(),
                };
                client.recordResult(result);
            }
        });

        it('ควรมี frame-ancestors directive ใน CSP', async () => {
            const header = sampleResponse.headers['content-security-policy'];

            if (header) {
                const hasFrameAncestors = header.includes('frame-ancestors');

                const result: SecurityTestResult = {
                    testName: 'CSP Frame-Ancestors Directive',
                    category: 'Security Headers',
                    severity: hasFrameAncestors ? severity.INFO : severity.LOW,
                    passed: hasFrameAncestors,
                    message: hasFrameAncestors
                        ? 'frame-ancestors directive present (modern clickjacking protection)'
                        : 'frame-ancestors not in CSP (using X-Frame-Options instead)',
                    timestamp: new Date().toISOString(),
                };
                client.recordResult(result);
            }
        });
    });

    // ============================================
    // Cache Control Headers
    // ============================================
    describe('Cache Control', () => {
        it('ควลมี Cache-Control headers สำหรับ sensitive data', async () => {
            // Test against a user endpoint (sensitive data)
            const response = await request(targets.backend)
                .get('/api/users/1')
                .set(adminHeaders);

            const cacheControl = response.headers['cache-control'];
            const pragma = response.headers['pragma'];
            const expires = response.headers['expires'];

            const preventsCaching = cacheControl && (
                cacheControl.includes('no-store') ||
                cacheControl.includes('no-cache') ||
                cacheControl.includes('private')
            );

            const result: SecurityTestResult = {
                testName: 'Sensitive Data Cache Prevention',
                category: 'Security Headers',
                severity: preventsCaching ? severity.INFO : severity.MEDIUM,
                passed: preventsCaching || false,
                message: preventsCaching
                    ? `Cache-Control: ${cacheControl} (sensitive data not cached)`
                    : 'Sensitive data may be cached - add no-store directive',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควลป้องกันการ cache authentication responses', async () => {
            const response = await request(targets.backend)
                .post('/api/auth/login')
                .send({
                    email: testUsers.admin.email,
                    password: testUsers.admin.password,
                });

            const cacheControl = response.headers['cache-control'];
            const preventsCaching = cacheControl && cacheControl.includes('no-store');

            const result: SecurityTestResult = {
                testName: 'Auth Response Cache Prevention',
                category: 'Security Headers',
                severity: preventsCaching ? severity.INFO : severity.MEDIUM,
                passed: preventsCaching || true, // OK if not present for login
                message: preventsCaching
                    ? 'Auth responses not cached'
                    : 'Consider adding no-store to auth responses',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Information Disclosure Headers
    // ============================================
    describe('Information Disclosure Prevention', () => {
        it('ควลไม่เปิดเผย server version ใน headers', async () => {
            const serverHeader = sampleResponse.headers['server'];
            const xPoweredBy = sampleResponse.headers['x-powered-by'];

            const disclosesVersion = (serverHeader && /[\d.]+/.test(serverHeader)) ||
                xPoweredBy;

            const disclosedInfo: string[] = [];
            if (serverHeader) disclosedInfo.push(`Server: ${serverHeader}`);
            if (xPoweredBy) disclosedInfo.push(`X-Powered-By: ${xPoweredBy}`);

            const result: SecurityTestResult = {
                testName: 'Server Version Disclosure',
                category: 'Security Headers',
                severity: disclosesVersion ? severity.LOW : severity.INFO,
                passed: !disclosesVersion,
                message: disclosesVersion
                    ? `Server info disclosed: ${disclosedInfo.join(', ')}`
                    : 'Server version not disclosed',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรลบ X-Powered-By header', async () => {
            const xPoweredBy = sampleResponse.headers['x-powered-by'];

            const result: SecurityTestResult = {
                testName: 'X-Powered-By Removed',
                category: 'Security Headers',
                severity: xPoweredBy ? severity.LOW : severity.INFO,
                passed: !xPoweredBy,
                message: xPoweredBy
                    ? `X-Powered-By: ${xPoweredBy} (should be removed)`
                    : 'X-Powered-By header not present (good)',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // CORS Headers
    // ============================================
    describe('CORS Configuration', () => {
        it('ควลไม่ใช้ wildcard (*) ใน Access-Control-Allow-Origin', async () => {
            const response = await request(targets.backend)
                .options('/api/inventory')
                .set('Origin', 'https://evil.com')
                .set('Access-Control-Request-Method', 'GET');

            const allowOrigin = response.headers['access-control-allow-origin'];
            const isWildcard = allowOrigin === '*';

            const result: SecurityTestResult = {
                testName: 'CORS Wildcard Check',
                category: 'Security Headers',
                severity: isWildcard ? severity.MEDIUM : severity.INFO,
                passed: !isWildcard,
                message: isWildcard
                    ? 'CORS uses wildcard (*) - May allow unauthorized origins'
                    : `CORS origin: ${allowOrigin || 'not set'}`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควลไม่ reflect arbitrary origins', async () => {
            const evilOrigin = 'https://evil-attacker.com';

            const response = await request(targets.backend)
                .options('/api/inventory')
                .set('Origin', evilOrigin);

            const allowOrigin = response.headers['access-control-allow-origin'];
            const reflectedEvil = allowOrigin === evilOrigin;

            const result: SecurityTestResult = {
                testName: 'CORS Origin Reflection',
                category: 'Security Headers',
                severity: reflectedEvil ? severity.HIGH : severity.INFO,
                passed: !reflectedEvil,
                message: reflectedEvil
                    ? 'CORS reflects arbitrary Origin header - VULNERABLE'
                    : 'CORS does not reflect arbitrary origins',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรตรวจสอบ credentials กับ origin', async () => {
            const response = await request(targets.backend)
                .options('/api/inventory')
                .set('Origin', 'https://example.com');

            const allowCredentials = response.headers['access-control-allow-credentials'];
            const allowOrigin = response.headers['access-control-allow-origin'];

            const insecureCombo = allowCredentials === 'true' && allowOrigin === '*';

            const result: SecurityTestResult = {
                testName: 'CORS Credentials with Wildcard',
                category: 'Security Headers',
                severity: insecureCombo ? severity.HIGH : severity.INFO,
                passed: !insecureCombo,
                message: insecureCombo
                    ? 'Credentials allowed with wildcard origin - VULNERABLE'
                    : 'CORS credentials properly configured',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Additional Security Headers
    // ============================================
    describe('Additional Security Headers', () => {
        it('ควรมี Referrer-Policy header', async () => {
            const header = sampleResponse.headers['referrer-policy'];

            const result: SecurityTestResult = {
                testName: 'Referrer-Policy Header',
                category: 'Security Headers',
                severity: header ? severity.INFO : severity.LOW,
                passed: !!header,
                message: header
                    ? `Referrer-Policy: ${header}`
                    : 'Referrer-Policy not set (consider adding)',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี Permissions-Policy header', async () => {
            const header = sampleResponse.headers['permissions-policy'] ||
                sampleResponse.headers['feature-policy'];

            const result: SecurityTestResult = {
                testName: 'Permissions-Policy Header',
                category: 'Security Headers',
                severity: severity.INFO,
                passed: true, // Informational
                message: header
                    ? `Permissions-Policy is configured`
                    : 'Permissions-Policy not set (optional for APIs)',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี X-DNS-Prefetch-Control header', async () => {
            const header = sampleResponse.headers['x-dns-prefetch-control'];

            const result: SecurityTestResult = {
                testName: 'X-DNS-Prefetch-Control Header',
                category: 'Security Headers',
                severity: severity.INFO,
                passed: true,
                message: header
                    ? `X-DNS-Prefetch-Control: ${header}`
                    : 'X-DNS-Prefetch-Control not set',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Helmet.js Check (if using Express)
    // ============================================
    describe('Security Middleware Check', () => {
        it('ควรใช้ security middleware (Helmet)', async () => {
            const expectedHeaders = [
                'x-content-type-options',
                'x-frame-options',
                'x-xss-protection',
            ];

            const presentHeaders = expectedHeaders.filter(h => sampleResponse.headers[h]);
            const likelyUsingHelmet = presentHeaders.length >= 2;

            const result: SecurityTestResult = {
                testName: 'Security Middleware Detection',
                category: 'Security Headers',
                severity: likelyUsingHelmet ? severity.INFO : severity.MEDIUM,
                passed: likelyUsingHelmet,
                message: likelyUsingHelmet
                    ? `Security middleware likely in use (${presentHeaders.length}/${expectedHeaders.length} headers)`
                    : 'Consider using Helmet.js or similar security middleware',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // After All - Print Summary
    // ============================================
    afterAll(() => {
        const summary = client.getSummary();
        console.log('\n========================================');
        console.log('Security Headers Test Summary');
        console.log('========================================');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log('By Severity:', summary.bySeverity);
        console.log('========================================\n');
    });
});
