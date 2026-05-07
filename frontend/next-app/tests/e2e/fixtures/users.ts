/**
 * Deterministic test users for the golden-path Playwright suite.
 * These come from `backend/prisma/seed.ts` (demo accounts block).
 *
 * Anything that needs a stable login should pull credentials from here
 * instead of hard-coding strings — when seed values change, the suite
 * adapts via this single source of truth.
 */

export type RoleSlug =
    | 'superadmin'
    | 'admin'
    | 'approver'
    | 'auditor'
    | 'technician'
    | 'user';

export type DemoUser = {
    role: RoleSlug;
    email: string;
    password: string;
    displayName: string;
    department: string;
};

export const DEMO_USERS: Record<RoleSlug, DemoUser> = {
    superadmin: {
        role: 'superadmin',
        email: 'superadmin@demo.com',
        password: 'demo123',
        displayName: 'Demo Superadmin',
        department: 'Executive',
    },
    admin: {
        role: 'admin',
        email: 'admin@demo.com',
        password: 'demo123',
        displayName: 'Demo Admin',
        department: 'IT',
    },
    approver: {
        role: 'approver',
        email: 'approver@demo.com',
        password: 'demo123',
        displayName: 'Demo Approver',
        department: 'Management',
    },
    auditor: {
        role: 'auditor',
        email: 'auditor@demo.com',
        password: 'demo123',
        displayName: 'Demo Auditor',
        department: 'Finance',
    },
    technician: {
        role: 'technician',
        email: 'tech@demo.com',
        password: 'demo123',
        displayName: 'Demo Technician',
        department: 'Maintenance',
    },
    user: {
        role: 'user',
        email: 'user@demo.com',
        password: 'demo123',
        displayName: 'Demo User',
        department: 'Sales',
    },
};
