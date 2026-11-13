/**
 * IDOR (Insecure Direct Object Reference) Tests
 *
 * OWASP: A01:2021 — Broken Access Control
 * CWE-639: Authorization Bypass Through User-Controlled Key
 *
 * What this suite is for
 * ----------------------
 * Prove that a caller cannot reach an object they do not own or manage by
 * changing an id. Every case is a pair: a *negative* control (the attacker is
 * refused) and, where the route allows it, a *positive* control (a legitimate
 * caller is served). Without the positive control a 404 from a route that does
 * not exist would look like protection — which is exactly how the previous
 * version of this file passed while three of its own cases were failing.
 *
 * Rules this file follows
 * -----------------------
 * 1. Every case asserts with `expect`. Nothing is "recorded" and ignored.
 * 2. Routes and methods are the ones actually mounted in `src/index.ts`.
 * 3. 404 is only accepted as a refusal on routes where the object exists and
 *    the caller is genuinely out of scope. A 404 for a route that is not
 *    mounted would be a false pass, so each route is proven to exist first by
 *    the positive control in the same `describe`.
 * 4. 500 is never accepted as evidence of safety.
 * 5. Fixtures are synthetic and namespaced; see `idor.fixture.ts`.
 *
 * Runs in-process against the exported Express app (no live server, no Redis).
 */

import request from 'supertest';
import { app } from '../../../index';
import securityConfig from '../config';
import {
    checkDatabaseIsolation,
    createIdorFixture,
    teardownIdorFixture,
    type IdorFixture,
} from './idor.fixture';

const { internalApiKey } = securityConfig;

/** Headers that satisfy `requireAuth` for a given fixture user. */
function asUser(user: { id: number }, role: string): Record<string, string> {
    return {
        'x-user-id': String(user.id),
        'x-user-role': role,
        'x-internal-key': internalApiKey,
    };
}

/** A JWT for routes guarded by `authenticateToken` (e.g. `/api/users`). */
function jwtFor(user: { id: number }, role: string): string {
    // Imported lazily so the module reads JWT_SECRET at call time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jwt = require('jsonwebtoken');
    return jwt.sign(
        { id: user.id, userId: user.id, role, roles: [role] },
        process.env.JWT_SECRET as string,
        { expiresIn: '5m' },
    );
}

describe('🔒 IDOR — object-level authorization', () => {
    let fx: IdorFixture;
    let isolation: Awaited<ReturnType<typeof checkDatabaseIsolation>>;

    beforeAll(async () => {
        isolation = await checkDatabaseIsolation();
        fx = await createIdorFixture();
    });

    afterAll(async () => {
        await teardownIdorFixture();
    });

    // ------------------------------------------------------------------
    // Baseline: authentication is actually enforced
    // ------------------------------------------------------------------
    describe('baseline — the suite can tell a refusal from a success', () => {
        it('rejects an anonymous stock-level read with 401', async () => {
            const res = await request(app).get(
                `/api/stock-levels/${fx.warehouses.assigned.id}/${fx.items.shared.id}`,
            );
            expect(res.status).toBe(401);
        });

        it('rejects a request carrying a wrong internal key with 401', async () => {
            const res = await request(app)
                .get(`/api/stock-levels/${fx.warehouses.assigned.id}/${fx.items.shared.id}`)
                .set('x-user-id', String(fx.users.owner.id))
                .set('x-user-role', 'user')
                .set('x-internal-key', 'definitely-not-the-key');
            expect(res.status).toBe(401);
        });

        it('serves the assigned warehouse to its manager (positive control)', async () => {
            const res = await request(app)
                .get(`/api/stock-levels/${fx.warehouses.assigned.id}/${fx.items.shared.id}`)
                .set(asUser(fx.users.assignedApprover, 'approver'));

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                warehouseId: fx.warehouses.assigned.id,
                itemId: fx.items.shared.id,
                quantity: fx.stockLevels.assigned.quantity,
            });
        });
    });

    // ------------------------------------------------------------------
    // Horizontal: stock levels across warehouses
    // ------------------------------------------------------------------
    describe('stock levels — cross-warehouse read', () => {
        it('refuses an unassigned warehouse to a non-manager (404, not 200)', async () => {
            const res = await request(app)
                .get(`/api/stock-levels/${fx.warehouses.unassigned.id}/${fx.items.shared.id}`)
                .set(asUser(fx.users.assignedApprover, 'approver'));

            expect(res.status).toBe(404);
            // The refusal must not leak the quantity.
            expect(JSON.stringify(res.body)).not.toContain(
                String(fx.stockLevels.unassigned.quantity),
            );
        });

        it('refuses the unassigned warehouse to a plain user (404)', async () => {
            const res = await request(app)
                .get(`/api/stock-levels/${fx.warehouses.unassigned.id}/${fx.items.shared.id}`)
                .set(asUser(fx.users.owner, 'user'));

            expect(res.status).toBe(404);
        });

        it('lets an admin read any warehouse (positive control)', async () => {
            const res = await request(app)
                .get(`/api/stock-levels/${fx.warehouses.unassigned.id}/${fx.items.shared.id}`)
                .set(asUser(fx.users.admin, 'admin'));

            expect(res.status).toBe(200);
            expect(res.body.quantity).toBe(fx.stockLevels.unassigned.quantity);
        });

        it('scopes the stock-level list to managed warehouses', async () => {
            const res = await request(app)
                .get('/api/stock-levels')
                .set(asUser(fx.users.assignedApprover, 'approver'));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            const warehouseIds = res.body.map((row: any) => row.warehouseId);
            expect(warehouseIds).toContain(fx.warehouses.assigned.id);
            expect(warehouseIds).not.toContain(fx.warehouses.unassigned.id);
        });
    });

    // ------------------------------------------------------------------
    // Horizontal: stock mutation
    // ------------------------------------------------------------------
    describe('stock levels — cross-warehouse write', () => {
        it('refuses an adjustment in an unassigned warehouse and leaves stock untouched', async () => {
            const before = await request(app)
                .get(`/api/stock-levels/${fx.warehouses.unassigned.id}/${fx.items.shared.id}`)
                .set(asUser(fx.users.admin, 'admin'));
            expect(before.status).toBe(200);

            const res = await request(app)
                .patch(
                    `/api/stock-levels/${fx.warehouses.unassigned.id}/${fx.items.shared.id}/adjust`,
                )
                .set(asUser(fx.users.assignedApprover, 'approver'))
                .send({ adjustment: 1000, note: 'idor probe' });

            expect(res.status).toBe(404);

            const after = await request(app)
                .get(`/api/stock-levels/${fx.warehouses.unassigned.id}/${fx.items.shared.id}`)
                .set(asUser(fx.users.admin, 'admin'));
            expect(after.status).toBe(200);
            expect(after.body.quantity).toBe(before.body.quantity);
        });

        it('allows the same adjustment for the warehouse manager (positive control)', async () => {
            const res = await request(app)
                .patch(
                    `/api/stock-levels/${fx.warehouses.assigned.id}/${fx.items.shared.id}/adjust`,
                )
                .set(asUser(fx.users.assignedApprover, 'approver'))
                .send({ adjustment: 5, note: 'idor positive control' });

            expect(res.status).toBe(200);
            expect(res.body.quantity).toBe(fx.stockLevels.assigned.quantity + 5);

            // Restore so later cases see the documented baseline.
            await request(app)
                .patch(
                    `/api/stock-levels/${fx.warehouses.assigned.id}/${fx.items.shared.id}/adjust`,
                )
                .set(asUser(fx.users.assignedApprover, 'approver'))
                .send({ adjustment: -5, note: 'idor restore' });
        });

        it('refuses a plain user any adjustment (403, not 500)', async () => {
            const res = await request(app)
                .patch(
                    `/api/stock-levels/${fx.warehouses.assigned.id}/${fx.items.shared.id}/adjust`,
                )
                .set(asUser(fx.users.owner, 'user'))
                .send({ adjustment: 1 });

            expect(res.status).toBe(403);
        });
    });

    // ------------------------------------------------------------------
    // Horizontal: request visibility
    // ------------------------------------------------------------------
    describe('requests — list visibility', () => {
        it('limits a plain user to their own requests', async () => {
            const res = await request(app)
                .get('/api/requests')
                .set(asUser(fx.users.owner, 'user'));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            const ids = res.body.map((r: any) => r.id);
            expect(ids).toContain(fx.requests.ownerPending.id);
            expect(ids).not.toContain(fx.requests.victimPending.id);
            expect(ids).not.toContain(fx.requests.victimUnassigned.id);
        });

        /**
         * Pins the *current* behaviour for non-`user` roles rather than
         * asserting it is correct. `requestController.getRequests` only filters
         * by owner when the primary role is exactly `user`, so a technician
         * sees every request. That is an open policy question (V20/V21 in the
         * handoff), not something this suite should silently bless or fix.
         *
         * If the policy is tightened, this test will fail — which is the point:
         * the change becomes visible instead of shipping unnoticed.
         */
        it('documents that a technician currently sees other users\' requests', async () => {
            const res = await request(app)
                .get('/api/requests')
                .set(asUser(fx.users.technician, 'technician'));

            expect(res.status).toBe(200);
            const ids = res.body.map((r: any) => r.id);
            expect(ids).toContain(fx.requests.victimPending.id);
        });
    });

    // ------------------------------------------------------------------
    // Horizontal: request status transition
    // ------------------------------------------------------------------
    describe('requests — status transition', () => {
        it('refuses an approver acting on a request in an unassigned warehouse', async () => {
            const res = await request(app)
                .patch(`/api/requests/${fx.requests.victimUnassigned.id}/status`)
                .set(asUser(fx.users.assignedApprover, 'approver'))
                .send({ status: 'rejected' });

            expect(res.status).toBe(404);

            // The status must be unchanged.
            const check = await request(app)
                .get('/api/requests')
                .set(asUser(fx.users.admin, 'admin'));
            const row = check.body.find((r: any) => r.id === fx.requests.victimUnassigned.id);
            expect(row?.status).toBe('pending');
        });

        it('refuses a plain user the transition outright (403)', async () => {
            const res = await request(app)
                .patch(`/api/requests/${fx.requests.ownerPending.id}/status`)
                .set(asUser(fx.users.owner, 'user'))
                .send({ status: 'approved' });

            expect(res.status).toBe(403);
        });

        it('allows the warehouse manager to reject in scope (positive control)', async () => {
            const res = await request(app)
                .patch(`/api/requests/${fx.requests.victimPending.id}/status`)
                .set(asUser(fx.users.assignedApprover, 'approver'))
                .send({ status: 'rejected' });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('rejected');
        });
    });

    // ------------------------------------------------------------------
    // Vertical: user directory
    // ------------------------------------------------------------------
    describe('users — vertical escalation', () => {
        /**
         * `/api/users` is guarded by `authenticateToken` + `authorize(['admin','hr'])`,
         * so it takes a JWT, not the internal header. The previous version of
         * this file sent `x-user-*` headers here and treated the resulting 401
         * as proof of protection — it was only proving the route rejects a
         * header scheme it never accepted.
         */
        it('refuses a plain user the user directory (403 via JWT)', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${jwtFor(fx.users.owner, 'user')}`);

            expect(res.status).toBe(403);
        });

        it('refuses an anonymous caller (401)', async () => {
            const res = await request(app).get('/api/users');
            expect(res.status).toBe(401);
        });

        it('serves the directory to an admin (positive control)', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${jwtFor(fx.users.admin, 'admin')}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('does not expose password hashes in the user directory', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${jwtFor(fx.users.admin, 'admin')}`);

            expect(res.status).toBe(200);
            expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$\d{2}\$/);
        });
    });

    // ------------------------------------------------------------------
    // Vertical: inventory mutation
    // ------------------------------------------------------------------
    describe('inventory — vertical escalation', () => {
        it('refuses a plain user an inventory update (403)', async () => {
            const res = await request(app)
                .patch(`/api/inventory/${fx.items.shared.id}`)
                .set(asUser(fx.users.owner, 'user'))
                .send({ name: 'idor overwritten' });

            expect(res.status).toBe(403);
        });

        it('refuses an approver an inventory update (403 — admin tier only)', async () => {
            const res = await request(app)
                .patch(`/api/inventory/${fx.items.shared.id}`)
                .set(asUser(fx.users.assignedApprover, 'approver'))
                .send({ name: 'idor overwritten' });

            expect(res.status).toBe(403);
        });

        it('refuses a plain user an inventory delete (403)', async () => {
            const res = await request(app)
                .delete(`/api/inventory/${fx.items.shared.id}`)
                .set(asUser(fx.users.owner, 'user'));

            expect(res.status).toBe(403);
        });

        it('allows an admin the inventory update (positive control)', async () => {
            const res = await request(app)
                .patch(`/api/inventory/${fx.items.shared.id}`)
                .set(asUser(fx.users.admin, 'admin'))
                .send({ name: `${fx.items.shared.name} (admin edit)` });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe(`${fx.items.shared.name} (admin edit)`);
        });
    });

    // ------------------------------------------------------------------
    // Route existence — the failure mode that hid the old suite's gaps
    // ------------------------------------------------------------------
    describe('route contract — guards against testing routes that do not exist', () => {
        /**
         * Each entry is a route the old suite asserted against but which is not
         * mounted. If one of these is ever added for real, the expectation
         * below fails and the suite gets updated deliberately. Until then this
         * test documents *why* the old assertions were meaningless.
         *
         * `auth` matters: `/api/users` mounts `authenticateToken` at the router
         * level, so an unmounted path under it answers 401 before Express ever
         * gets to route matching. Sending the wrong scheme would make the test
         * pass for the wrong reason — the same mistake the old suite made.
         */
        const routesThatDoNotExist = [
            { method: 'get' as const, path: '/api/users/1/profile', auth: 'jwt' as const },
            { method: 'post' as const, path: '/api/requests/1/approve', auth: 'header' as const },
            { method: 'post' as const, path: '/api/stock-levels/1/adjust', auth: 'header' as const },
            { method: 'put' as const, path: '/api/inventory/1', auth: 'header' as const },
            { method: 'put' as const, path: '/api/users/1', auth: 'jwt' as const },
        ];

        for (const route of routesThatDoNotExist) {
            it(`${route.method.toUpperCase()} ${route.path} is not mounted`, async () => {
                const agent = request(app);
                const builder =
                    route.method === 'get'
                        ? agent.get(route.path)
                        : route.method === 'post'
                          ? agent.post(route.path)
                          : agent.put(route.path);

                const authed =
                    route.auth === 'jwt'
                        ? builder.set(
                              'Authorization',
                              `Bearer ${jwtFor(fx.users.admin, 'admin')}`,
                          )
                        : builder.set(asUser(fx.users.admin, 'admin'));

                const res = await authed;

                // Express answers an unmounted path with 404 — which is exactly
                // why a 404 must never be read as "authorization worked".
                expect(res.status).toBe(404);
            });
        }
    });

    // ------------------------------------------------------------------
    // Report
    // ------------------------------------------------------------------
    afterAll(() => {
        // eslint-disable-next-line no-console
        console.log(
            `\nIDOR suite ran against ${isolation.url} ` +
                `(pre-existing warehouses: ${isolation.preExistingWarehouses}, ` +
                `pre-existing requests: ${isolation.preExistingRequests}). ` +
                `Fixture rows were removed afterwards.\n`,
        );
    });
});
