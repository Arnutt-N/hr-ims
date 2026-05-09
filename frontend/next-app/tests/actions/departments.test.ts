import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { sessionFor } from './__mocks__/auth';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth-cache', () => ({ getCachedAuth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('departments Server Actions', () => {
    let departments: typeof import('@/lib/actions/departments');
    let getCachedAuth: Mock;
    let authMock: Mock;
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
        ({ getCachedAuth } = (await import('@/lib/auth-cache')) as { getCachedAuth: Mock });
        ({ auth: authMock } = (await import('@/auth')) as { auth: Mock });
        getCachedAuth.mockReset();
        authMock.mockReset();
        fetchSpy = vi.spyOn(global, 'fetch').mockReset();
        departments = await import('@/lib/actions/departments');
    });

    function jsonResponse(body: unknown, ok = true, status = 200): any {
        return {
            ok,
            status,
            json: () => Promise.resolve(body),
        };
    }

    describe('getDepartmentMappings', () => {
        it('returns [] when not admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('user'));
            const result = await departments.getDepartmentMappings();
            expect(result).toEqual([]);
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('forwards request with auth headers', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin', { id: 4 }));
            fetchSpy.mockResolvedValue(jsonResponse([{ id: 1 }]));

            const result = await departments.getDepartmentMappings();

            expect(result).toEqual([{ id: 1 }]);
            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/api/departments/mappings'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'x-user-id': '4',
                        'x-internal-key': expect.any(String),
                    }),
                    cache: 'no-store',
                }),
            );
        });

        it('returns [] when fetch is not ok', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            const err = vi.spyOn(console, 'error').mockImplementation(() => {});
            fetchSpy.mockResolvedValue(jsonResponse(null, false, 500));

            const result = await departments.getDepartmentMappings();
            expect(result).toEqual([]);
            err.mockRestore();
        });
    });

    describe('getUniqueDepartments', () => {
        it('rejects non-admin', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await departments.getUniqueDepartments();
            expect(result).toEqual([]);
        });

        it('returns response body for admin', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            fetchSpy.mockResolvedValue(jsonResponse(['Eng', 'HR']));
            const result = await departments.getUniqueDepartments();
            expect(result).toEqual(['Eng', 'HR']);
        });
    });

    describe('getMyMapping', () => {
        it('returns null warehouse when unauthenticated', async () => {
            authMock.mockResolvedValue(null);
            const result = await departments.getMyMapping();
            expect(result).toEqual({ warehouse: null });
        });

        it('returns warehouse mapping body when fetch ok', async () => {
            authMock.mockResolvedValue(sessionFor('user', { id: 8 }));
            fetchSpy.mockResolvedValue(jsonResponse({ warehouse: { id: 7 } }));
            const result = await departments.getMyMapping();
            expect(result).toEqual({ warehouse: { id: 7 } });
        });

        it('returns null warehouse when fetch fails (graceful degrade)', async () => {
            authMock.mockResolvedValue(sessionFor('user'));
            fetchSpy.mockResolvedValue(jsonResponse(null, false));
            const result = await departments.getMyMapping();
            expect(result).toEqual({ warehouse: null });
        });
    });

    describe('saveDepartmentMapping', () => {
        it('rejects non-admin', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await departments.saveDepartmentMapping('Eng', 1);
            expect(result.success).toBe(false);
        });

        it('POSTs JSON body with auth headers', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            fetchSpy.mockResolvedValue(jsonResponse({}));

            await departments.saveDepartmentMapping('Eng', 7);

            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/api/departments/mappings'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify({ department: 'Eng', warehouseId: 7 }),
                }),
            );
        });

        it('returns backend error message when API responds 4xx', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            fetchSpy.mockResolvedValue(jsonResponse({ error: 'Duplicate' }, false, 400));

            const result = await departments.saveDepartmentMapping('Eng', 7);
            expect(result).toEqual({ success: false, message: 'Duplicate' });
        });
    });

    describe('deleteDepartmentMapping', () => {
        it('rejects non-admin', async () => {
            getCachedAuth.mockResolvedValue(null);
            const result = await departments.deleteDepartmentMapping(5);
            expect(result.success).toBe(false);
        });

        it('DELETEs by id', async () => {
            getCachedAuth.mockResolvedValue(sessionFor('admin'));
            fetchSpy.mockResolvedValue(jsonResponse({}));

            const result = await departments.deleteDepartmentMapping(5);

            expect(fetchSpy).toHaveBeenCalledWith(
                expect.stringContaining('/api/departments/mappings/5'),
                expect.objectContaining({ method: 'DELETE' }),
            );
            expect(result.success).toBe(true);
        });
    });
});
