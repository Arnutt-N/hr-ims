/**
 * SQL Injection Tests
 * Tests for SQL injection vulnerabilities
 * 
 * OWASP: A03:2021 - Injection
 * CWE-89: SQL Injection
 */

import request from 'supertest';
import securityConfig from '../config';
import { SecurityHttpClient, SecurityTestResult, responseAnalysis } from '../utils/http-client';
import { sqlInjectionPayloads } from '../utils/payloads';

const { targets, endpoints, severity, testUsers } = securityConfig;
const client = new SecurityHttpClient(targets.backend);

describe('🔒 Injection Security - SQL Injection', () => {
    const adminHeaders = {
        'x-user-id': testUsers.admin.id.toString(),
        'x-user-role': testUsers.admin.role,
    };

    // ============================================
    // Classic SQL Injection Tests
    // ============================================
    describe('Classic SQL Injection', () => {
        it('ควรป้องกัน SQL injection ใน login', async () => {
            const payloads = sqlInjectionPayloads.classic;
            let vulnerablePayloads: string[] = [];

            for (const payload of payloads) {
                const response = await request(targets.backend)
                    .post(endpoints.auth.login)
                    .send({
                        email: payload,
                        password: 'anything',
                    });

                // Check for successful login bypass or SQL error
                if (response.status === 200 && response.body?.token) {
                    vulnerablePayloads.push(payload);
                }

                // Check for SQL errors in response
                if (responseAnalysis.hasSqlError(response)) {
                    vulnerablePayloads.push(`${payload} (SQL Error exposed)`);
                }
            }

            const isProtected = vulnerablePayloads.length === 0;

            const result: SecurityTestResult = {
                testName: 'Login SQL Injection Prevention',
                category: 'SQL Injection',
                severity: isProtected ? severity.INFO : severity.CRITICAL,
                passed: isProtected,
                message: isProtected
                    ? 'Login endpoint protected against SQL injection'
                    : `SQL Injection VULNERABLE: ${vulnerablePayloads.length} payloads succeeded`,
                details: {
                    evidence: vulnerablePayloads.slice(0, 3).join(', '),
                },
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);

            expect(vulnerablePayloads.length).toBe(0);
        });

        it('ควรป้องกัน SQL injection ใน search/filter', async () => {
            const payloads = sqlInjectionPayloads.classic;
            let vulnerablePayloads: string[] = [];

            for (const payload of payloads) {
                const response = await request(targets.backend)
                    .get(`/api/inventory?search=${encodeURIComponent(payload)}`)
                    .set(adminHeaders);

                // Check for SQL error indicators
                if (responseAnalysis.hasSqlError(response)) {
                    vulnerablePayloads.push(payload);
                }
            }

            const isProtected = vulnerablePayloads.length === 0;

            const result: SecurityTestResult = {
                testName: 'Search SQL Injection Prevention',
                category: 'SQL Injection',
                severity: isProtected ? severity.INFO : severity.HIGH,
                passed: isProtected,
                message: isProtected
                    ? 'Search parameter protected against SQL injection'
                    : `SQL errors exposed: ${vulnerablePayloads.length} payloads triggered errors`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรป้องกัน SQL injection ใน URL parameters', async () => {
            const payloads = sqlInjectionPayloads.classic;

            for (const payload of payloads) {
                const response = await request(targets.backend)
                    .get(`/api/inventory/${encodeURIComponent(payload)}`)
                    .set(adminHeaders);

                if (responseAnalysis.hasSqlError(response)) {
                    const result: SecurityTestResult = {
                        testName: 'URL Parameter SQL Injection',
                        category: 'SQL Injection',
                        severity: severity.HIGH,
                        passed: false,
                        message: `SQL error exposed with payload: ${payload.substring(0, 30)}`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });
    });

    // ============================================
    // Union-Based SQL Injection Tests
    // ============================================
    describe('Union-Based SQL Injection', () => {
        it('ควรป้องกัน UNION-based SQL injection', async () => {
            const payloads = sqlInjectionPayloads.union;
            let vulnerablePayloads: string[] = [];

            for (const payload of payloads) {
                const response = await request(targets.backend)
                    .get(`/api/inventory?category=${encodeURIComponent(payload)}`)
                    .set(adminHeaders);

                // Check for signs of UNION injection success
                if (responseAnalysis.hasSqlError(response)) {
                    vulnerablePayloads.push(payload);
                }

                // Check if response contains unexpected data
                if (response.status === 200 && response.body) {
                    const bodyStr = JSON.stringify(response.body).toLowerCase();
                    if (bodyStr.includes('version') || bodyStr.includes('@@')) {
                        vulnerablePayloads.push(`${payload} (Data leaked)`);
                    }
                }
            }

            const isProtected = vulnerablePayloads.length === 0;

            const result: SecurityTestResult = {
                testName: 'UNION SQL Injection Prevention',
                category: 'SQL Injection',
                severity: isProtected ? severity.INFO : severity.CRITICAL,
                passed: isProtected,
                message: isProtected
                    ? 'UNION-based SQL injection protected'
                    : `UNION injection VULNERABLE: ${vulnerablePayloads.length} payloads`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Blind SQL Injection Tests
    // ============================================
    describe('Blind SQL Injection', () => {
        it('ควรป้องกัน Boolean-based blind SQL injection', async () => {
            const truePayload = "' AND 1=1--";
            const falsePayload = "' AND 1=2--";

            const trueResponse = await request(targets.backend)
                .get(`/api/inventory?search=${encodeURIComponent(truePayload)}`)
                .set(adminHeaders);

            const falseResponse = await request(targets.backend)
                .get(`/api/inventory?search=${encodeURIComponent(falsePayload)}`)
                .set(adminHeaders);

            // If responses are significantly different, might be vulnerable
            const trueLengthStr = JSON.stringify(trueResponse.body);
            const falseLengthStr = JSON.stringify(falseResponse.body);
            const significantDifference = Math.abs(trueLengthStr.length - falseLengthStr.length) > 100;

            const result: SecurityTestResult = {
                testName: 'Boolean-based Blind SQL Injection',
                category: 'SQL Injection',
                severity: significantDifference ? severity.HIGH : severity.INFO,
                passed: !significantDifference,
                message: significantDifference
                    ? 'Possible Boolean-based blind SQLi (different responses for 1=1 vs 1=2)'
                    : 'No obvious Boolean-based blind SQLi detected',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรป้องกัน Time-based blind SQL injection', async () => {
            const payloads = sqlInjectionPayloads.timeBased;

            for (const payload of payloads) {
                const startTime = Date.now();

                await request(targets.backend)
                    .get(`/api/inventory?search=${encodeURIComponent(payload)}`)
                    .set(adminHeaders)
                    .timeout(10000);

                const responseTime = Date.now() - startTime;

                // If response takes significantly longer than normal (e.g., 5+ seconds)
                if (responseTime > 5000) {
                    const result: SecurityTestResult = {
                        testName: 'Time-based Blind SQL Injection',
                        category: 'SQL Injection',
                        severity: severity.CRITICAL,
                        passed: false,
                        message: `Time-based SQLi detected: ${responseTime}ms delay with payload`,
                        details: {
                            payload: payload.substring(0, 50),
                            response: { time: responseTime },
                        },
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });
    });

    // ============================================
    // Error-Based SQL Injection Tests
    // ============================================
    describe('Error-Based SQL Injection', () => {
        it('ควรซ่อน SQL error messages จาก users', async () => {
            const payloads = sqlInjectionPayloads.errorBased;
            let errorsExposed: string[] = [];

            for (const payload of payloads) {
                const response = await request(targets.backend)
                    .get(`/api/inventory?id=${encodeURIComponent(payload)}`)
                    .set(adminHeaders);

                if (responseAnalysis.hasSqlError(response)) {
                    errorsExposed.push(payload);
                }
            }

            const isProtected = errorsExposed.length === 0;

            const result: SecurityTestResult = {
                testName: 'SQL Error Message Hiding',
                category: 'SQL Injection',
                severity: isProtected ? severity.INFO : severity.HIGH,
                passed: isProtected,
                message: isProtected
                    ? 'SQL error messages are not exposed'
                    : `SQL error messages exposed with ${errorsExposed.length} payloads`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Parameterized Query Tests
    // ============================================
    describe('Parameterized Queries (Prisma)', () => {
        it('ควรใช้ parameterized queries สำหรับ dynamic inputs', async () => {
            // Test various input points with SQL special characters
            const testInputs = [
                "test'value",
                'test"value',
                "test;value",
                "test--value",
                "test/*value*/",
            ];

            for (const input of testInputs) {
                const response = await request(targets.backend)
                    .get(`/api/inventory?search=${encodeURIComponent(input)}`)
                    .set(adminHeaders);

                // If using Prisma properly, these should either work or return empty, not error
                if (responseAnalysis.hasSqlError(response)) {
                    const result: SecurityTestResult = {
                        testName: 'Parameterized Query Check',
                        category: 'SQL Injection',
                        severity: severity.HIGH,
                        passed: false,
                        message: `SQL error with input "${input}" - May not be using parameterized queries`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });
    });

    // ============================================
    // Second-Order SQL Injection Tests
    // ============================================
    describe('Second-Order SQL Injection', () => {
        it('ควรป้องกัน stored SQL injection payloads', async () => {
            const payload = "Robert'); DROP TABLE users;--";

            // Store the payload
            const createResponse = await request(targets.backend)
                .post('/api/inventory')
                .set(adminHeaders)
                .send({
                    name: payload,
                    category: 'Test',
                    type: 'durable',
                });

            // Try to retrieve/use the stored data
            if (createResponse.status === 201 || createResponse.status === 200) {
                const itemId = createResponse.body?.id;

                const retrieveResponse = await request(targets.backend)
                    .get(`/api/inventory/${itemId}`)
                    .set(adminHeaders);

                // Check if the retrieval triggers SQL injection
                if (responseAnalysis.hasSqlError(retrieveResponse)) {
                    const result: SecurityTestResult = {
                        testName: 'Second-Order SQL Injection',
                        category: 'SQL Injection',
                        severity: severity.CRITICAL,
                        passed: false,
                        message: 'Second-order SQL injection detected when retrieving stored data',
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }

                // Cleanup
                await request(targets.backend)
                    .delete(`/api/inventory/${itemId}`)
                    .set('x-user-id', testUsers.superadmin.id.toString())
                    .set('x-user-role', testUsers.superadmin.role);
            }
        });
    });

    // ============================================
    // Input Validation Tests
    // ============================================
    describe('Input Validation', () => {
        it('ควรมี input validation สำหรับ numeric parameters', async () => {
            const nonNumericValues = [
                "1'",
                "1 OR 1=1",
                "1; DROP TABLE",
                "abc",
                "1e9999",
            ];

            for (const value of nonNumericValues) {
                const response = await request(targets.backend)
                    .get(`/api/inventory?limit=${encodeURIComponent(value)}`)
                    .set(adminHeaders);

                // Should return 400 Bad Request for invalid numeric input
                if (response.status === 200) {
                    // Check if it actually interpreted the value as a number
                    const items = Array.isArray(response.body) ? response.body.length : 0;

                    // If it returned a lot of items, the injection might have worked
                    if (items > 100 || responseAnalysis.hasSqlError(response)) {
                        const result: SecurityTestResult = {
                            testName: 'Numeric Input Validation',
                            category: 'SQL Injection',
                            severity: severity.MEDIUM,
                            passed: false,
                            message: `Invalid numeric input "${value}" not properly validated`,
                            timestamp: new Date().toISOString(),
                        };
                        client.recordResult(result);
                    }
                }
            }
        });

        it('ควร sanitize หรือ reject special characters ใน string inputs', async () => {
            const specialCharInputs = [
                "\x00null_byte",
                "\n\r\nheader_injection",
                "\\backslash",
                "${template}",
                "{{mustache}}",
            ];

            for (const input of specialCharInputs) {
                const response = await request(targets.backend)
                    .post('/api/inventory')
                    .set(adminHeaders)
                    .send({
                        name: input,
                        category: 'Test',
                        type: 'durable',
                    });

                // Check if special characters are handled properly
                if (response.status === 201 && response.body?.name === input) {
                    // Data stored as-is, which might be OK but should be noted
                    const result: SecurityTestResult = {
                        testName: 'Special Character Handling',
                        category: 'SQL Injection',
                        severity: severity.INFO,
                        passed: true,
                        message: `Special characters stored as-is (verify output encoding)`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });
    });

    // ============================================
    // After All - Print Summary
    // ============================================
    afterAll(() => {
        const summary = client.getSummary();
        console.log('\n========================================');
        console.log('SQL Injection Test Summary');
        console.log('========================================');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log('By Severity:', summary.bySeverity);
        console.log('========================================\n');
    });
});
