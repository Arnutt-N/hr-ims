/**
 * Privilege Escalation Tests
 * Tests for vertical privilege escalation and role bypass vulnerabilities
 * 
 * OWASP: A01:2021 - Broken Access Control
 * CWE-269: Improper Privilege Management
 * CWE-285: Improper Authorization
 */

import request from 'supertest';
import securityConfig from '../config';
import { SecurityHttpClient, SecurityTestResult } from '../utils/http-client';

const { targets, endpoints, severity, testUsers } = securityConfig;
const client = new SecurityHttpClient(targets.backend);

describe('🔒 Authorization Security - Privilege Escalation', () => {
    // ============================================
    // Vertical Privilege Escalation Tests
    // ============================================
    describe('Vertical Privilege Escalation', () => {
        it('ควรไม่ให้ regular user เข้าถึง admin endpoints', async () => {
            const regularUser = testUsers.user;
            const adminEndpoints = [
                { method: 'GET', url: '/api/users' },
                { method: 'GET', url: '/api/audit-logs' },
                { method: 'POST', url: '/api/inventory' },
                { method: 'DELETE', url: '/api/users/999' },
            ];

            const results: { endpoint: string; status: number; accessible: boolean }[] = [];

            for (const ep of adminEndpoints) {
                let response;
                if (ep.method === 'GET') {
                    response = await request(targets.backend)
                        .get(ep.url)
                        .set('x-user-id', regularUser.id.toString())
                        .set('x-user-role', regularUser.role);
                } else if (ep.method === 'POST') {
                    response = await request(targets.backend)
                        .post(ep.url)
                        .set('x-user-id', regularUser.id.toString())
                        .set('x-user-role', regularUser.role)
                        .send({ name: 'Test' });
                } else if (ep.method === 'DELETE') {
                    response = await request(targets.backend)
                        .delete(ep.url)
                        .set('x-user-id', regularUser.id.toString())
                        .set('x-user-role', regularUser.role);
                }

                results.push({
                    endpoint: `${ep.method} ${ep.url}`,
                    status: response?.status || 0,
                    accessible: response?.status === 200,
                });
            }

            const accessibleEndpoints = results.filter(r => r.accessible);

            const result: SecurityTestResult = {
                testName: 'Admin Endpoint Access Control',
                category: 'Privilege Escalation',
                severity: accessibleEndpoints.length === 0 ? severity.INFO : severity.CRITICAL,
                passed: accessibleEndpoints.length === 0,
                message: accessibleEndpoints.length === 0
                    ? 'Regular user correctly denied access to admin endpoints'
                    : `Regular user accessed ${accessibleEndpoints.length} admin endpoints`,
                details: {
                    evidence: accessibleEndpoints.map(e => e.endpoint).join(', '),
                },
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควลไม่ให้ regular user เปลี่ยน role ตัวเอง', async () => {
            const regularUser = testUsers.user;

            const response = await request(targets.backend)
                .put(`/api/users/${regularUser.id}`)
                .set('x-user-id', regularUser.id.toString())
                .set('x-user-role', regularUser.role)
                .send({
                    role: 'superadmin', // Trying to escalate
                });

            // Check if role was changed
            let roleChanged = false;
            if (response.status === 200) {
                roleChanged = response.body?.role === 'superadmin';
            }

            const protected_ = response.status === 403 || !roleChanged;

            const result: SecurityTestResult = {
                testName: 'Self Role Escalation Prevention',
                category: 'Privilege Escalation',
                severity: protected_ ? severity.INFO : severity.CRITICAL,
                passed: protected_,
                message: protected_
                    ? 'User cannot change their own role'
                    : 'User CAN change their own role - CRITICAL',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควลไม่ให้ admin เปลี่ยน role เป็น superadmin', async () => {
            const admin = testUsers.admin;

            const response = await request(targets.backend)
                .put(`/api/users/${admin.id}`)
                .set('x-user-id', admin.id.toString())
                .set('x-user-role', admin.role)
                .send({
                    role: 'superadmin',
                });

            let roleChanged = false;
            if (response.status === 200) {
                roleChanged = response.body?.role === 'superadmin';
            }

            const protected_ = response.status === 403 || !roleChanged;

            const result: SecurityTestResult = {
                testName: 'Admin to Superadmin Escalation Prevention',
                category: 'Privilege Escalation',
                severity: protected_ ? severity.INFO : severity.CRITICAL,
                passed: protected_,
                message: protected_
                    ? 'Admin cannot escalate to superadmin'
                    : 'Admin CAN escalate to superadmin - CRITICAL',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Role Header Manipulation Tests
    // ============================================
    describe('Role Header Manipulation', () => {
        it('ควรปฏิเสธ role header ที่ถูก manipulate', async () => {
            const regularUser = testUsers.user;

            // Try to access admin endpoint with manipulated role header
            const response = await request(targets.backend)
                .get('/api/users')
                .set('x-user-id', regularUser.id.toString())
                .set('x-user-role', 'superadmin'); // Manipulated role!

            // This should be rejected because the role doesn't match the user's actual role
            const result: SecurityTestResult = {
                testName: 'Role Header Manipulation Detection',
                category: 'Privilege Escalation',
                severity: response.status === 200 ? severity.CRITICAL : severity.INFO,
                passed: response.status !== 200,
                message: response.status !== 200
                    ? 'Server validates role against user record'
                    : 'Server TRUSTS client-provided role header - CRITICAL (should verify against DB)',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);

            // This is a design consideration - the backend should verify roles against the database
        });

        it('ควรตรวจสอบ x-user-id กับ role ใน database', async () => {
            // Use mismatched user-id and role
            const response = await request(targets.backend)
                .get('/api/users')
                .set('x-user-id', '999') // Non-existent user
                .set('x-user-role', 'superadmin');

            const protected_ = response.status === 401 || response.status === 403;

            const result: SecurityTestResult = {
                testName: 'User ID Validation',
                category: 'Privilege Escalation',
                severity: protected_ ? severity.INFO : severity.HIGH,
                passed: protected_,
                message: protected_
                    ? 'Non-existent user ID correctly rejected'
                    : 'Non-existent user ID accepted - Verify user exists',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรปฏิเสธ invalid role values', async () => {
            const invalidRoles = [
                'SUPERADMIN', // Case variation
                'root',
                'administrator',
                'admin; drop table users;--',
                '../../../etc/passwd',
                '<script>alert(1)</script>',
                '{ "$gt": "" }',
            ];

            for (const role of invalidRoles) {
                const response = await request(targets.backend)
                    .get('/api/users')
                    .set('x-user-id', '1')
                    .set('x-user-role', role);

                if (response.status === 200) {
                    const result: SecurityTestResult = {
                        testName: `Invalid Role Acceptance: ${role.substring(0, 20)}`,
                        category: 'Privilege Escalation',
                        severity: severity.HIGH,
                        passed: false,
                        message: `Invalid role "${role}" was accepted`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });
    });

    // ============================================
    // Function Level Access Control Tests
    // ============================================
    describe('Function Level Access Control', () => {
        it('ควลให้เฉพาะ superadmin ลบ users ได้', async () => {
            const roles = [
                { role: 'user', expected: 403 },
                { role: 'hr', expected: 403 },
                { role: 'admin', expected: 403 },
                { role: 'superadmin', expected: 200 }, // Only superadmin should succeed
            ];

            for (const { role, expected } of roles) {
                const response = await request(targets.backend)
                    .delete('/api/users/9999')
                    .set('x-user-id', '1')
                    .set('x-user-role', role);

                const isCorrect = response.status === expected ||
                    (expected === 403 && response.status === 401) ||
                    (expected === 200 && response.status === 404); // 404 is also OK for non-existent user

                if (!isCorrect && expected === 403 && response.status === 200) {
                    const result: SecurityTestResult = {
                        testName: `Delete User Role Check: ${role}`,
                        category: 'Privilege Escalation',
                        severity: severity.CRITICAL,
                        passed: false,
                        message: `Role "${role}" CAN delete users - Should be superadmin only`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });

        it('ควลให้เฉพาะ admin+ สร้าง inventory items ได้', async () => {
            const regularUser = testUsers.user;

            const response = await request(targets.backend)
                .post('/api/inventory')
                .set('x-user-id', regularUser.id.toString())
                .set('x-user-role', regularUser.role)
                .send({
                    name: 'Test Item',
                    category: 'Test',
                    type: 'durable',
                });

            const protected_ = response.status === 403 || response.status === 401;

            const result: SecurityTestResult = {
                testName: 'Inventory Create Role Check',
                category: 'Privilege Escalation',
                severity: protected_ ? severity.INFO : severity.HIGH,
                passed: protected_,
                message: protected_
                    ? 'Regular user cannot create inventory items'
                    : 'Regular user CAN create inventory items',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควลให้เฉพาะ admin+ approve requests ได้', async () => {
            const regularUser = testUsers.user;

            const response = await request(targets.backend)
                .post('/api/requests/1/approve')
                .set('x-user-id', regularUser.id.toString())
                .set('x-user-role', regularUser.role)
                .send({ approved: true });

            const protected_ = response.status === 403 || response.status === 401;

            const result: SecurityTestResult = {
                testName: 'Request Approve Role Check',
                category: 'Privilege Escalation',
                severity: protected_ ? severity.INFO : severity.CRITICAL,
                passed: protected_,
                message: protected_
                    ? 'Regular user cannot approve requests'
                    : 'Regular user CAN approve requests - CRITICAL',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Privilege Escalation via Mass Assignment
    // ============================================
    describe('Privilege Escalation via Mass Assignment', () => {
        it('ควรกรอง fields ที่ไม่ควรตั้งค่าได้ (role, isAdmin, etc.)', async () => {
            const regularUser = testUsers.user;

            const response = await request(targets.backend)
                .put(`/api/users/${regularUser.id}`)
                .set('x-user-id', regularUser.id.toString())
                .set('x-user-role', regularUser.role)
                .send({
                    name: 'Updated Name', // Allowed
                    role: 'superadmin',   // Should be filtered
                    isAdmin: true,        // Should be filtered
                    permissions: ['all'], // Should be filtered
                });

            let escalated = false;
            if (response.status === 200) {
                escalated = response.body?.role === 'superadmin' ||
                    response.body?.isAdmin === true;
            }

            const protected_ = !escalated;

            const result: SecurityTestResult = {
                testName: 'Mass Assignment Privilege Escalation Check',
                category: 'Privilege Escalation',
                severity: protected_ ? severity.INFO : severity.CRITICAL,
                passed: protected_,
                message: protected_
                    ? 'Sensitive fields correctly filtered from mass assignment'
                    : 'Privilege escalation via mass assignment possible - CRITICAL',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรปฏิเสธ nested privilege escalation', async () => {
            const regularUser = testUsers.user;

            const response = await request(targets.backend)
                .put(`/api/users/${regularUser.id}`)
                .set('x-user-id', regularUser.id.toString())
                .set('x-user-role', regularUser.role)
                .send({
                    profile: {
                        role: 'superadmin', // Trying nested escalation
                    },
                });

            let escalated = false;
            if (response.status === 200) {
                escalated = response.body?.profile?.role === 'superadmin';
            }

            const protected_ = !escalated;

            const result: SecurityTestResult = {
                testName: 'Nested Object Privilege Escalation',
                category: 'Privilege Escalation',
                severity: protected_ ? severity.INFO : severity.HIGH,
                passed: protected_,
                message: protected_
                    ? 'Nested privilege escalation attempt rejected'
                    : 'Nested object escalation possible',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Path-based Privilege Escalation
    // ============================================
    describe('Path-based Privilege Escalation', () => {
        it('ควรตรวจสอบ path traversal ใน URL', async () => {
            const regularUser = testUsers.user;

            const pathTraversalAttempts = [
                '/api/users/../admin/settings',
                '/api/users/..%2fadmin%2fsettings',
                '/api/users/1/../../../admin',
                '/api/inventory/1/..;/admin',
            ];

            for (const path of pathTraversalAttempts) {
                const response = await request(targets.backend)
                    .get(path)
                    .set('x-user-id', regularUser.id.toString())
                    .set('x-user-role', regularUser.role);

                // Should be 400, 404 or properly rejected
                if (response.status === 200) {
                    const result: SecurityTestResult = {
                        testName: 'Path Traversal Privilege Escalation',
                        category: 'Privilege Escalation',
                        severity: severity.HIGH,
                        passed: false,
                        message: `Path traversal accepted: ${path}`,
                        timestamp: new Date().toISOString(),
                    };
                    client.recordResult(result);
                }
            }
        });

        it('ควรป้องกันการ access admin routes โดยตรง', async () => {
            const regularUser = testUsers.user;

            const adminRoutes = [
                '/api/admin/settings',
                '/api/admin/users',
                '/api/superadmin/delete-all',
                '/api/_internal/config',
                '/api/debug/info',
            ];

            for (const route of adminRoutes) {
                const response = await request(targets.backend)
                    .get(route)
                    .set('x-user-id', regularUser.id.toString())
                    .set('x-user-role', regularUser.role);

                // Should be 404 or 403, not 200
                if (response.status === 200) {
                    const result: SecurityTestResult = {
                        testName: `Hidden Admin Route Access: ${route}`,
                        category: 'Privilege Escalation',
                        severity: severity.HIGH,
                        passed: false,
                        message: `Admin route accessible: ${route}`,
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
        console.log('Privilege Escalation Test Summary');
        console.log('========================================');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log('By Severity:', summary.bySeverity);
        console.log('========================================\n');
    });
});
