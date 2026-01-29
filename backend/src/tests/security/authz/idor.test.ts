/**
 * IDOR (Insecure Direct Object Reference) Tests
 * Tests for unauthorized access to resources via ID manipulation
 * 
 * OWASP: A01:2021 - Broken Access Control
 * CWE-639: Authorization Bypass Through User-Controlled Key
 */

import request from 'supertest';
import securityConfig from '../config';
import { SecurityHttpClient, SecurityTestResult } from '../utils/http-client';

const { targets, endpoints, severity, testUsers } = securityConfig;
const client = new SecurityHttpClient(targets.backend);

describe('🔒 Authorization Security - IDOR Vulnerabilities', () => {
    // ============================================
    // User Data Access Tests
    // ============================================
    describe('User Data IDOR', () => {
        it('ควรไม่ให้ user เข้าถึงข้อมูล user อื่น', async () => {
            // User ID 3 trying to access User ID 1's data
            const attacker = testUsers.user;
            const victimId = 1;

            const response = await request(targets.backend)
                .get(`/api/users/${victimId}`)
                .set('x-user-id', attacker.id.toString())
                .set('x-user-role', attacker.role);

            // Regular user should NOT be able to access other user's full data
            const hasAccessControl = response.status === 403 ||
                response.status === 401 ||
                (response.status === 200 && !response.body?.password && !response.body?.email);

            const result: SecurityTestResult = {
                testName: 'User Data IDOR Prevention',
                category: 'IDOR',
                severity: hasAccessControl ? severity.INFO : severity.HIGH,
                passed: hasAccessControl,
                message: hasAccessControl
                    ? 'User cannot access other users\' sensitive data'
                    : `User can access other user's data - IDOR VULNERABLE`,
                details: {
                    request: { method: 'GET', url: `/api/users/${victimId}` },
                    response: { status: response.status, body: response.body },
                },
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรไม่ให้ user แก้ไขข้อมูล user อื่น', async () => {
            const attacker = testUsers.user;
            const victimId = 1;

            const response = await request(targets.backend)
                .put(`/api/users/${victimId}`)
                .set('x-user-id', attacker.id.toString())
                .set('x-user-role', attacker.role)
                .send({
                    name: 'Hacked Name',
                    email: 'hacked@evil.com',
                });

            const protected_ = response.status === 403 || response.status === 401;

            const result: SecurityTestResult = {
                testName: 'User Update IDOR Prevention',
                category: 'IDOR',
                severity: protected_ ? severity.INFO : severity.CRITICAL,
                passed: protected_,
                message: protected_
                    ? 'User cannot modify other users\' data'
                    : 'User CAN modify other users\' data - CRITICAL IDOR',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรไม่ให้ user ลบ user อื่น', async () => {
            const attacker = testUsers.user;
            const victimId = 1;

            const response = await request(targets.backend)
                .delete(`/api/users/${victimId}`)
                .set('x-user-id', attacker.id.toString())
                .set('x-user-role', attacker.role);

            const protected_ = response.status === 403 || response.status === 401;

            const result: SecurityTestResult = {
                testName: 'User Delete IDOR Prevention',
                category: 'IDOR',
                severity: protected_ ? severity.INFO : severity.CRITICAL,
                passed: protected_,
                message: protected_
                    ? 'User cannot delete other users'
                    : 'User CAN delete other users - CRITICAL IDOR',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Inventory Data Access Tests
    // ============================================
    describe('Inventory Data IDOR', () => {
        it('ควรไม่ให้ user แก้ไข inventory item โดยไม่มีสิทธิ์', async () => {
            const attacker = testUsers.user;
            const itemId = 1;

            const response = await request(targets.backend)
                .put(`/api/inventory/${itemId}`)
                .set('x-user-id', attacker.id.toString())
                .set('x-user-role', attacker.role)
                .send({
                    name: 'Hacked Item',
                    quantity: 99999,
                });

            // Regular users typically shouldn't modify inventory directly
            const protected_ = response.status === 403 || response.status === 401;

            const result: SecurityTestResult = {
                testName: 'Inventory Update IDOR Prevention',
                category: 'IDOR',
                severity: protected_ ? severity.INFO : severity.HIGH,
                passed: protected_,
                message: protected_
                    ? 'Regular user cannot modify inventory items'
                    : 'Regular user CAN modify inventory - Check access control',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรตรวจสอบ ownership ก่อน delete inventory item', async () => {
            const attacker = testUsers.user;
            const itemId = 1;

            const response = await request(targets.backend)
                .delete(`/api/inventory/${itemId}`)
                .set('x-user-id', attacker.id.toString())
                .set('x-user-role', attacker.role);

            const protected_ = response.status === 403 || response.status === 401;

            const result: SecurityTestResult = {
                testName: 'Inventory Delete IDOR Prevention',
                category: 'IDOR',
                severity: protected_ ? severity.INFO : severity.HIGH,
                passed: protected_,
                message: protected_
                    ? 'User cannot delete inventory items without permission'
                    : 'User CAN delete any inventory item - IDOR VULNERABLE',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Request Data Access Tests
    // ============================================
    describe('Request Data IDOR', () => {
        it('ควรไม่ให้ user ดู requests ของ user อื่น', async () => {
            const attacker = testUsers.user;
            const victimUserId = 1;

            // Try to access requests of another user
            const response = await request(targets.backend)
                .get(`/api/requests?userId=${victimUserId}`)
                .set('x-user-id', attacker.id.toString())
                .set('x-user-role', attacker.role);

            // Should return empty or only attacker's requests, not victim's
            let hasOtherUserData = false;
            if (response.status === 200 && Array.isArray(response.body)) {
                hasOtherUserData = response.body.some((req: any) =>
                    req.userId === victimUserId || req.createdBy === victimUserId
                );
            }

            const protected_ = response.status === 403 || !hasOtherUserData;

            const result: SecurityTestResult = {
                testName: 'Request List IDOR Prevention',
                category: 'IDOR',
                severity: protected_ ? severity.INFO : severity.HIGH,
                passed: protected_,
                message: protected_
                    ? 'User cannot view other users\' requests'
                    : 'User CAN view other users\' requests - IDOR VULNERABLE',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรไม่ให้ user approve request โดยไม่มีสิทธิ์', async () => {
            const attacker = testUsers.user;
            const requestId = 1;

            const response = await request(targets.backend)
                .post(`/api/requests/${requestId}/approve`)
                .set('x-user-id', attacker.id.toString())
                .set('x-user-role', attacker.role)
                .send({ approved: true });

            const protected_ = response.status === 403 || response.status === 401;

            const result: SecurityTestResult = {
                testName: 'Request Approve IDOR Prevention',
                category: 'IDOR',
                severity: protected_ ? severity.INFO : severity.CRITICAL,
                passed: protected_,
                message: protected_
                    ? 'Regular user cannot approve requests'
                    : 'Regular user CAN approve requests - CRITICAL VULNERABILITY',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Warehouse/Department Data Tests
    // ============================================
    describe('Warehouse/Department IDOR', () => {
        it('ควรไม่ให้ user เข้าถึง warehouse ที่ไม่มีสิทธิ์', async () => {
            const attacker = testUsers.user;
            const warehouseId = 999; // Non-assigned warehouse

            const response = await request(targets.backend)
                .get(`/api/warehouses/${warehouseId}/stock-levels`)
                .set('x-user-id', attacker.id.toString())
                .set('x-user-role', attacker.role);

            // Should be restricted based on user's warehouse assignment
            const protected_ = response.status === 403 ||
                response.status === 401 ||
                response.status === 404;

            const result: SecurityTestResult = {
                testName: 'Warehouse Access IDOR Prevention',
                category: 'IDOR',
                severity: protected_ ? severity.INFO : severity.MEDIUM,
                passed: protected_,
                message: protected_
                    ? 'User cannot access unauthorized warehouses'
                    : 'User CAN access any warehouse - Check access control',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควลไม่ให้ user แก้ไข stock levels ใน warehouse ที่ไม่มีสิทธิ์', async () => {
            const attacker = testUsers.user;
            const stockLevelId = 1;

            const response = await request(targets.backend)
                .post(`/api/stock-levels/${stockLevelId}/adjust`)
                .set('x-user-id', attacker.id.toString())
                .set('x-user-role', attacker.role)
                .send({
                    adjustment: 1000,
                    reason: 'Hacking attempt',
                });

            const protected_ = response.status === 403 || response.status === 401;

            const result: SecurityTestResult = {
                testName: 'Stock Level Adjustment IDOR Prevention',
                category: 'IDOR',
                severity: protected_ ? severity.INFO : severity.HIGH,
                passed: protected_,
                message: protected_
                    ? 'User cannot adjust stock in unauthorized locations'
                    : 'User CAN adjust any stock level - IDOR VULNERABLE',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // ID Enumeration Tests
    // ============================================
    describe('ID Enumeration', () => {
        it('ควรป้องกัน enumeration attack ด้วย sequential IDs', async () => {
            const attacker = testUsers.user;
            const accessibleResources: number[] = [];

            // Try to enumerate user IDs
            for (let id = 1; id <= 20; id++) {
                const response = await request(targets.backend)
                    .get(`/api/users/${id}`)
                    .set('x-user-id', attacker.id.toString())
                    .set('x-user-role', attacker.role);

                if (response.status === 200) {
                    accessibleResources.push(id);
                }
            }

            // Attacker should only access their own data
            const onlyOwnData = accessibleResources.length <= 1 &&
                (accessibleResources.length === 0 || accessibleResources[0] === attacker.id);

            const result: SecurityTestResult = {
                testName: 'ID Enumeration Prevention',
                category: 'IDOR',
                severity: onlyOwnData ? severity.INFO : severity.HIGH,
                passed: onlyOwnData,
                message: onlyOwnData
                    ? 'User can only access their own resource'
                    : `User accessed ${accessibleResources.length} resources via enumeration`,
                details: {
                    evidence: `Accessible IDs: ${accessibleResources.join(', ')}`,
                },
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรใช้ UUID แทน sequential IDs (แนะนำ)', async () => {
            const response = await request(targets.backend)
                .get('/api/inventory')
                .set('x-user-id', testUsers.admin.id.toString())
                .set('x-user-role', testUsers.admin.role);

            let usesUUID = false;
            if (response.status === 200 && Array.isArray(response.body)) {
                const firstItem = response.body[0];
                if (firstItem?.id) {
                    // Check if ID looks like UUID
                    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    usesUUID = uuidPattern.test(firstItem.id.toString());
                }
            }

            const result: SecurityTestResult = {
                testName: 'UUID Usage Check',
                category: 'IDOR',
                severity: severity.INFO,
                passed: true, // Informational
                message: usesUUID
                    ? 'Application uses UUIDs (harder to enumerate)'
                    : 'Application uses sequential IDs (consider UUIDs for sensitive resources)',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });
    });

    // ============================================
    // Horizontal Privilege Escalation
    // ============================================
    describe('Horizontal Privilege Escalation', () => {
        it('ควรไม่ให้ user เข้าถึงข้อมูลของ user อื่นในระดับเดียวกัน', async () => {
            // Simulate two users at same level
            const user1 = { id: 10, role: 'user' };
            const user2Id = 11;

            // User 1 tries to access User 2's private data
            const response = await request(targets.backend)
                .get(`/api/users/${user2Id}/profile`)
                .set('x-user-id', user1.id.toString())
                .set('x-user-role', user1.role);

            const protected_ = response.status === 403 ||
                response.status === 401 ||
                response.status === 404;

            const result: SecurityTestResult = {
                testName: 'Horizontal Privilege Escalation Prevention',
                category: 'IDOR',
                severity: protected_ ? severity.INFO : severity.HIGH,
                passed: protected_,
                message: protected_
                    ? 'Users cannot access peer users\' data'
                    : 'Horizontal privilege escalation possible',
                timestamp: new Date().toISOString(),
            };
            client.recordResult(result);
        });

        it('ควรตรวจสอบทุก object references ใน request body', async () => {
            const attacker = testUsers.user;

            // Try to create a request referencing another user
            const response = await request(targets.backend)
                .post('/api/requests')
                .set('x-user-id', attacker.id.toString())
                .set('x-user-role', attacker.role)
                .send({
                    userId: 1, // Trying to submit request as another user
                    items: [{ id: 1, quantity: 5 }],
                });

            // Check if the created request uses attacker's ID or victim's ID
            let usedVictimId = false;
            if (response.status === 201 || response.status === 200) {
                usedVictimId = response.body?.userId === 1 && 1 !== attacker.id;
            }

            const protected_ = !usedVictimId;

            const result: SecurityTestResult = {
                testName: 'Request Body Object Reference Validation',
                category: 'IDOR',
                severity: protected_ ? severity.INFO : severity.HIGH,
                passed: protected_,
                message: protected_
                    ? 'Server validates object references in request body'
                    : 'Server accepts arbitrary userId in request - IDOR VULNERABLE',
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
        console.log('IDOR Security Test Summary');
        console.log('========================================');
        console.log(`Total Tests: ${summary.total}`);
        console.log(`Passed: ${summary.passed}`);
        console.log(`Failed: ${summary.failed}`);
        console.log('By Severity:', summary.bySeverity);
        console.log('========================================\n');
    });
});
