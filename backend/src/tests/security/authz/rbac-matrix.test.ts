/**
 * RBAC Matrix Test
 *
 * Iterates the (role × route × method) matrix from `rbac-matrix.fixture.ts`
 * and asserts every cell decodes to the expected allow/deny.
 *
 * - Allowed cells must NOT return 401/403.
 * - Denied cells MUST return 401 or 403.
 * - Unauthenticated requests on auth-required routes MUST return 401.
 *
 * Runs Supertest against the in-memory Express app (no live server needed).
 *
 * OWASP: A01:2021 — Broken Access Control
 */

import request from 'supertest';
import { app } from '../../../index';
import securityConfig from '../config';
import {
    ALL_ROLES,
    fillPath,
    RBAC_MATRIX,
    ruleAllows,
    type MatrixRule,
    type RoleSlug,
} from './rbac-matrix.fixture';

const { internalApiKey } = securityConfig;

const ROLE_TO_TEST_ID: Record<RoleSlug, number> = {
    superadmin: 3,
    admin: 4,
    approver: 5,
    auditor: 6,
    technician: 7,
    user: 8,
};

function send(rule: MatrixRule, headers: Record<string, string>) {
    const path = fillPath(rule);
    const agent = request(app);
    const builder =
        rule.method === 'GET'
            ? agent.get(path)
            : rule.method === 'DELETE'
              ? agent.delete(path)
              : rule.method === 'POST'
                ? agent.post(path)
                : rule.method === 'PUT'
                  ? agent.put(path)
                  : agent.patch(path);

    let req = builder;
    for (const [k, v] of Object.entries(headers)) {
        req = req.set(k, v);
    }
    if (rule.body) {
        req = req.send(rule.body);
    }
    return req;
}

function authHeaders(role: RoleSlug): Record<string, string> {
    return {
        'x-user-id': ROLE_TO_TEST_ID[role].toString(),
        'x-user-role': role,
        'x-internal-key': internalApiKey,
    };
}

describe('🔒 RBAC Matrix — backend route × role × method', () => {
    describe('public endpoints respond without 401', () => {
        for (const rule of RBAC_MATRIX.filter((r) => r.allowedRoles === null)) {
            it(`${rule.method} ${rule.path} (no auth)`, async () => {
                const res = await send(rule, {});
                expect(res.status).not.toBe(401);
                expect(res.status).not.toBe(403);
            });
        }
    });

    describe('auth-required endpoints reject missing internal key', () => {
        const protectedRules = RBAC_MATRIX.filter((r) => r.allowedRoles !== null);
        // Sample a stable subset to keep the suite fast (one rule per allowedRoles tier).
        const sample = [
            protectedRules.find((r) => r.allowedRoles === '*'),
            protectedRules.find(
                (r) => Array.isArray(r.allowedRoles) && r.allowedRoles.length === 1,
            ),
            protectedRules.find(
                (r) => Array.isArray(r.allowedRoles) && r.allowedRoles.includes('admin'),
            ),
            protectedRules.find(
                (r) =>
                    Array.isArray(r.allowedRoles) && r.allowedRoles.includes('approver'),
            ),
        ].filter((r): r is MatrixRule => Boolean(r));

        for (const rule of sample) {
            it(`${rule.method} ${rule.path} returns 401 without x-user headers`, async () => {
                const res = await send(rule, {});
                expect(res.status).toBe(401);
            });
        }
    });

    describe('matrix decisions per role', () => {
        for (const rule of RBAC_MATRIX) {
            for (const role of ALL_ROLES) {
                if (rule.allowedRoles === null) continue;
                const expected = ruleAllows(rule, role);
                const label = `${rule.method.padEnd(6)} ${rule.path.padEnd(50)} as ${role.padEnd(11)} → ${expected ? 'allow' : 'deny'}`;

                it(label, async () => {
                    const res = await send(rule, authHeaders(role));
                    if (expected) {
                        expect(res.status).not.toBe(401);
                        expect(res.status).not.toBe(403);
                    } else {
                        // Denied roles must hit 401 or 403 BEFORE controllers run.
                        expect([401, 403]).toContain(res.status);
                    }
                });
            }
        }
    });
});
