/**
 * Auth + cache mock helpers for Server Action tests.
 *
 * `mockSession()` returns a session shape matching what `auth()` produces,
 * including the multi-role / permissions arrays read by `auth-guards.ts`.
 *
 * Usage (call before importing the action under test):
 *
 *   import { vi } from 'vitest';
 *   import { sessionFor } from '../__mocks__/auth';
 *
 *   vi.mock('@/auth', () => ({ auth: vi.fn() }));
 *   vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
 *
 *   const { auth } = await import('@/auth');
 *   const { getCachedAuth } = await import('@/lib/auth-cache');
 *   (auth as Mock).mockResolvedValue(sessionFor('admin'));
 *   (getCachedAuth as Mock).mockResolvedValue(sessionFor('admin'));
 */

export type RoleSlug =
    | 'superadmin'
    | 'admin'
    | 'approver'
    | 'auditor'
    | 'technician'
    | 'user';

const ROLE_TO_ID: Record<RoleSlug, number> = {
    superadmin: 3,
    admin: 4,
    approver: 5,
    auditor: 6,
    technician: 7,
    user: 8,
};

export function sessionFor(
    role: RoleSlug | RoleSlug[],
    overrides: { id?: number; email?: string; name?: string } = {},
) {
    const roles = Array.isArray(role) ? role : [role];
    const primary = roles[0];
    const id = overrides.id ?? ROLE_TO_ID[primary];
    return {
        user: {
            id: id.toString(),
            email: overrides.email ?? `${primary}@demo.com`,
            name: overrides.name ?? primary,
            image: null,
            role: primary,
            roles,
            permissions: [],
            tokenVersion: 1,
        },
    };
}
