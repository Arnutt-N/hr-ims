/**
 * XSS (Cross-Site Scripting) Tests
 * Tests for XSS vulnerabilities in input and output handling
 * 
 * OWASP: A03:2021 - Injection
 * CWE-79: Cross-site Scripting (XSS)
 */

import request from 'supertest';
import securityConfig from '../config';
import { SecurityHttpClient, SecurityTestResult, responseAnalysis } from '../utils/http-client';
import { xssPayloads } from '../utils/payloads';

const { targets, endpoints, severity, testUsers } = securityConfig;
const client = new SecurityHttpClient(targets.backend);

describe('🔒 Injection Security - Cross-Site Scripting (XSS)', () => {
    const adminHeaders = {
        'x-user-id': testUsers.admin.id.toString(),
        'x-user-role': testUsers.admin.role,
    };

    // ============================================
    // Reflected XSS Tests
    // ============================================
    describe('Reflected XSS', () => {
        it('ควรป้องกัน reflected XSS ใน search parameters', async () => {
            const payloads = xssPayloads.basic;
            let vulnerablePayloads: string[] = [];

            for (const payload of payloads) {
                const response = await request(targets.backend)
                    .get(`/api/inventory?search=${encodeURIComponent(payload)}`)
                    .set(adminHeaders);

                // Check if XSS payload is reflected in response
                if (responseAnalysis.hasReflectedXss(response, payload)) {
                    vulnerablePayloads.push(payload);
                }
            }

            const isProtected = vulnerablePayloads.length === 0;

            const result: SecurityTestResult = {
                testName: 'Search Parameter Reflected XSS',
                category: 'XSS',
                severity: isProtected ? severity.INFO : severity.HIGH,
                passed: isProtected,
                message: isProtected
                    ? 'Search parameter does not reflect XSS payloads'
                    : `Reflected XSS detected: ${vulnerablePayloads.length} payloads reflected`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรป้องกัน reflected XSS ใน error messages', async () => {
            const payload = '<script>alert("XSS")</script>';

            const response = await request(targets.backend)
                .get(`/api/inventory/${encodeURIComponent(payload)}`)
                .set(adminHeaders);

            // Check if payload appears in error message
            const reflected = responseAnalysis.hasReflectedXss(response, payload);

            const result: SecurityTestResult = {
                testName: 'Error Message Reflected XSS',
                category: 'XSS',
                severity: reflected ? severity.HIGH : severity.INFO,
                passed: !reflected,
                message: reflected
                    ? 'XSS payload reflected in error message'
                    : 'Error messages do not reflect XSS payloads',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Stored XSS Tests
    // ============================================
    describe('Stored XSS', () => {
        it('ควรป้องกัน stored XSS ใน inventory names', async () => {
            const payload = '<img src=x onerror=alert("XSS")>';
            let storedWithPayload = false;
            let itemId: number | null = null;

            // Store the payload
            const createResponse = await request(targets.backend)
                .post('/api/inventory')
                .set(adminHeaders)
                .send({
                    name: payload,
                    category: 'Test',
                    type: 'durable',
                });

            if (createResponse.status === 201 || createResponse.status === 200) {
                itemId = createResponse.body?.id;

                // Retrieve the stored data
                const retrieveResponse = await request(targets.backend)
                    .get(`/api/inventory/${itemId}`)
                    .set(adminHeaders);

                // Check if payload is stored and returned as-is (without encoding)
                if (retrieveResponse.body?.name === payload) {
                    storedWithPayload = true;
                }
            }

            // Cleanup
            if (itemId) {
                await request(targets.backend)
                    .delete(`/api/inventory/${itemId}`)
                    .set('x-user-id', testUsers.superadmin.id.toString())
                    .set('x-user-role', testUsers.superadmin.role);
            }

            const result: SecurityTestResult = {
                testName: 'Inventory Name Stored XSS',
                category: 'XSS',
                severity: storedWithPayload ? severity.HIGH : severity.INFO,
                passed: !storedWithPayload,
                message: storedWithPayload
                    ? 'XSS payload stored and returned unencoded - Frontend must encode!'
                    : 'XSS payload was sanitized or rejected',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรป้องกัน stored XSS ใน user profile fields', async () => {
            const payloads = [
                '<script>alert(1)</script>',
                '"><script>alert(1)</script>',
                "javascript:alert('XSS')",
            ];

            for (const payload of payloads) {
                const response = await request(targets.backend)
                    .put(`/api/users/${testUsers.user.id}`)
                    .set('x-user-id', testUsers.user.id.toString())
                    .set('x-user-role', testUsers.user.role)
                    .send({
                        name: payload,
                    });

                if (response.status === 200 && response.body?.name === payload) {
                    const result: SecurityTestResult = {
                        testName: 'User Profile Stored XSS',
                        category: 'XSS',
                        severity: severity.HIGH,
                        passed: false,
                        message: `XSS payload stored in user name: ${payload.substring(0, 30)}...`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });

        it('ควรป้องกัน stored XSS ใน request comments/notes', async () => {
            const payload = '<svg onload=alert(1)>';

            const response = await request(targets.backend)
                .post('/api/requests')
                .set(adminHeaders)
                .send({
                    items: [{ id: 1, quantity: 1 }],
                    notes: payload,
                    reason: 'Test request with XSS',
                });

            let storedPayload = false;
            if (response.status === 201 || response.status === 200) {
                storedPayload = response.body?.notes === payload;
            }

            const result: SecurityTestResult = {
                testName: 'Request Notes Stored XSS',
                category: 'XSS',
                severity: storedPayload ? severity.HIGH : severity.INFO,
                passed: !storedPayload,
                message: storedPayload
                    ? 'XSS payload stored in request notes'
                    : 'Request notes field is protected',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // XSS Filter Bypass Tests
    // ============================================
    describe('XSS Filter Bypass', () => {
        it('ควรป้องกัน XSS ที่ใช้ encoding bypass', async () => {
            const payloads = xssPayloads.encodingBypass;
            let bypassedPayloads: string[] = [];

            for (const payload of payloads) {
                const response = await request(targets.backend)
                    .post('/api/inventory')
                    .set(adminHeaders)
                    .send({
                        name: payload,
                        category: 'Test',
                        type: 'durable',
                    });

                // Check if payload was stored without sanitization
                if (response.status === 201 && response.body?.name === payload) {
                    if (payload.includes('script') || payload.includes('onerror')) {
                        bypassedPayloads.push(payload);
                    }
                }
            }

            const isProtected = bypassedPayloads.length === 0;

            const result: SecurityTestResult = {
                testName: 'XSS Encoding Bypass Prevention',
                category: 'XSS',
                severity: isProtected ? severity.INFO : severity.HIGH,
                passed: isProtected,
                message: isProtected
                    ? 'Encoding bypass attempts blocked'
                    : `${bypassedPayloads.length} encoding bypass payloads stored`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรป้องกัน XSS ที่ใช้ event handlers', async () => {
            const payloads = xssPayloads.eventHandlers;
            let storedPayloads: string[] = [];

            for (const payload of payloads) {
                const response = await request(targets.backend)
                    .post('/api/inventory')
                    .set(adminHeaders)
                    .send({
                        name: `Test ${Date.now()}`,
                        description: payload,
                        category: 'Test',
                        type: 'durable',
                    });

                if (response.status === 201 && response.body?.description === payload) {
                    storedPayloads.push(payload);
                }
            }

            const result: SecurityTestResult = {
                testName: 'XSS Event Handler Bypass',
                category: 'XSS',
                severity: storedPayloads.length === 0 ? severity.INFO : severity.HIGH,
                passed: storedPayloads.length === 0,
                message: storedPayloads.length === 0
                    ? 'Event handler XSS payloads blocked'
                    : `${storedPayloads.length} event handler payloads stored`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรป้องกัน XSS ที่ใช้ case variations', async () => {
            const payloads = xssPayloads.filterBypass;

            for (const payload of payloads) {
                const response = await request(targets.backend)
                    .get(`/api/inventory?search=${encodeURIComponent(payload)}`)
                    .set(adminHeaders);

                if (responseAnalysis.hasReflectedXss(response, payload)) {
                    const result: SecurityTestResult = {
                        testName: 'XSS Case Variation Bypass',
                        category: 'XSS',
                        severity: severity.HIGH,
                        passed: false,
                        message: `Case variation bypass: ${payload.substring(0, 30)}`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });
    });

    // ============================================
    // Content-Type Header Tests
    // ============================================
    describe('Content-Type Security', () => {
        it('ควรตั้งค่า Content-Type header อย่างถูกต้อง', async () => {
            const response = await request(targets.backend)
                .get('/api/inventory')
                .set(adminHeaders);

            const contentType = response.headers['content-type'];
            const isJson = contentType?.includes('application/json');

            const result: SecurityTestResult = {
                testName: 'Correct Content-Type Header',
                category: 'XSS',
                severity: isJson ? severity.INFO : severity.MEDIUM,
                passed: isJson || false,
                message: isJson
                    ? 'Content-Type is application/json (safe from XSS)'
                    : `Content-Type is ${contentType} (check for XSS risks)`,
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรมี X-Content-Type-Options header', async () => {
            const response = await request(targets.backend)
                .get('/api/inventory')
                .set(adminHeaders);

            const hasHeader = response.headers['x-content-type-options'] === 'nosniff';

            const result: SecurityTestResult = {
                testName: 'X-Content-Type-Options Header',
                category: 'XSS',
                severity: hasHeader ? severity.INFO : severity.MEDIUM,
                passed: hasHeader,
                message: hasHeader
                    ? 'X-Content-Type-Options: nosniff is set'
                    : 'X-Content-Type-Options header is missing',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // JSON XSS Tests
    // ============================================
    describe('JSON XSS', () => {
        it('ควรป้องกัน XSS ใน JSON responses', async () => {
            const payload = '</script><script>alert(1)</script>';

            // Store payload
            const createResponse = await request(targets.backend)
                .post('/api/inventory')
                .set(adminHeaders)
                .send({
                    name: payload,
                    category: 'Test',
                    type: 'durable',
                });

            if (createResponse.status === 201 || createResponse.status === 200) {
                const itemId = createResponse.body?.id;

                // Get the item and check raw response
                const response = await request(targets.backend)
                    .get(`/api/inventory/${itemId}`)
                    .set(adminHeaders);

                // In JSON, < and > should be escaped to prevent XSS when embedded in HTML
                const responseText = JSON.stringify(response.body);
                const hasUnescapedTags = responseText.includes('</script>') &&
                    !responseText.includes('\\u003c');

                const result: SecurityTestResult = {
                    testName: 'JSON Response XSS Prevention',
                    category: 'XSS',
                    severity: hasUnescapedTags ? severity.MEDIUM : severity.INFO,
                    passed: !hasUnescapedTags,
                    message: hasUnescapedTags
                        ? 'HTML tags not escaped in JSON (XSS risk if embedded in HTML)'
                        : 'JSON properly formatted',
                    timestamp: new Date().toISOString(),
                };
                client.recordResult(result);

                // Cleanup
                await request(targets.backend)
                    .delete(`/api/inventory/${itemId}`)
                    .set('x-user-id', testUsers.superadmin.id.toString())
                    .set('x-user-role', testUsers.superadmin.role);
            }
        });
    });

    // ============================================
    // Input Length Limits
    // ============================================
    describe('Input Length Limits', () => {
        it('ควรจำกัดความยาวของ input เพื่อป้องกัน large payloads', async () => {
            // Create a very long XSS payload
            const longPayload = '<script>' + 'alert(1);'.repeat(10000) + '</script>';

            const response = await request(targets.backend)
                .post('/api/inventory')
                .set(adminHeaders)
                .send({
                    name: longPayload,
                    category: 'Test',
                    type: 'durable',
                });

            // Should be rejected or truncated
            const handled = response.status === 400 ||
                response.status === 413 ||
                (response.body?.name?.length < longPayload.length);

            const result: SecurityTestResult = {
                testName: 'Input Length Limit',
                category: 'XSS',
                severity: handled ? severity.INFO : severity.LOW,
                passed: handled,
                message: handled
                    ? 'Large input properly handled (rejected or truncated)'
                    : 'Very large input accepted without limits',
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
        console.log('XSS Security Test Summary');
        console.log('========================================');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log('By Severity:', summary.bySeverity);
        console.log('========================================\n');
    });
});
