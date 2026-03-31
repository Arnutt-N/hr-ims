/**
 * Brute Force Attack Tests
 * Tests for password brute force protection and account lockout
 * 
 * OWASP: A07:2021 - Identification and Authentication Failures
 * CWE-307: Improper Restriction of Excessive Authentication Attempts
 */

import request from 'supertest';
import securityConfig from '../config';
import { SecurityHttpClient, SecurityTestResult } from '../utils/http-client';
import { authBypassPayloads } from '../utils/payloads';

const { targets, endpoints, thresholds, severity } = securityConfig;
const client = new SecurityHttpClient(targets.backend);

describe('🔒 Authentication Security - Brute Force Protection', () => {
    const loginEndpoint = endpoints.auth.login;

    // ============================================
    // Account Lockout Tests
    // ============================================
    describe('Account Lockout Mechanism', () => {
        it('ควรบล็อคบัญชีหลังจากล็อกอินผิดเกินจำนวนครั้งที่กำหนด', async () => {
            const testEmail = 'bruteforce.test@example.com';
            const wrongPassword = 'WrongPassword123!';
            const maxAttempts = thresholds.bruteForceAttempts;

            let blockedAfterAttempts = 0;
            let wasBlocked = false;

            // พยายาม login ด้วยรหัสผ่านผิดหลายครั้ง
            for (let i = 1; i <= maxAttempts + 5; i++) {
                const response = await request(targets.backend)
                    .post(loginEndpoint)
                    .send({ email: testEmail, password: wrongPassword })
                    .expect('Content-Type', /json/);

                // ถ้าได้รับ status 429 (Too Many Requests) หรือ account locked message
                if (response.status === 429 ||
                    response.body?.error?.includes('locked') ||
                    response.body?.message?.includes('locked') ||
                    response.body?.message?.includes('attempts')) {
                    wasBlocked = true;
                    blockedAfterAttempts = i;
                    break;
                }
            }

            // Record test result
            const result: SecurityTestResult = {
                testName: 'Account Lockout After Failed Attempts',
                category: 'Authentication',
                severity: wasBlocked ? severity.INFO : severity.HIGH,
                passed: wasBlocked,
                message: wasBlocked
                    ? `Account locked after ${blockedAfterAttempts} failed attempts`
                    : `Account NOT locked after ${maxAttempts + 5} failed attempts - VULNERABLE`,
                details: {
                    request: { method: 'POST', url: loginEndpoint },
                },
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);

            // SECURITY RECOMMENDATION: ควรมี account lockout
            // ถ้าไม่มี lockout mechanism แสดงว่ามีช่องโหว่
            expect(wasBlocked).toBe(true);
        });

        it('ควรมีการ delay response หลังล็อกอินผิดหลายครั้ง (Timing Attack Prevention)', async () => {
            const testEmail = 'timing.test@example.com';
            const wrongPassword = 'WrongPassword123!';
            const responseTimes: number[] = [];

            // วัดเวลา response ในแต่ละครั้ง
            for (let i = 0; i < 5; i++) {
                const startTime = Date.now();

                await request(targets.backend)
                    .post(loginEndpoint)
                    .send({ email: testEmail, password: wrongPassword });

                responseTimes.push(Date.now() - startTime);
            }

            // ตรวจสอบว่า response time เพิ่มขึ้น หรือคงที่ (ไม่ควรเปลี่ยนแปลงมากเกินไป)
            const avgFirstTwo = (responseTimes[0] + responseTimes[1]) / 2;
            const avgLastTwo = (responseTimes[3] + responseTimes[4]) / 2;

            // ถ้า response time สม่ำเสมอ = ดี (ป้องกัน timing attack)
            // ถ้าเพิ่มขึ้น = ดีกว่า (มี progressive delay)
            const isProtected = avgLastTwo >= avgFirstTwo;

            const result: SecurityTestResult = {
                testName: 'Progressive Delay on Failed Login',
                category: 'Authentication',
                severity: isProtected ? severity.INFO : severity.MEDIUM,
                passed: true, // This is informational
                message: `Response times: ${responseTimes.join('ms, ')}ms`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Rate Limiting Tests
    // ============================================
    describe('Login Rate Limiting', () => {
        it('ควรจำกัด rate ของ login requests', async () => {
            const rapidRequestCount = 50;
            let rateLimited = false;
            let limitedAt = 0;

            for (let i = 0; i < rapidRequestCount; i++) {
                const response = await request(targets.backend)
                    .post(loginEndpoint)
                    .send({
                        email: `rapid${i}@test.com`,
                        password: 'test123'
                    });

                if (response.status === 429) {
                    rateLimited = true;
                    limitedAt = i + 1;
                    break;
                }
            }

            const result: SecurityTestResult = {
                testName: 'Login Rate Limiting',
                category: 'Authentication',
                severity: rateLimited ? severity.INFO : severity.HIGH,
                passed: rateLimited,
                message: rateLimited
                    ? `Rate limited after ${limitedAt} requests`
                    : `No rate limiting detected after ${rapidRequestCount} requests - VULNERABLE`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);

            // Optional: Test ถ้ามี rate limiting
            // expect(rateLimited).toBe(true);
        });

        it('ควรจำกัด rate ต่อ IP address', async () => {
            // จำลอง requests จาก IP เดียวกัน
            const requests = Array(20).fill(null).map(() =>
                request(targets.backend)
                    .post(loginEndpoint)
                    .set('X-Forwarded-For', '192.168.1.100')
                    .send({ email: 'test@test.com', password: 'test' })
            );

            const responses = await Promise.all(requests);
            const rateLimitedResponses = responses.filter(r => r.status === 429);

            const result: SecurityTestResult = {
                testName: 'IP-based Rate Limiting',
                category: 'Authentication',
                severity: rateLimitedResponses.length > 0 ? severity.INFO : severity.MEDIUM,
                passed: rateLimitedResponses.length > 0,
                message: rateLimitedResponses.length > 0
                    ? `${rateLimitedResponses.length} requests were rate limited`
                    : 'No IP-based rate limiting detected',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Common Password Tests
    // ============================================
    describe('Credential Security', () => {
        it('ควรปฏิเสธ common passwords', async () => {
            const commonPasswords = authBypassPayloads.commonPasswords;
            const registrationEndpoint = endpoints.auth.register;

            for (const password of commonPasswords.slice(0, 5)) {
                const response = await request(targets.backend)
                    .post(registrationEndpoint)
                    .send({
                        email: `common_pass_test_${Date.now()}@test.com`,
                        password: password,
                        name: 'Test User',
                    });

                // Common passwords should be rejected
                if (response.status === 201) {
                    const result: SecurityTestResult = {
                        testName: 'Common Password Rejection',
                        category: 'Authentication',
                        severity: severity.HIGH,
                        passed: false,
                        message: `Common password "${password}" was accepted - VULNERABLE`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });

        it('ควรบังคับให้ใช้ password ที่แข็งแรง', async () => {
            const weakPasswords = [
                '123456',      // ตัวเลขอย่างเดียว
                'password',    // ตัวอักษรอย่างเดียว
                'abc123',      // สั้นเกินไป
                'ALLCAPS',     // ตัวใหญ่อย่างเดียว
            ];

            const registrationEndpoint = endpoints.auth.register;
            let weakPasswordsAccepted = 0;

            for (const password of weakPasswords) {
                const response = await request(targets.backend)
                    .post(registrationEndpoint)
                    .send({
                        email: `weak_pass_test_${Date.now()}@test.com`,
                        password: password,
                        name: 'Test User',
                    });

                if (response.status === 201 || response.status === 200) {
                    weakPasswordsAccepted++;
                }
            }

            const result: SecurityTestResult = {
                testName: 'Password Strength Enforcement',
                category: 'Authentication',
                severity: weakPasswordsAccepted === 0 ? severity.INFO : severity.HIGH,
                passed: weakPasswordsAccepted === 0,
                message: weakPasswordsAccepted === 0
                    ? 'Weak passwords correctly rejected'
                    : `${weakPasswordsAccepted} weak passwords were accepted - VULNERABLE`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Username Enumeration Tests
    // ============================================
    describe('Username Enumeration Prevention', () => {
        it('ควรให้ response เหมือนกันสำหรับ user ที่มีและไม่มีในระบบ', async () => {
            const existingUser = securityConfig.testUsers.admin.email;
            const nonExistingUser = 'nonexistent_user_12345@test.com';
            const wrongPassword = 'WrongPassword123!';

            const existingUserResponse = await request(targets.backend)
                .post(loginEndpoint)
                .send({ email: existingUser, password: wrongPassword });

            const nonExistingUserResponse = await request(targets.backend)
                .post(loginEndpoint)
                .send({ email: nonExistingUser, password: wrongPassword });

            // ควรได้ status และ message เหมือนกัน
            const sameStatus = existingUserResponse.status === nonExistingUserResponse.status;
            const sameMessageLength = Math.abs(
                JSON.stringify(existingUserResponse.body).length -
                JSON.stringify(nonExistingUserResponse.body).length
            ) < 50;  // อนุญาตให้แตกต่างได้เล็กน้อย

            const isProtected = sameStatus && sameMessageLength;

            const result: SecurityTestResult = {
                testName: 'Username Enumeration Prevention',
                category: 'Authentication',
                severity: isProtected ? severity.INFO : severity.MEDIUM,
                passed: isProtected,
                message: isProtected
                    ? 'Responses are consistent for existing and non-existing users'
                    : 'Different responses for existing vs non-existing users - Enumeration possible',
                details: {
                    response: {
                        status: existingUserResponse.status,
                        body: {
                            existing: existingUserResponse.body,
                            nonExisting: nonExistingUserResponse.body,
                        }
                    }
                },
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี response time ใกล้เคียงกันสำหรับ user ที่มีและไม่มี (Timing Attack Prevention)', async () => {
            const iterations = 5;
            const existingUserTimes: number[] = [];
            const nonExistingUserTimes: number[] = [];

            for (let i = 0; i < iterations; i++) {
                // Test existing user
                let start = Date.now();
                await request(targets.backend)
                    .post(loginEndpoint)
                    .send({ email: securityConfig.testUsers.admin.email, password: 'Wrong123!' });
                existingUserTimes.push(Date.now() - start);

                // Test non-existing user
                start = Date.now();
                await request(targets.backend)
                    .post(loginEndpoint)
                    .send({ email: `nonexistent${i}@test.com`, password: 'Wrong123!' });
                nonExistingUserTimes.push(Date.now() - start);
            }

            const avgExisting = existingUserTimes.reduce((a, b) => a + b) / iterations;
            const avgNonExisting = nonExistingUserTimes.reduce((a, b) => a + b) / iterations;
            const timeDifference = Math.abs(avgExisting - avgNonExisting);

            // ความแตกต่างไม่ควรเกิน 100ms
            const isProtected = timeDifference < 100;

            const result: SecurityTestResult = {
                testName: 'Timing Attack Prevention (Username Enumeration)',
                category: 'Authentication',
                severity: isProtected ? severity.INFO : severity.MEDIUM,
                passed: isProtected,
                message: `Average time difference: ${timeDifference.toFixed(2)}ms`,
                details: {
                    evidence: `Existing user avg: ${avgExisting.toFixed(2)}ms, Non-existing avg: ${avgNonExisting.toFixed(2)}ms`,
                },
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
        console.log('Brute Force Protection Test Summary');
        console.log('========================================');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log('By Severity:', summary.bySeverity);
        console.log('========================================\n');
    });
});
