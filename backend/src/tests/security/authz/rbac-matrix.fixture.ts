/**
 * RBAC Matrix Fixture
 *
 * Encodes the *expected* (role × route × method) → allow|deny decision for the
 * Express backend. Compiled from `src/routes/*.ts` route declarations on
 * 2026-05-07 (Phase B baseline).
 *
 * The matrix is asserted by `rbac-matrix.test.ts`. When new routes land,
 * extend this fixture rather than special-casing the test.
 *
 * Conventions
 * - `null` in `allowedRoles` means "no role required" (public endpoint).
 * - `'*'` means "any authenticated user, regardless of role".
 * - `null` in `body` means "no payload required for the test request".
 *   We send a placeholder body where the controller would 500 on missing
 *   fields, so a 4xx response still proves the auth middleware ran first.
 */

export type RoleSlug =
    | 'superadmin'
    | 'admin'
    | 'approver'
    | 'auditor'
    | 'technician'
    | 'user';

export const ALL_ROLES: readonly RoleSlug[] = [
    'superadmin',
    'admin',
    'approver',
    'auditor',
    'technician',
    'user',
] as const;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type MatrixRule = {
    /** Express route path (with `:id` style placeholders). */
    path: string;
    /** Method to test. */
    method: HttpMethod;
    /**
     * Roles that must be allowed. `null` = public (no auth header sent).
     * `'*'` = every role passes.
     */
    allowedRoles: readonly RoleSlug[] | null | '*';
    /** Optional body to send with non-GET requests. */
    body?: Record<string, unknown> | null;
    /** Replacement for `:id` placeholders. Defaults to `'1'`. */
    pathParams?: Record<string, string>;
    /** Free-text note that surfaces in test failure output. */
    note?: string;
};

/** ---------------------------------------------------------------------
 * Public endpoints
 * No auth required. We assert these don't return 401.
 * --------------------------------------------------------------------*/
const PUBLIC: MatrixRule[] = [
    { path: '/api/auth/login', method: 'POST', allowedRoles: null, body: { email: 'x', password: 'x' } },
    { path: '/api/auth/register', method: 'POST', allowedRoles: null, body: { email: 'x', password: 'x', name: 'x' } },
    { path: '/api/health', method: 'GET', allowedRoles: null },
    { path: '/api/settings/public', method: 'GET', allowedRoles: null },
];

/** ---------------------------------------------------------------------
 * superadmin-only endpoints
 * --------------------------------------------------------------------*/
const SUPERADMIN_ONLY: MatrixRule[] = [
    { path: '/api/health/admin', method: 'GET', allowedRoles: ['superadmin'] },
    { path: '/api/settings', method: 'GET', allowedRoles: ['superadmin'] },
    { path: '/api/settings', method: 'PUT', allowedRoles: ['superadmin'], body: {} },
    { path: '/api/settings/test-email', method: 'POST', allowedRoles: ['superadmin'], body: { to: 'x@y' } },
    { path: '/api/settings/backup-now', method: 'POST', allowedRoles: ['superadmin'], body: {} },
    { path: '/api/settings/backups', method: 'GET', allowedRoles: ['superadmin'] },
    { path: '/api/settings/cache', method: 'DELETE', allowedRoles: ['superadmin'] },
    { path: '/api/email/test', method: 'POST', allowedRoles: ['superadmin'], body: { to: 'x@y' } },
    { path: '/api/email/verify-connection', method: 'GET', allowedRoles: ['superadmin'] },
    { path: '/api/inventory/:id', method: 'DELETE', allowedRoles: ['superadmin'] },
];

/** ---------------------------------------------------------------------
 * superadmin + admin
 * --------------------------------------------------------------------*/
const ADMIN_TIER: MatrixRule[] = [
    { path: '/api/inventory', method: 'POST', allowedRoles: ['superadmin', 'admin'], body: { name: 'x' } },
    { path: '/api/inventory/:id', method: 'PATCH', allowedRoles: ['superadmin', 'admin'], body: { name: 'x' } },
    { path: '/api/warehouses', method: 'POST', allowedRoles: ['superadmin', 'admin'], body: { name: 'x' } },
    { path: '/api/warehouses/:id', method: 'PATCH', allowedRoles: ['superadmin', 'admin'], body: { name: 'x' } },
    { path: '/api/stock-levels', method: 'POST', allowedRoles: ['superadmin', 'admin'], body: { warehouseId: 1, itemId: 1, quantity: 1 } },
    { path: '/api/departments/mappings', method: 'GET', allowedRoles: ['superadmin', 'admin'] },
    { path: '/api/departments/unique', method: 'GET', allowedRoles: ['superadmin', 'admin'] },
    { path: '/api/departments/mappings', method: 'POST', allowedRoles: ['superadmin', 'admin'], body: { name: 'x' } },
    { path: '/api/departments/mappings/:id', method: 'DELETE', allowedRoles: ['superadmin', 'admin'] },
];

/** ---------------------------------------------------------------------
 * superadmin + admin + approver (stock adjustments / transfer approval)
 * --------------------------------------------------------------------*/
const APPROVER_TIER: MatrixRule[] = [
    { path: '/api/stock-levels/:warehouseId/:itemId/adjust', method: 'PATCH', allowedRoles: ['superadmin', 'admin', 'approver'], body: { quantity: 1 }, pathParams: { warehouseId: '1', itemId: '1' } },
    { path: '/api/stock-levels/:warehouseId/:itemId/limits', method: 'PATCH', allowedRoles: ['superadmin', 'admin', 'approver'], body: { min: 0, max: 100 }, pathParams: { warehouseId: '1', itemId: '1' } },
    { path: '/api/stock-transfers/:id', method: 'PATCH', allowedRoles: ['superadmin', 'admin', 'approver'], body: { status: 'approved' } },
];

/** ---------------------------------------------------------------------
 * Any authenticated user
 * --------------------------------------------------------------------*/
const ANY_AUTH: MatrixRule[] = [
    { path: '/api/health/detailed', method: 'GET', allowedRoles: '*' },
    { path: '/api/email/status', method: 'GET', allowedRoles: '*' },
    { path: '/api/stock-transfers', method: 'POST', allowedRoles: '*', body: { fromWarehouseId: 1, toWarehouseId: 2, itemId: 1, quantity: 1 } },
    { path: '/api/departments/my-mapping', method: 'GET', allowedRoles: '*' },
];

export const RBAC_MATRIX: readonly MatrixRule[] = [
    ...PUBLIC,
    ...SUPERADMIN_ONLY,
    ...ADMIN_TIER,
    ...APPROVER_TIER,
    ...ANY_AUTH,
] as const;

/** Replace `:id`, `:warehouseId`, etc. with values from `pathParams` (defaults to '1'). */
export function fillPath(rule: MatrixRule): string {
    return rule.path.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
        return rule.pathParams?.[key] ?? '1';
    });
}

/** Returns true when `role` is explicitly allowed for the rule. */
export function ruleAllows(rule: MatrixRule, role: RoleSlug): boolean {
    if (rule.allowedRoles === null) return true;
    if (rule.allowedRoles === '*') return true;
    return rule.allowedRoles.includes(role);
}
