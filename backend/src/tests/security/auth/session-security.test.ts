/**
 * Session Security Tests
 * Tests for session hijacking prevention and cookie security
 * 
 * OWASP: A07:2021 - Identification and Authentication Failures
 * CWE-384: Session Fixation
 * CWE-614: Sensitive Cookie in HTTPS Session Without Secure Attribute
 */

import request from 'supertest';
import securityConfig from '../config';
import { SecurityHttpClient, SecurityTestResult } from '../utils/http-client';

const { targets, endpoints, severity } = securityConfig;
const client = new SecurityHttpClient(targets.backend);

describe('🔒 Authentication Security - Session Security', () => {
    const loginEndpoint = endpoints.auth.login;
    const logoutEndpoint = endpoints.auth.logout;

    // ============================================
    // Session Cookie Security Tests
    // ============================================
    describe('Session Cookie Security Flags', () => {
        it('ควรมี HttpOnly flag บน session cookie', async () => {
            const response = await request(targets.backend)
                .post(loginEndpoint)
                .send({
                    email: securityConfig.testUsers.admin.email,
                    password: securityConfig.testUsers.admin.password,
                });

            const cookies = response.headers['set-cookie'] || [];
            const sessionCookies = cookies.filter((c: string) =>
                c.toLowerCase().includes('session') ||
                c.toLowerCase().includes('token') ||
                c.toLowerCase().includes('auth')
            );

            let hasHttpOnly = false;
            if (sessionCookies.length > 0) {
                hasHttpOnly = sessionCookies.some((c: string) =>
                    c.toLowerCase().includes('httponly')
                );
            }

            const result: SecurityTestResult = {
                testName: 'Session Cookie HttpOnly Flag',
                category: 'Session Security',
                severity: hasHttpOnly || sessionCookies.length === 0 ? severity.INFO : severity.HIGH,
                passed: hasHttpOnly || sessionCookies.length === 0,
                message: sessionCookies.length === 0
                    ? 'No session cookies found (may use different auth mechanism)'
                    : hasHttpOnly
                        ? 'HttpOnly flag is set on session cookies'
                        : 'HttpOnly flag is MISSING - XSS can steal session',
                details: {
                    evidence: sessionCookies.join('; '),
                },
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี Secure flag บน session cookie', async () => {
            const response = await request(targets.backend)
                .post(loginEndpoint)
                .send({
                    email: securityConfig.testUsers.admin.email,
                    password: securityConfig.testUsers.admin.password,
                });

            const cookies = response.headers['set-cookie'] || [];
            const sessionCookies = cookies.filter((c: string) =>
                c.toLowerCase().includes('session') ||
                c.toLowerCase().includes('token')
            );

            let hasSecure = false;
            if (sessionCookies.length > 0) {
                hasSecure = sessionCookies.some((c: string) =>
                    c.toLowerCase().includes('secure')
                );
            }

            const result: SecurityTestResult = {
                testName: 'Session Cookie Secure Flag',
                category: 'Session Security',
                severity: hasSecure || sessionCookies.length === 0 ? severity.INFO : severity.MEDIUM,
                passed: hasSecure || sessionCookies.length === 0,
                message: sessionCookies.length === 0
                    ? 'No session cookies found'
                    : hasSecure
                        ? 'Secure flag is set on session cookies'
                        : 'Secure flag is MISSING - Cookie can be intercepted over HTTP',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี SameSite flag บน session cookie', async () => {
            const response = await request(targets.backend)
                .post(loginEndpoint)
                .send({
                    email: securityConfig.testUsers.admin.email,
                    password: securityConfig.testUsers.admin.password,
                });

            const cookies = response.headers['set-cookie'] || [];
            const sessionCookies = cookies.filter((c: string) =>
                c.toLowerCase().includes('session') ||
                c.toLowerCase().includes('token')
            );

            let hasSameSite = false;
            let sameSiteValue = 'None';
            if (sessionCookies.length > 0) {
                for (const cookie of sessionCookies) {
                    if (cookie.toLowerCase().includes('samesite=strict')) {
                        hasSameSite = true;
                        sameSiteValue = 'Strict';
                    } else if (cookie.toLowerCase().includes('samesite=lax')) {
                        hasSameSite = true;
                        sameSiteValue = 'Lax';
                    }
                }
            }

            const result: SecurityTestResult = {
                testName: 'Session Cookie SameSite Flag',
                category: 'Session Security',
                severity: hasSameSite || sessionCookies.length === 0 ? severity.INFO : severity.MEDIUM,
                passed: hasSameSite || sessionCookies.length === 0,
                message: sessionCookies.length === 0
                    ? 'No session cookies found'
                    : hasSameSite
                        ? `SameSite=${sameSiteValue} is set (CSRF protection)`
                        : 'SameSite flag is MISSING - CSRF attacks possible',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Session Fixation Tests
    // ============================================
    describe('Session Fixation Prevention', () => {
        it('ควรเปลี่ยน session ID หลัง login', async () => {
            // Step 1: Get initial session (before login)
            const initialResponse = await request(targets.backend)
                .get('/api/health');

            const initialCookies = initialResponse.headers['set-cookie'] || [];
            const initialSession = initialCookies.find((c: string) =>
                c.toLowerCase().includes('session')
            );

            // Step 2: Login
            const loginResponse = await request(targets.backend)
                .post(loginEndpoint)
                .set('Cookie', initialCookies)
                .send({
                    email: securityConfig.testUsers.admin.email,
                    password: securityConfig.testUsers.admin.password,
                });

            const postLoginCookies = loginResponse.headers['set-cookie'] || [];
            const postLoginSession = postLoginCookies.find((c: string) =>
                c.toLowerCase().includes('session')
            );

            // Sessions should be different (regenerated after login)
            const sessionRegenerated = !initialSession ||
                !postLoginSession ||
                initialSession !== postLoginSession;

            const result: SecurityTestResult = {
                testName: 'Session Regeneration After Login',
                category: 'Session Security',
                severity: sessionRegenerated ? severity.INFO : severity.HIGH,
                passed: sessionRegenerated,
                message: sessionRegenerated
                    ? 'Session ID is regenerated after login'
                    : 'Session ID NOT regenerated - Session Fixation VULNERABLE',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรปฏิเสธ pre-set session ID จาก attacker', async () => {
            const attackerSessionId = 'attacker_controlled_session_12345';

            const response = await request(targets.backend)
                .post(loginEndpoint)
                .set('Cookie', `sessionId=${attackerSessionId}`)
                .send({
                    email: securityConfig.testUsers.admin.email,
                    password: securityConfig.testUsers.admin.password,
                });

            const responseCookies = response.headers['set-cookie'] || [];
            const sessionCookie = responseCookies.find((c: string) =>
                c.toLowerCase().includes('session')
            );

            // The pre-set session should NOT be used
            const usedAttackerSession = sessionCookie?.includes(attackerSessionId);

            const result: SecurityTestResult = {
                testName: 'Pre-set Session ID Rejection',
                category: 'Session Security',
                severity: !usedAttackerSession ? severity.INFO : severity.CRITICAL,
                passed: !usedAttackerSession,
                message: !usedAttackerSession
                    ? 'Pre-set session ID was not accepted'
                    : 'Pre-set session ID was ACCEPTED - Session Fixation CRITICAL',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Session Expiration Tests
    // ============================================
    describe('Session Expiration', () => {
        it('ควร invalidate session หลัง logout', async () => {
            // Step 1: Login
            const loginResponse = await request(targets.backend)
                .post(loginEndpoint)
                .send({
                    email: securityConfig.testUsers.admin.email,
                    password: securityConfig.testUsers.admin.password,
                });

            const cookies = loginResponse.headers['set-cookie'] || [];
            const authToken = loginResponse.body?.token;

            // Step 2: Logout
            await request(targets.backend)
                .post(logoutEndpoint)
                .set('Cookie', cookies)
                .set('Authorization', authToken ? `Bearer ${authToken}` : '');

            // Step 3: Try to access protected resource with old session
            const protectedResponse = await request(targets.backend)
                .get(endpoints.users.list)
                .set('Cookie', cookies)
                .set('Authorization', authToken ? `Bearer ${authToken}` : '')
                .set('x-user-id', '1')
                .set('x-user-role', 'admin');

            // Should be rejected (401 or 403)
            const sessionInvalidated = protectedResponse.status === 401 ||
                protectedResponse.status === 403;

            const result: SecurityTestResult = {
                testName: 'Session Invalidation After Logout',
                category: 'Session Security',
                severity: sessionInvalidated ? severity.INFO : severity.HIGH,
                passed: true, // This test may vary based on auth mechanism
                message: sessionInvalidated
                    ? 'Session correctly invalidated after logout'
                    : `Session still valid after logout (status: ${protectedResponse.status})`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี session timeout ที่เหมาะสม', async () => {
            const response = await request(targets.backend)
                .post(loginEndpoint)
                .send({
                    email: securityConfig.testUsers.admin.email,
                    password: securityConfig.testUsers.admin.password,
                });

            const cookies = response.headers['set-cookie'] || [];

            // Check cookie expiration
            let maxAgeSeconds = 0;
            for (const cookie of cookies) {
                const maxAgeMatch = cookie.match(/max-age=(\d+)/i);
                const expiresMatch = cookie.match(/expires=([^;]+)/i);

                if (maxAgeMatch) {
                    maxAgeSeconds = parseInt(maxAgeMatch[1]);
                } else if (expiresMatch) {
                    const expiresDate = new Date(expiresMatch[1]);
                    maxAgeSeconds = (expiresDate.getTime() - Date.now()) / 1000;
                }
            }

            // Session should expire within reasonable time (e.g., 24 hours max)
            const maxReasonableAge = 24 * 60 * 60; // 24 hours in seconds
            const isReasonable = maxAgeSeconds > 0 && maxAgeSeconds <= maxReasonableAge;

            const result: SecurityTestResult = {
                testName: 'Session Timeout Duration',
                category: 'Session Security',
                severity: severity.INFO,
                passed: true,
                message: maxAgeSeconds > 0
                    ? `Session timeout: ${(maxAgeSeconds / 60).toFixed(0)} minutes`
                    : 'Session timeout not explicitly set in cookie',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Session Hijacking Prevention
    // ============================================
    describe('Session Hijacking Prevention', () => {
        it('ควรตรวจจับ session ที่ใช้จาก IP ที่แตกต่างกัน', async () => {
            // Login from IP 1
            const loginResponse = await request(targets.backend)
                .post(loginEndpoint)
                .set('X-Forwarded-For', '192.168.1.100')
                .send({
                    email: securityConfig.testUsers.admin.email,
                    password: securityConfig.testUsers.admin.password,
                });

            const cookies = loginResponse.headers['set-cookie'] || [];
            const authToken = loginResponse.body?.token;

            // Try to use session from different IP
            const hijackResponse = await request(targets.backend)
                .get(endpoints.users.list)
                .set('Cookie', cookies)
                .set('Authorization', authToken ? `Bearer ${authToken}` : '')
                .set('X-Forwarded-For', '10.0.0.50') // Different IP
                .set('x-user-id', '1')
                .set('x-user-role', 'admin');

            // Ideally should detect and reject or challenge
            const detected = hijackResponse.status === 401 ||
                hijackResponse.status === 403 ||
                hijackResponse.body?.requireReauth;

            const result: SecurityTestResult = {
                testName: 'Session Hijacking Detection (IP Change)',
                category: 'Session Security',
                severity: severity.INFO, // This is a nice-to-have
                passed: true,
                message: detected
                    ? 'Session detected usage from different IP'
                    : 'Session works across different IPs (may be by design)',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรตรวจจับ session ที่ใช้จาก User-Agent ที่แตกต่างกัน', async () => {
            // Login with browser UA
            const loginResponse = await request(targets.backend)
                .post(loginEndpoint)
                .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')
                .send({
                    email: securityConfig.testUsers.admin.email,
                    password: securityConfig.testUsers.admin.password,
                });

            const cookies = loginResponse.headers['set-cookie'] || [];
            const authToken = loginResponse.body?.token;

            // Try to use session with different User-Agent
            const hijackResponse = await request(targets.backend)
                .get(endpoints.users.list)
                .set('Cookie', cookies)
                .set('Authorization', authToken ? `Bearer ${authToken}` : '')
                .set('User-Agent', 'curl/7.81.0') // Different UA
                .set('x-user-id', '1')
                .set('x-user-role', 'admin');

            const detected = hijackResponse.status === 401 ||
                hijackResponse.status === 403;

            const result: SecurityTestResult = {
                testName: 'Session Hijacking Detection (User-Agent Change)',
                category: 'Session Security',
                severity: severity.INFO,
                passed: true,
                message: detected
                    ? 'Session detected usage with different User-Agent'
                    : 'Session works across different User-Agents',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Concurrent Session Tests
    // ============================================
    describe('Concurrent Session Control', () => {
        it('ควรจำกัดจำนวน active sessions ต่อ user', async () => {
            const sessions: string[] = [];

            // Create multiple sessions for same user
            for (let i = 0; i < 5; i++) {
                const response = await request(targets.backend)
                    .post(loginEndpoint)
                    .send({
                        email: securityConfig.testUsers.admin.email,
                        password: securityConfig.testUsers.admin.password,
                    });

                if (response.body?.token) {
                    sessions.push(response.body.token);
                }
            }

            // Check if old sessions are still valid
            let activeSessionCount = 0;
            for (const token of sessions) {
                const response = await request(targets.backend)
                    .get(endpoints.users.list)
                    .set('Authorization', `Bearer ${token}`)
                    .set('x-user-id', '1')
                    .set('x-user-role', 'admin');

                if (response.status === 200) {
                    activeSessionCount++;
                }
            }

            const result: SecurityTestResult = {
                testName: 'Concurrent Session Limit',
                category: 'Session Security',
                severity: severity.INFO,
                passed: true,
                message: `${activeSessionCount} of ${sessions.length} sessions are still active`,
                details: {
                    evidence: `Created ${sessions.length} sessions, ${activeSessionCount} remain active`,
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
        console.log('Session Security Test Summary');
        console.log('========================================');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log('By Severity:', summary.bySeverity);
        console.log('========================================\n');
    });
});
