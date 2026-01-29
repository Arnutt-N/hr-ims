/**
 * API Rate Limiting Tests
 * Tests for rate limiting and DoS protection
 * 
 * OWASP: A04:2021 - Insecure Design (Rate Limiting)
 * CWE-770: Allocation of Resources Without Limits
 */

import request from 'supertest';
import securityConfig from '../config';
import { SecurityHttpClient, SecurityTestResult } from '../utils/http-client';

const { targets, endpoints, severity, testUsers, thresholds } = securityConfig;
const client = new SecurityHttpClient(targets.backend);

describe('🔒 API Security - Rate Limiting', () => {
    const adminHeaders = {
        'x-user-id': testUsers.admin.id.toString(),
        'x-user-role': testUsers.admin.role,
    };

    // ============================================
    // Basic Rate Limiting Tests
    // ============================================
    describe('Basic Rate Limiting', () => {
        it('ควรมี rate limiting สำหรับ API endpoints', async () => {
            const requestCount = thresholds.rateLimitRequests + 50;
            let rateLimited = false;
            let limitedAt = 0;

            for (let i = 0; i < requestCount; i++) {
                const response = await request(targets.backend)
                    .get('/api/inventory')
                    .set(adminHeaders);

                if (response.status === 429) {
                    rateLimited = true;
                    limitedAt = i + 1;
                    break;
                }
            }

            const result: SecurityTestResult = {
                testName: 'API Rate Limiting',
                category: 'Rate Limiting',
                severity: rateLimited ? severity.INFO : severity.MEDIUM,
                passed: rateLimited,
                message: rateLimited
                    ? `Rate limited after ${limitedAt} requests`
                    : `No rate limiting detected after ${requestCount} requests`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควลมี rate limiting สำหรับ login endpoint (stricter)', async () => {
            const maxAttempts = 20;
            let rateLimited = false;
            let limitedAt = 0;

            for (let i = 0; i < maxAttempts; i++) {
                const response = await request(targets.backend)
                    .post(endpoints.auth.login)
                    .send({
                        email: 'ratelimit@test.com',
                        password: 'wrongpassword',
                    });

                if (response.status === 429) {
                    rateLimited = true;
                    limitedAt = i + 1;
                    break;
                }
            }

            const result: SecurityTestResult = {
                testName: 'Login Rate Limiting',
                category: 'Rate Limiting',
                severity: rateLimited ? severity.INFO : severity.HIGH,
                passed: rateLimited,
                message: rateLimited
                    ? `Login rate limited after ${limitedAt} attempts`
                    : `No login rate limiting after ${maxAttempts} attempts`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Rate Limit Bypass Tests
    // ============================================
    describe('Rate Limit Bypass Attempts', () => {
        it('ควรป้องกัน rate limit bypass ด้วย X-Forwarded-For spoofing', async () => {
            const ipAddresses = [
                '192.168.1.100',
                '192.168.1.101',
                '192.168.1.102',
                '192.168.1.103',
                '192.168.1.104',
            ];

            let totalRequests = 0;
            let blocked = false;

            // Try to bypass rate limit by rotating IPs
            for (const ip of ipAddresses) {
                for (let i = 0; i < 30; i++) {
                    const response = await request(targets.backend)
                        .get('/api/inventory')
                        .set('X-Forwarded-For', ip)
                        .set(adminHeaders);

                    totalRequests++;

                    if (response.status === 429) {
                        blocked = true;
                        break;
                    }
                }
                if (blocked) break;
            }

            const result: SecurityTestResult = {
                testName: 'X-Forwarded-For Rate Limit Bypass',
                category: 'Rate Limiting',
                severity: blocked ? severity.INFO : severity.MEDIUM,
                passed: blocked,
                message: blocked
                    ? `Rate limiting still works despite X-Forwarded-For (blocked at ${totalRequests} requests)`
                    : `Made ${totalRequests} requests without rate limiting by rotating IPs`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรป้องกัน rate limit bypass ด้วย X-Real-IP spoofing', async () => {
            let blocked = false;
            let requestsMade = 0;

            for (let i = 0; i < 100; i++) {
                const response = await request(targets.backend)
                    .get('/api/inventory')
                    .set('X-Real-IP', `10.0.0.${i % 256}`)
                    .set(adminHeaders);

                requestsMade++;

                if (response.status === 429) {
                    blocked = true;
                    break;
                }
            }

            const result: SecurityTestResult = {
                testName: 'X-Real-IP Rate Limit Bypass',
                category: 'Rate Limiting',
                severity: severity.INFO,
                passed: true, // Informational
                message: blocked
                    ? `Rate limiting works despite X-Real-IP spoofing`
                    : `Made ${requestsMade} requests - server may trust X-Real-IP`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Rate Limit Headers Tests
    // ============================================
    describe('Rate Limit Headers', () => {
        it('ควรมี rate limit headers ใน response', async () => {
            const response = await request(targets.backend)
                .get('/api/inventory')
                .set(adminHeaders);

            const rateLimitHeaders = [
                'x-ratelimit-limit',
                'x-ratelimit-remaining',
                'x-ratelimit-reset',
                'ratelimit-limit',
                'ratelimit-remaining',
                'ratelimit-reset',
            ];

            const foundHeaders: string[] = [];
            for (const header of rateLimitHeaders) {
                if (response.headers[header]) {
                    foundHeaders.push(header);
                }
            }

            const hasRateLimitInfo = foundHeaders.length > 0;

            const result: SecurityTestResult = {
                testName: 'Rate Limit Headers Present',
                category: 'Rate Limiting',
                severity: severity.INFO,
                passed: hasRateLimitInfo,
                message: hasRateLimitInfo
                    ? `Rate limit headers present: ${foundHeaders.join(', ')}`
                    : 'No rate limit headers in response (may still have rate limiting)',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี Retry-After header เมื่อถูก rate limit', async () => {
            // Make many requests to trigger rate limiting
            let rateLimitResponse = null;
            for (let i = 0; i < 200; i++) {
                const response = await request(targets.backend)
                    .post(endpoints.auth.login)
                    .send({
                        email: 'retryafter@test.com',
                        password: 'wrong',
                    });

                if (response.status === 429) {
                    rateLimitResponse = response;
                    break;
                }
            }

            if (rateLimitResponse) {
                const hasRetryAfter = !!rateLimitResponse.headers['retry-after'];

                const result: SecurityTestResult = {
                    testName: 'Retry-After Header on Rate Limit',
                    category: 'Rate Limiting',
                    severity: severity.INFO,
                    passed: hasRetryAfter,
                    message: hasRetryAfter
                        ? `Retry-After header present: ${rateLimitResponse.headers['retry-after']}`
                        : 'No Retry-After header when rate limited',
                    timestamp: new Date().toISOString(),
                };
                client.recordResult(result);
            }
        });
    });

    // ============================================
    // Concurrent Request Tests
    // ============================================
    describe('Concurrent Requests', () => {
        it('ควรจัดการ concurrent requests ได้อย่างเหมาะสม', async () => {
            const concurrentCount = 50;

            const requests = Array(concurrentCount).fill(null).map(() =>
                request(targets.backend)
                    .get('/api/inventory')
                    .set(adminHeaders)
            );

            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const duration = Date.now() - startTime;

            const successCount = responses.filter(r => r.status === 200).length;
            const rateLimitedCount = responses.filter(r => r.status === 429).length;
            const errorCount = responses.filter(r => r.status >= 500).length;

            const result: SecurityTestResult = {
                testName: 'Concurrent Request Handling',
                category: 'Rate Limiting',
                severity: errorCount === 0 ? severity.INFO : severity.MEDIUM,
                passed: errorCount === 0,
                message: `${concurrentCount} concurrent requests: ${successCount} success, ${rateLimitedCount} rate limited, ${errorCount} errors (${duration}ms)`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรไม่ crash เมื่อมี burst traffic', async () => {
            const burstSize = 100;
            let serverAvailable = true;

            // Send burst of requests
            const requests = Array(burstSize).fill(null).map(() =>
                request(targets.backend)
                    .get('/api/health')
            );

            try {
                await Promise.all(requests);
            } catch (error) {
                serverAvailable = false;
            }

            // Check if server is still responsive
            try {
                const healthCheck = await request(targets.backend)
                    .get('/api/health')
                    .timeout(5000);
                serverAvailable = healthCheck.status === 200;
            } catch (error) {
                serverAvailable = false;
            }

            const result: SecurityTestResult = {
                testName: 'Burst Traffic Resilience',
                category: 'Rate Limiting',
                severity: serverAvailable ? severity.INFO : severity.CRITICAL,
                passed: serverAvailable,
                message: serverAvailable
                    ? `Server still responsive after ${burstSize} burst requests`
                    : 'Server became unresponsive after burst traffic',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Endpoint-Specific Rate Limits
    // ============================================
    describe('Endpoint-Specific Rate Limits', () => {
        it('ควรมี stricter rate limit สำหรับ sensitive endpoints', async () => {
            const sensitiveEndpoints = [
                { name: 'password-reset', method: 'POST', url: '/api/auth/reset-password' },
                { name: 'register', method: 'POST', url: '/api/auth/register' },
                { name: 'user-delete', method: 'DELETE', url: '/api/users/1' },
            ];

            for (const ep of sensitiveEndpoints) {
                let rateLimited = false;
                let attempts = 0;

                for (let i = 0; i < 30; i++) {
                    let response;
                    if (ep.method === 'POST') {
                        response = await request(targets.backend)
                            .post(ep.url)
                            .send({});
                    } else if (ep.method === 'DELETE') {
                        response = await request(targets.backend)
                            .delete(ep.url)
                            .set(adminHeaders);
                    }

                    attempts++;

                    if (response?.status === 429) {
                        rateLimited = true;
                        break;
                    }
                }

                if (rateLimited) {
                    const result: SecurityTestResult = {
                        testName: `Rate Limit: ${ep.name}`,
                        category: 'Rate Limiting',
                        severity: severity.INFO,
                        passed: true,
                        message: `${ep.name} rate limited after ${attempts} attempts`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });
    });

    // ============================================
    // Resource Exhaustion Tests
    // ============================================
    describe('Resource Exhaustion Prevention', () => {
        it('ควรจำกัดขนาด request body', async () => {
            // Create a large payload (10MB)
            const largePayload = {
                name: 'x'.repeat(10 * 1024 * 1024),
            };

            const response = await request(targets.backend)
                .post('/api/inventory')
                .set(adminHeaders)
                .send(largePayload);

            const blocked = response.status === 413 || response.status === 400;

            const result: SecurityTestResult = {
                testName: 'Request Body Size Limit',
                category: 'Rate Limiting',
                severity: blocked ? severity.INFO : severity.MEDIUM,
                passed: blocked,
                message: blocked
                    ? 'Large request body correctly rejected'
                    : 'Large request body accepted - may cause resource exhaustion',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรจำกัด query complexity', async () => {
            // Try deep nested query or many parameters
            const manyParams = Array(100).fill(null)
                .map((_, i) => `param${i}=value${i}`)
                .join('&');

            const response = await request(targets.backend)
                .get(`/api/inventory?${manyParams}`)
                .set(adminHeaders);

            const handled = response.status !== 500;

            const result: SecurityTestResult = {
                testName: 'Query Parameter Limit',
                category: 'Rate Limiting',
                severity: handled ? severity.INFO : severity.MEDIUM,
                passed: handled,
                message: handled
                    ? `Handled 100 query parameters (status: ${response.status})`
                    : 'Server error with many query parameters',
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
        console.log('Rate Limiting Test Summary');
        console.log('========================================');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log('By Severity:', summary.bySeverity);
        console.log('========================================\n');
    });
});
