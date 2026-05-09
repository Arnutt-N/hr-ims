import { describe, expect, it } from 'vitest';
import { authorizeRequest, PROTECTED_MODULES } from '../../lib/proxy-authorize';

const ROLES = ['superadmin', 'admin', 'approver', 'auditor', 'technician', 'user'] as const;
type Role = (typeof ROLES)[number];

const PUBLIC_PATHS = ['/dashboard', '/api/auth/session'];

describe('authorizeRequest (proxy RBAC)', () => {
    describe('superadmin always passes', () => {
        for (const path of [...PROTECTED_MODULES, ...PUBLIC_PATHS]) {
            it(`allows superadmin → ${path}`, () => {
                const decision = authorizeRequest({
                    pathname: path,
                    userRoles: ['superadmin'],
                    userPermissions: [],
                    legacyFallbackEnabled: false,
                });
                expect(decision.allow).toBe(true);
            });
        }
    });

    describe('non-protected paths bypass RBAC', () => {
        for (const role of ROLES) {
            it(`allows ${role} → /dashboard regardless of permissions`, () => {
                const decision = authorizeRequest({
                    pathname: '/dashboard',
                    userRoles: [role],
                    userPermissions: [],
                    legacyFallbackEnabled: false,
                });
                expect(decision.allow).toBe(true);
            });
        }
    });

    describe('protected paths with matrix-only mode (legacyFallbackEnabled=false)', () => {
        it('denies user with empty permissions on /inventory', () => {
            const decision = authorizeRequest({
                pathname: '/inventory',
                userRoles: ['user'],
                userPermissions: [],
                legacyFallbackEnabled: false,
            });
            expect(decision).toEqual({ allow: false, reason: 'access_denied' });
        });

        it('allows user with /inventory in permissions', () => {
            const decision = authorizeRequest({
                pathname: '/inventory',
                userRoles: ['user'],
                userPermissions: ['/inventory'],
                legacyFallbackEnabled: false,
            });
            expect(decision.allow).toBe(true);
        });

        it('allows nested route when parent permission is granted', () => {
            const decision = authorizeRequest({
                pathname: '/inventory/items/42',
                userRoles: ['user'],
                userPermissions: ['/inventory'],
                legacyFallbackEnabled: false,
            });
            expect(decision.allow).toBe(true);
        });

        it('allows parent route when only a deeper permission is granted (current behavior)', () => {
            const decision = authorizeRequest({
                pathname: '/inventory',
                userRoles: ['user'],
                userPermissions: ['/inventory/items'],
                legacyFallbackEnabled: false,
            });
            expect(decision.allow).toBe(true);
        });

        it('denies admin with no permissions on /settings (matrix authoritative)', () => {
            const decision = authorizeRequest({
                pathname: '/settings',
                userRoles: ['admin'],
                userPermissions: [],
                legacyFallbackEnabled: false,
            });
            expect(decision).toEqual({ allow: false, reason: 'access_denied' });
        });

        it('denies approver with no permissions on /requests (matrix authoritative)', () => {
            const decision = authorizeRequest({
                pathname: '/requests',
                userRoles: ['approver'],
                userPermissions: [],
                legacyFallbackEnabled: false,
            });
            expect(decision).toEqual({ allow: false, reason: 'access_denied' });
        });
    });

    describe('legacy fallback mode (legacyFallbackEnabled=true)', () => {
        it('allows admin on /settings via legacy rule when permissions empty', () => {
            const decision = authorizeRequest({
                pathname: '/settings',
                userRoles: ['admin'],
                userPermissions: [],
                legacyFallbackEnabled: true,
            });
            expect(decision.allow).toBe(true);
        });

        it('allows approver on /requests via legacy rule when permissions empty', () => {
            const decision = authorizeRequest({
                pathname: '/requests',
                userRoles: ['approver'],
                userPermissions: [],
                legacyFallbackEnabled: true,
            });
            expect(decision.allow).toBe(true);
        });

        it('allows technician on /maintenance via legacy rule', () => {
            const decision = authorizeRequest({
                pathname: '/maintenance',
                userRoles: ['technician'],
                userPermissions: [],
                legacyFallbackEnabled: true,
            });
            expect(decision.allow).toBe(true);
        });

        it('allows auditor on /reports via legacy rule', () => {
            const decision = authorizeRequest({
                pathname: '/reports',
                userRoles: ['auditor'],
                userPermissions: [],
                legacyFallbackEnabled: true,
            });
            expect(decision.allow).toBe(true);
        });

        it('still denies user on /settings — legacy rule excludes user', () => {
            const decision = authorizeRequest({
                pathname: '/settings',
                userRoles: ['user'],
                userPermissions: [],
                legacyFallbackEnabled: true,
            });
            expect(decision).toEqual({ allow: false, reason: 'access_denied' });
        });

        it('still denies user on /users — legacy rule excludes user', () => {
            const decision = authorizeRequest({
                pathname: '/users',
                userRoles: ['user'],
                userPermissions: [],
                legacyFallbackEnabled: true,
            });
            expect(decision).toEqual({ allow: false, reason: 'access_denied' });
        });
    });

    describe('matrix authority — disabling legacy fallback removes accidental grants', () => {
        // The whole point of RBAC_LEGACY_FALLBACK=false: an admin can no longer
        // touch /settings unless the RolePermission table explicitly grants it.
        it('admin is denied /settings when matrix is empty (no legacy)', () => {
            const decisionWithFlag = authorizeRequest({
                pathname: '/settings',
                userRoles: ['admin'],
                userPermissions: [],
                legacyFallbackEnabled: true,
            });
            const decisionWithoutFlag = authorizeRequest({
                pathname: '/settings',
                userRoles: ['admin'],
                userPermissions: [],
                legacyFallbackEnabled: false,
            });
            expect(decisionWithFlag.allow).toBe(true);
            expect(decisionWithoutFlag.allow).toBe(false);
        });

        it('approver is denied /requests when matrix is empty (no legacy)', () => {
            const decisionWithFlag = authorizeRequest({
                pathname: '/requests',
                userRoles: ['approver'],
                userPermissions: [],
                legacyFallbackEnabled: true,
            });
            const decisionWithoutFlag = authorizeRequest({
                pathname: '/requests',
                userRoles: ['approver'],
                userPermissions: [],
                legacyFallbackEnabled: false,
            });
            expect(decisionWithFlag.allow).toBe(true);
            expect(decisionWithoutFlag.allow).toBe(false);
        });
    });

    describe('multi-role merging', () => {
        it('uses any role to satisfy legacy fallback', () => {
            const decision = authorizeRequest({
                pathname: '/maintenance',
                userRoles: ['user', 'technician'],
                userPermissions: [],
                legacyFallbackEnabled: true,
            });
            expect(decision.allow).toBe(true);
        });

        it('superadmin in multi-role still bypasses everything', () => {
            const decision = authorizeRequest({
                pathname: '/settings',
                userRoles: ['user', 'superadmin'],
                userPermissions: [],
                legacyFallbackEnabled: false,
            });
            expect(decision.allow).toBe(true);
        });
    });
});
