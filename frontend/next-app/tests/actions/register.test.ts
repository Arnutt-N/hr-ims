import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { prismaMock, resetPrismaMock } from './__mocks__/prisma';

vi.mock('@/lib/prisma', () => ({ default: prismaMock }));
vi.mock('@/lib/role-sync', () => ({
    ensureUserHasPrimaryRole: vi.fn(),
}));
vi.mock('bcrypt', () => ({
    default: { hash: vi.fn() },
    hash: vi.fn(),
}));

describe('register Server Action', () => {
    let register: typeof import('@/lib/actions/register');
    let bcryptHash: Mock;

    beforeEach(async () => {
        resetPrismaMock();
        const bcryptModule = (await import('bcrypt')) as any;
        bcryptHash = bcryptModule.hash ?? bcryptModule.default.hash;
        (bcryptHash as Mock).mockReset();
        (bcryptHash as Mock).mockResolvedValue('hashed');
        register = await import('@/lib/actions/register');
    });

    function makeFormData(entries: Record<string, string>): FormData {
        const fd = new FormData();
        for (const [k, v] of Object.entries(entries)) fd.append(k, v);
        return fd;
    }

    function valid(overrides: Partial<Record<string, string>> = {}): FormData {
        return makeFormData({
            name: 'New User',
            email: 'new@x.com',
            password: 'secret123',
            confirmPassword: 'secret123',
            ...overrides,
        });
    }

    it('rejects when registration disabled in settings', async () => {
        prismaMock.settings.findFirst.mockResolvedValue({ allowRegistration: false } as any);
        const result = await register.registerUser(undefined, valid());
        expect(result).toEqual({
            error: 'Registration is currently disabled by the administrator.',
        });
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('rejects missing fields', async () => {
        prismaMock.settings.findFirst.mockResolvedValue({ allowRegistration: true } as any);
        const fd = makeFormData({ email: '', password: '', name: '' });
        const result = await register.registerUser(undefined, fd);
        expect(result).toEqual({ error: 'All fields are required.' });
    });

    it('rejects when passwords do not match', async () => {
        prismaMock.settings.findFirst.mockResolvedValue({ allowRegistration: true } as any);
        const result = await register.registerUser(
            undefined,
            valid({ confirmPassword: 'different' }),
        );
        expect(result).toEqual({ error: 'Passwords do not match.' });
    });

    it('rejects passwords shorter than 6 chars', async () => {
        prismaMock.settings.findFirst.mockResolvedValue({ allowRegistration: true } as any);
        const result = await register.registerUser(
            undefined,
            valid({ password: 'short', confirmPassword: 'short' }),
        );
        expect(result).toEqual({ error: 'Password must be at least 6 characters.' });
    });

    it('rejects duplicate email', async () => {
        prismaMock.settings.findFirst.mockResolvedValue({ allowRegistration: true } as any);
        prismaMock.user.findUnique.mockResolvedValue({ id: 1 } as any);

        const result = await register.registerUser(undefined, valid());
        expect(result).toEqual({
            error: 'An account with this email already exists.',
        });
    });

    it('hashes password and creates user atomically', async () => {
        prismaMock.settings.findFirst.mockResolvedValue({ allowRegistration: true } as any);
        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.create.mockResolvedValue({ id: 99 } as any);

        const result = await register.registerUser(undefined, valid());

        expect(bcryptHash).toHaveBeenCalledWith('secret123', 10);
        expect(prismaMock.user.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                email: 'new@x.com',
                password: 'hashed',
                name: 'New User',
                role: 'user',
                status: 'active',
            }),
        });
        expect(result).toEqual({ success: true });
    });

    it('returns generic error on DB failure', async () => {
        prismaMock.settings.findFirst.mockResolvedValue({ allowRegistration: true } as any);
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        prismaMock.user.findUnique.mockRejectedValue(new Error('boom'));

        const result = await register.registerUser(undefined, valid());
        expect(result).toEqual({
            error: 'An error occurred during registration. Please try again.',
        });
        errSpy.mockRestore();
    });
});
