import { describe, expect, it } from 'vitest';
import {
    ADMIN_ROLES,
    APPROVER_ROLES,
    getRoleList,
    getSessionRoles,
    sessionHasAnyRole,
    SUPERADMIN_ONLY,
    userHasAnyRole,
} from './role-access';

describe('role-access', () => {
    describe('getRoleList', () => {
        it('merges legacy role with multi-role assignments and keeps superadmin first', () => {
            expect(getRoleList({
                role: 'superadmin',
                roles: ['admin', 'approver'],
            })).toEqual(['superadmin', 'admin', 'approver']);
        });

        it('returns empty array for null/undefined user', () => {
            expect(getRoleList(null)).toEqual([]);
            expect(getRoleList(undefined)).toEqual([]);
        });

        it('drops empty / non-string entries', () => {
            expect(getRoleList({
                role: '',
                roles: ['admin', '', null as unknown as string, undefined as unknown as string],
            })).toEqual(['admin']);
        });

        it('deduplicates roles that appear in both fields', () => {
            expect(getRoleList({
                role: 'admin',
                roles: ['admin', 'auditor'],
            })).toEqual(['admin', 'auditor']);
        });

        it('orders by ROLE_PRIORITY (superadmin → admin → approver → auditor → technician → user)', () => {
            expect(getRoleList({
                roles: ['user', 'auditor', 'admin', 'technician', 'approver', 'superadmin'],
            })).toEqual([
                'superadmin',
                'admin',
                'approver',
                'auditor',
                'technician',
                'user',
            ]);
        });

        it('places unknown roles after known ones, alphabetised', () => {
            expect(getRoleList({
                roles: ['zzz', 'admin', 'aaa'],
            })).toEqual(['admin', 'aaa', 'zzz']);
        });

        it('handles user with only legacy role field', () => {
            expect(getRoleList({ role: 'auditor' })).toEqual(['auditor']);
        });

        it('handles user with only roles array', () => {
            expect(getRoleList({ roles: ['technician'] })).toEqual(['technician']);
        });
    });

    describe('getSessionRoles', () => {
        it('returns roles from session.user', () => {
            expect(
                getSessionRoles({ user: { role: 'admin', roles: ['admin'] } }),
            ).toEqual(['admin']);
        });

        it('returns empty array for null session', () => {
            expect(getSessionRoles(null)).toEqual([]);
        });
    });

    describe('userHasAnyRole', () => {
        it('returns true when user has at least one of the requested roles', () => {
            expect(
                userHasAnyRole({ roles: ['user', 'auditor'] }, 'admin', 'auditor'),
            ).toBe(true);
        });

        it('returns false when none of the requested roles match', () => {
            expect(userHasAnyRole({ roles: ['user'] }, 'admin', 'superadmin')).toBe(false);
        });

        it('returns truthy boolean for any user when no roles requested', () => {
            expect(userHasAnyRole({ roles: ['user'] })).toBe(true);
            expect(userHasAnyRole(null)).toBe(false);
        });
    });

    describe('sessionHasAnyRole', () => {
        it('treats a session as superadmin when either role source says so', () => {
            expect(
                sessionHasAnyRole(
                    { user: { role: 'superadmin', roles: ['admin'] } },
                    ...SUPERADMIN_ONLY,
                ),
            ).toBe(true);
        });

        it('returns false when session has no matching roles', () => {
            expect(
                sessionHasAnyRole(
                    { user: { role: 'user', roles: ['user'] } },
                    ...ADMIN_ROLES,
                ),
            ).toBe(false);
        });

        it('handles missing session safely', () => {
            expect(sessionHasAnyRole(null, ...ADMIN_ROLES)).toBe(false);
            expect(sessionHasAnyRole(undefined, ...ADMIN_ROLES)).toBe(false);
        });
    });

    describe('role constant invariants', () => {
        it('SUPERADMIN_ONLY contains only superadmin', () => {
            expect(SUPERADMIN_ONLY).toEqual(['superadmin']);
        });

        it('ADMIN_ROLES is a subset of APPROVER_ROLES', () => {
            for (const role of ADMIN_ROLES) {
                expect(APPROVER_ROLES).toContain(role);
            }
        });

        it('APPROVER_ROLES adds approver to ADMIN_ROLES', () => {
            expect(new Set(APPROVER_ROLES)).toEqual(new Set([...ADMIN_ROLES, 'approver']));
        });
    });
});
