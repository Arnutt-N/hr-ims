/**
 * Pure RBAC authorization logic extracted from proxy.ts so it can be unit-tested
 * without bootstrapping NextAuth + Prisma.
 *
 * Source of truth for "who can see which dashboard route". The session shape
 * (userRoles, userPermissions) is hydrated by auth.ts.
 */

export type AuthorizeInput = {
    pathname: string;
    userRoles: string[];
    userPermissions: string[];
    /**
     * When true, fall back to a hard-coded role allowlist (`LEGACY_ROLE_RULES`)
     * if the user's path-based `permissions[]` doesn't grant the path.
     * Default: false. Controlled at runtime via `RBAC_LEGACY_FALLBACK`.
     */
    legacyFallbackEnabled: boolean;
};

export type AuthorizeDecision =
    | { allow: true }
    | { allow: false; reason: 'access_denied' };

export const PROTECTED_MODULES = [
    '/inventory',
    '/cart',
    '/my-assets',
    '/requests',
    '/maintenance',
    '/history',
    '/reports',
    '/scanner',
    '/tags',
    '/settings',
    '/users',
    '/logs',
    '/warehouse',
] as const;

export const LEGACY_ROLE_RULES = [
    { prefix: '/requests', roles: ['superadmin', 'admin', 'approver'] },
    // PRP v6 Phase 4: /reports/maintenance is the analytical view of the
    // maintenance workflow — technicians need it to track their own work.
    // Listed BEFORE /reports so the more specific match wins (rules are
    // evaluated via .find() — first match wins).
    { prefix: '/reports/maintenance', roles: ['superadmin', 'admin', 'technician', 'auditor'] },
    { prefix: '/maintenance', roles: ['superadmin', 'admin', 'technician'] },
    { prefix: '/history', roles: ['superadmin', 'admin', 'auditor'] },
    { prefix: '/reports', roles: ['superadmin', 'admin', 'auditor'] },
    { prefix: '/scanner', roles: ['superadmin', 'admin', 'technician'] },
    { prefix: '/tags', roles: ['superadmin', 'admin'] },
    { prefix: '/settings', roles: ['superadmin', 'admin'] },
    { prefix: '/users', roles: ['superadmin', 'admin'] },
    { prefix: '/logs', roles: ['superadmin', 'admin', 'auditor'] },
    { prefix: '/warehouse', roles: ['superadmin', 'admin', 'approver'] },
] as const;

export function isLegacyFallbackEnabled(envValue: string | undefined): boolean {
    return envValue === 'true';
}

export function authorizeRequest(input: AuthorizeInput): AuthorizeDecision {
    if (input.userRoles.includes('superadmin')) {
        return { allow: true };
    }

    const isProtected = PROTECTED_MODULES.some((p) => input.pathname.startsWith(p));
    if (!isProtected) {
        return { allow: true };
    }

    const hasPermission = input.userPermissions.some((allowedPath) => {
        if (input.pathname === allowedPath) return true;
        if (input.pathname.startsWith(`${allowedPath}/`)) return true;
        if (allowedPath.startsWith(`${input.pathname}/`)) return true;
        return false;
    });

    if (hasPermission) {
        return { allow: true };
    }

    if (input.legacyFallbackEnabled) {
        const matchingLegacyRule = LEGACY_ROLE_RULES.find((rule) =>
            input.pathname.startsWith(rule.prefix),
        );
        const hasLegacyAccess =
            !matchingLegacyRule ||
            matchingLegacyRule.roles.some((role) => input.userRoles.includes(role));
        if (hasLegacyAccess) {
            return { allow: true };
        }
    }

    return { allow: false, reason: 'access_denied' };
}
