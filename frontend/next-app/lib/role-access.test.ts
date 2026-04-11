import { describe, expect, it } from 'vitest';
import { getRoleList, sessionHasAnyRole, SUPERADMIN_ONLY } from './role-access';

describe('role-access', () => {
    it('merges legacy role with multi-role assignments and keeps superadmin first', () => {
        expect(getRoleList({
            role: 'superadmin',
            roles: ['admin', 'approver'],
        })).toEqual(['superadmin', 'admin', 'approver']);
    });

    it('treats a session as superadmin when either role source says so', () => {
        expect(sessionHasAnyRole({
            user: {
                role: 'superadmin',
                roles: ['admin'],
            }
        }, ...SUPERADMIN_ONLY)).toBe(true);
    });
});
