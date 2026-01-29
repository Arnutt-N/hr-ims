/**
 * JWT Attack Tests
 * Tests for JWT token vulnerabilities and security
 * 
 * OWASP: A02:2021 - Cryptographic Failures
 * CWE-347: Improper Verification of Cryptographic Signature
 * CWE-757: Selection of Less-Secure Algorithm During Negotiation
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import securityConfig from '../config';
import { SecurityHttpClient, SecurityTestResult } from '../utils/http-client';

const { targets, endpoints, severity } = securityConfig;
const client = new SecurityHttpClient(targets.backend);

// Helper to create Base64URL encoding
function base64url(str: string): string {
    return Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

describe('🔒 Authentication Security - JWT Attacks', () => {
    let validToken: string;

    // Get a valid token first
    beforeAll(async () => {
        const response = await request(targets.backend)
            .post(endpoints.auth.login)
            .send({
                email: securityConfig.testUsers.admin.email,
                password: securityConfig.testUsers.admin.password,
            });

        validToken = response.body?.token || '';
    });

    // ============================================
    // Algorithm Confusion Attacks
    // ============================================
    describe('Algorithm Confusion Attacks', () => {
        it('ควรปฏิเสธ token ที่ใช้ algorithm "none"', async () => {
            // Create token with "none" algorithm
            const header = { alg: 'none', typ: 'JWT' };
            const payload = {
                id: 1,
                role: 'superadmin',
                email: 'attacker@evil.com'
            };

            const noneToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}.`;

            const response = await request(targets.backend)
                .get(endpoints.users.list)
                .set('Authorization', `Bearer ${noneToken}`)
                .set('x-user-id', '1')
                .set('x-user-role', 'superadmin');

            // Should be rejected
            const rejected = response.status === 401 || response.status === 403;

            const result: SecurityTestResult = {
                testName: 'JWT None Algorithm Attack',
                category: 'JWT Security',
                severity: rejected ? severity.INFO : severity.CRITICAL,
                passed: rejected,
                message: rejected
                    ? 'Token with "none" algorithm correctly rejected'
                    : 'Token with "none" algorithm ACCEPTED - CRITICAL VULNERABILITY',
                details: {
                    payload: noneToken.substring(0, 50) + '...',
                },
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);

            expect(rejected).toBe(true);
        });

        it('ควรปฏิเสธ token ที่ใช้ algorithm "NONE" (case variation)', async () => {
            // Try different case variations
            const variations = ['NONE', 'None', 'nOnE', 'noNe'];

            for (const alg of variations) {
                const header = { alg, typ: 'JWT' };
                const payload = { id: 1, role: 'superadmin' };

                const token = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}.`;

                const response = await request(targets.backend)
                    .get(endpoints.users.list)
                    .set('Authorization', `Bearer ${token}`);

                if (response.status === 200) {
                    const result: SecurityTestResult = {
                        testName: `JWT Algorithm Case Confusion (${alg})`,
                        category: 'JWT Security',
                        severity: severity.CRITICAL,
                        passed: false,
                        message: `Token with algorithm "${alg}" was ACCEPTED - CRITICAL`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });

        it('ควรปฏิเสธ HS256 token เมื่อ server คาดหวัง RS256 (Algorithm Confusion)', async () => {
            // Try to use HS256 with public key as secret (classic attack)
            // This test checks if server properly validates algorithm
            const header = { alg: 'HS256', typ: 'JWT' };
            const payload = {
                id: 1,
                role: 'superadmin',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600,
            };

            // Sign with a known/guessed secret
            const fakeSecrets = ['secret', 'password', 'jwt_secret', 'hs256_secret'];

            for (const secret of fakeSecrets) {
                try {
                    const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

                    const response = await request(targets.backend)
                        .get(endpoints.users.list)
                        .set('Authorization', `Bearer ${token}`);

                    if (response.status === 200) {
                        const result: SecurityTestResult = {
                            testName: 'JWT Algorithm Confusion (HS256 with weak secret)',
                            category: 'JWT Security',
                            severity: severity.CRITICAL,
                            passed: false,
                            message: `Token accepted with weak secret: "${secret}"`,
                            timestamp: new Date().toISOString(),
                        };
                        client.recordResult(result);
                    }
                } catch (error) {
                    // Token creation failed, continue
                }
            }
        });
    });

    // ============================================
    // Signature Validation Tests
    // ============================================
    describe('Signature Validation', () => {
        it('ควรปฏิเสธ token ที่ signature ถูกแก้ไข', async () => {
            if (!validToken) {
                console.log('Skipping: No valid token available');
                return;
            }

            // Tamper with the signature
            const parts = validToken.split('.');
            if (parts.length === 3) {
                // Modify signature by changing last few characters
                const tamperedSignature = parts[2].substring(0, parts[2].length - 5) + 'XXXXX';
                const tamperedToken = `${parts[0]}.${parts[1]}.${tamperedSignature}`;

                const response = await request(targets.backend)
                    .get(endpoints.users.list)
                    .set('Authorization', `Bearer ${tamperedToken}`);

                const rejected = response.status === 401 || response.status === 403;

                const result: SecurityTestResult = {
                    testName: 'JWT Tampered Signature Rejection',
                    category: 'JWT Security',
                    severity: rejected ? severity.INFO : severity.CRITICAL,
                    passed: rejected,
                    message: rejected
                        ? 'Tampered signature correctly rejected'
                        : 'Tampered signature ACCEPTED - CRITICAL',
                    timestamp: new Date().toISOString(),
                };
                client.recordResult(result);

                expect(rejected).toBe(true);
            }
        });

        it('ควรปฏิเสธ token ที่ไม่มี signature', async () => {
            if (!validToken) return;

            const parts = validToken.split('.');
            const tokenWithoutSignature = `${parts[0]}.${parts[1]}.`;

            const response = await request(targets.backend)
                .get(endpoints.users.list)
                .set('Authorization', `Bearer ${tokenWithoutSignature}`);

            const rejected = response.status === 401 || response.status === 403;

            const result: SecurityTestResult = {
                testName: 'JWT Missing Signature Rejection',
                category: 'JWT Security',
                severity: rejected ? severity.INFO : severity.CRITICAL,
                passed: rejected,
                message: rejected
                    ? 'Token without signature correctly rejected'
                    : 'Token without signature ACCEPTED - CRITICAL',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Token Expiration Tests
    // ============================================
    describe('Token Expiration', () => {
        it('ควรปฏิเสธ expired token', async () => {
            // Create an expired token
            const header = { alg: 'HS256', typ: 'JWT' };
            const payload = {
                id: 1,
                role: 'admin',
                iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
                exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
            };

            // This won't be a valid signature, but we're testing expiration check
            const expiredToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}.invalidsignature`;

            const response = await request(targets.backend)
                .get(endpoints.users.list)
                .set('Authorization', `Bearer ${expiredToken}`);

            const rejected = response.status === 401 || response.status === 403;

            const result: SecurityTestResult = {
                testName: 'JWT Expired Token Rejection',
                category: 'JWT Security',
                severity: severity.INFO,
                passed: rejected,
                message: rejected
                    ? 'Expired token correctly rejected'
                    : 'Token validation may not check expiration properly',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรปฏิเสธ token ที่ใช้ก่อนเวลา (nbf claim)', async () => {
            const header = { alg: 'HS256', typ: 'JWT' };
            const payload = {
                id: 1,
                role: 'admin',
                iat: Math.floor(Date.now() / 1000),
                nbf: Math.floor(Date.now() / 1000) + 3600, // Not valid until 1 hour from now
                exp: Math.floor(Date.now() / 1000) + 7200,
            };

            const futureToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}.invalidsignature`;

            const response = await request(targets.backend)
                .get(endpoints.users.list)
                .set('Authorization', `Bearer ${futureToken}`);

            const rejected = response.status === 401 || response.status === 403;

            const result: SecurityTestResult = {
                testName: 'JWT Not Before (nbf) Claim Validation',
                category: 'JWT Security',
                severity: severity.INFO,
                passed: true, // Informational
                message: rejected
                    ? 'Token with future nbf correctly rejected'
                    : 'Server may not validate nbf claim',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Token Reuse After Logout
    // ============================================
    describe('Token Reuse Prevention', () => {
        it('ควรปฏิเสธ token หลัง logout', async () => {
            // Login to get fresh token
            const loginResponse = await request(targets.backend)
                .post(endpoints.auth.login)
                .send({
                    email: securityConfig.testUsers.admin.email,
                    password: securityConfig.testUsers.admin.password,
                });

            const token = loginResponse.body?.token;
            if (!token) {
                console.log('Skipping: No token received from login');
                return;
            }

            // Logout
            await request(targets.backend)
                .post(endpoints.auth.logout)
                .set('Authorization', `Bearer ${token}`);

            // Try to use the old token
            const response = await request(targets.backend)
                .get(endpoints.users.list)
                .set('Authorization', `Bearer ${token}`)
                .set('x-user-id', '1')
                .set('x-user-role', 'admin');

            // Ideally should be rejected, but stateless JWTs may still work
            const rejected = response.status === 401 || response.status === 403;

            const result: SecurityTestResult = {
                testName: 'JWT Token Reuse After Logout',
                category: 'JWT Security',
                severity: rejected ? severity.INFO : severity.MEDIUM,
                passed: true, // Informational - stateless JWT limitation
                message: rejected
                    ? 'Token correctly invalidated after logout (token blacklist implemented)'
                    : 'Token still valid after logout (stateless JWT - consider blacklist)',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // JWT Claim Manipulation
    // ============================================
    describe('JWT Claim Manipulation', () => {
        it('ควรปฏิเสธ token ที่ payload ถูกแก้ไข (role escalation)', async () => {
            if (!validToken) return;

            const parts = validToken.split('.');
            if (parts.length === 3) {
                // Decode and modify payload
                try {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                    payload.role = 'superadmin'; // Escalate role

                    // Re-encode with modified payload but original signature
                    const modifiedToken = `${parts[0]}.${base64url(JSON.stringify(payload))}.${parts[2]}`;

                    const response = await request(targets.backend)
                        .get(endpoints.users.list)
                        .set('Authorization', `Bearer ${modifiedToken}`);

                    const rejected = response.status === 401 || response.status === 403;

                    const result: SecurityTestResult = {
                        testName: 'JWT Payload Manipulation (Role Escalation)',
                        category: 'JWT Security',
                        severity: rejected ? severity.INFO : severity.CRITICAL,
                        passed: rejected,
                        message: rejected
                            ? 'Modified payload correctly detected and rejected'
                            : 'Modified payload ACCEPTED - Signature validation may be broken',
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                } catch (error) {
                    // Payload parsing failed
                }
            }
        });
    });

    // ============================================
    // Weak Secret Tests
    // ============================================
    describe('JWT Secret Strength', () => {
        it('ควรไม่ใช้ weak secrets สำหรับ JWT signing', async () => {
            const weakSecrets = [
                'secret',
                'password',
                'jwt',
                '123456',
                'admin',
                'key',
                'test',
                'secret123',
                'jwt_secret',
                'my-secret',
            ];

            const payload = {
                id: 1,
                role: 'admin',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600,
            };

            let vulnerableSecretFound = false;

            for (const secret of weakSecrets) {
                try {
                    const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

                    const response = await request(targets.backend)
                        .get(endpoints.users.list)
                        .set('Authorization', `Bearer ${token}`)
                        .set('x-user-id', '1')
                        .set('x-user-role', 'admin');

                    if (response.status === 200) {
                        vulnerableSecretFound = true;
                        const result: SecurityTestResult = {
                            testName: 'JWT Weak Secret Detection',
                            category: 'JWT Security',
                            severity: severity.CRITICAL,
                            passed: false,
                            message: `Weak JWT secret discovered: "${secret}"`,
                            timestamp: new Date().toISOString(),
                        };
                        client.recordResult(result);
                        break;
                    }
                } catch (error) {
                    // Token signing failed, continue
                }
            }

            if (!vulnerableSecretFound) {
                const result: SecurityTestResult = {
                    testName: 'JWT Weak Secret Detection',
                    category: 'JWT Security',
                    severity: severity.INFO,
                    passed: true,
                    message: 'No common weak secrets detected',
                    timestamp: new Date().toISOString(),
                };
                client.recordResult(result);
            }
        });
    });

    // ============================================
    // JWK/JWKS Attacks
    // ============================================
    describe('JWK Injection', () => {
        it('ควรปฏิเสธ token ที่มี embedded JWK ใน header', async () => {
            // Create token with embedded JWK in header
            const header = {
                alg: 'RS256',
                typ: 'JWT',
                jwk: {
                    kty: 'RSA',
                    n: 'attacker_controlled_key',
                    e: 'AQAB',
                }
            };
            const payload = { id: 1, role: 'superadmin' };

            const token = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}.fakesignature`;

            const response = await request(targets.backend)
                .get(endpoints.users.list)
                .set('Authorization', `Bearer ${token}`);

            const rejected = response.status === 401 || response.status === 403;

            const result: SecurityTestResult = {
                testName: 'JWT JWK Header Injection',
                category: 'JWT Security',
                severity: rejected ? severity.INFO : severity.CRITICAL,
                passed: rejected,
                message: rejected
                    ? 'Token with embedded JWK correctly rejected'
                    : 'Token with embedded JWK may be ACCEPTED - Check JWK validation',
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
        console.log('JWT Security Test Summary');
        console.log('========================================');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log('By Severity:', summary.bySeverity);
        console.log('========================================\n');
    });
});
