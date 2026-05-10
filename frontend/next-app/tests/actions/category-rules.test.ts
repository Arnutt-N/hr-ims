/**
 * Vitest unit tests for category-rules Server Actions (PRP v6 Phase 5).
 */

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

// categoryAssigneeRule is registered in __mocks__/prisma.ts MODELS array.

describe('category-rules Server Actions', () => {
    let actions: typeof import('@/lib/actions/category-rules');
    let cachedAuthMock: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        ({ getCachedAuth: cachedAuthMock } = (await import('@/lib/auth-cache')) as {
            getCachedAuth: Mock;
        });
        cachedAuthMock.mockReset();
        actions = await import('@/lib/actions/category-rules');
    });

    describe('getCategoryRules', () => {
        it('rejects non-admin', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('user'));
            const r = await actions.getCategoryRules();
            expect(r).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('returns rules sorted by category + priority desc', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            (prismaMock as any).categoryAssigneeRule.findMany.mockResolvedValue([
                {
                    id: 1,
                    category: 'electrical',
                    assigneeUserId: 5,
                    priority: 10,
                    enabled: true,
                    assignee: { id: 5, name: 'Tech A', email: 'a@x.co' },
                },
            ]);
            const r = await actions.getCategoryRules();
            expect(r).toMatchObject({ success: true });
            expect((r as { rules: unknown[] }).rules).toHaveLength(1);
        });
    });

    describe('setCategoryRule', () => {
        it('rejects non-admin', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('user'));
            const r = await actions.setCategoryRule({
                category: 'electrical',
                assigneeUserId: 5,
            });
            expect(r).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects invalid category enum', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            const r = await actions.setCategoryRule({
                category: 'NOT_VALID' as never,
                assigneeUserId: 5,
            });
            expect(r).toMatchObject({ error: 'Invalid input' });
        });

        it('rejects assignee without admin/technician role', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 5,
                userRoles: [{ role: { slug: 'user' } }],
            } as never);
            const r = await actions.setCategoryRule({
                category: 'electrical',
                assigneeUserId: 5,
            });
            expect(r).toMatchObject({
                error: expect.stringContaining('admin, superadmin, or technician'),
            });
        });

        it('creates new rule when id omitted', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 5,
                userRoles: [{ role: { slug: 'technician' } }],
            } as never);
            (prismaMock as any).categoryAssigneeRule.create.mockResolvedValue({
                id: 1,
                category: 'electrical',
                assigneeUserId: 5,
                priority: 10,
                enabled: true,
            });
            const r = await actions.setCategoryRule({
                category: 'electrical',
                assigneeUserId: 5,
                priority: 10,
            });
            expect(r).toMatchObject({ success: true });
            expect((prismaMock as any).categoryAssigneeRule.create).toHaveBeenCalled();
            expect((prismaMock as any).categoryAssigneeRule.update).not.toHaveBeenCalled();
        });

        it('updates existing rule when id provided', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            prismaMock.user.findUnique.mockResolvedValue({
                id: 5,
                userRoles: [{ role: { slug: 'admin' } }],
            } as never);
            (prismaMock as any).categoryAssigneeRule.update.mockResolvedValue({
                id: 1,
                category: 'electrical',
                assigneeUserId: 5,
                priority: 0,
                enabled: false,
            });
            const r = await actions.setCategoryRule({
                id: 1,
                category: 'electrical',
                assigneeUserId: 5,
                enabled: false,
            });
            expect(r).toMatchObject({ success: true });
            expect((prismaMock as any).categoryAssigneeRule.update).toHaveBeenCalled();
            expect((prismaMock as any).categoryAssigneeRule.create).not.toHaveBeenCalled();
        });
    });

    describe('deleteCategoryRule', () => {
        it('rejects non-admin', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('user'));
            const r = await actions.deleteCategoryRule(1);
            expect(r).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects invalid id', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            const r = await actions.deleteCategoryRule(-1);
            expect(r).toEqual({ error: 'Invalid id' });
        });

        it('soft-disables (sets enabled=false), does NOT hard delete', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            (prismaMock as any).categoryAssigneeRule.update.mockResolvedValue({});
            await actions.deleteCategoryRule(1);
            expect((prismaMock as any).categoryAssigneeRule.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { enabled: false },
            });
            expect((prismaMock as any).categoryAssigneeRule.delete).not.toHaveBeenCalled();
        });
    });

    describe('testAutoAssignment', () => {
        it('rejects non-admin', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('user'));
            const r = await actions.testAutoAssignment('electrical');
            expect(r).toEqual({ error: 'Unauthorized - Admin only' });
        });

        it('rejects invalid category', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            const r = await actions.testAutoAssignment('made-up');
            expect(r).toEqual({ error: 'Invalid category' });
        });

        it('returns null assignee when no rule matches', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            (prismaMock as any).categoryAssigneeRule.findFirst.mockResolvedValue(null);
            const r = await actions.testAutoAssignment('electrical');
            expect(r).toMatchObject({ success: true, resolvedAssignee: null });
        });

        it('returns matched assignee from highest-priority rule', async () => {
            cachedAuthMock.mockResolvedValue(sessionFor('admin'));
            (prismaMock as any).categoryAssigneeRule.findFirst.mockResolvedValue({
                id: 1,
                category: 'electrical',
                priority: 10,
                assignee: { id: 5, name: 'Electrician', email: 'e@x.co' },
            });
            const r = await actions.testAutoAssignment('electrical');
            expect(r).toMatchObject({
                success: true,
                resolvedAssignee: { id: 5, name: 'Electrician' },
            });
        });
    });
});
