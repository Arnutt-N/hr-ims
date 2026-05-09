import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

vi.mock('@/auth', () => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
}));
vi.mock('next-auth', () => {
    class AuthError extends Error {
        type: string;
        constructor(type: string, message?: string) {
            super(message ?? type);
            this.type = type;
        }
    }
    return { AuthError };
});

describe('auth Server Actions', () => {
    let auth: typeof import('@/lib/actions/auth');
    let signIn: Mock;
    let signOut: Mock;
    let AuthError: typeof Error & { new (type: string, message?: string): Error & { type: string } };

    beforeEach(async () => {
        ({ signIn, signOut } = (await import('@/auth')) as {
            signIn: Mock;
            signOut: Mock;
        });
        ({ AuthError } = (await import('next-auth')) as any);
        signIn.mockReset();
        signOut.mockReset();
        auth = await import('@/lib/actions/auth');
    });

    describe('authenticate', () => {
        function makeFormData(entries: Record<string, string>): FormData {
            const fd = new FormData();
            for (const [k, v] of Object.entries(entries)) fd.append(k, v);
            return fd;
        }

        it('forwards form fields to signIn with redirectTo=/dashboard', async () => {
            signIn.mockResolvedValue(undefined);
            const fd = makeFormData({ email: 'x@y', password: 'pw' });

            await auth.authenticate(undefined, fd);

            expect(signIn).toHaveBeenCalledWith('credentials', {
                email: 'x@y',
                password: 'pw',
                redirectTo: '/dashboard',
            });
        });

        it('returns "Invalid credentials." for CredentialsSignin AuthError', async () => {
            const err = new (AuthError as any)('CredentialsSignin');
            signIn.mockRejectedValue(err);
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = await auth.authenticate(undefined, makeFormData({ email: 'x', password: 'p' }));

            expect(result).toBe('Invalid credentials.');
            errSpy.mockRestore();
        });

        it('returns "Something went wrong." for other AuthError types', async () => {
            const err = new (AuthError as any)('SomethingElse');
            signIn.mockRejectedValue(err);
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            const result = await auth.authenticate(undefined, makeFormData({ email: 'x', password: 'p' }));

            expect(result).toBe('Something went wrong.');
            errSpy.mockRestore();
        });

        it('rethrows the magic NEXT_REDIRECT error so the framework can act on it', async () => {
            const redirect = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;abc' });
            signIn.mockRejectedValue(redirect);

            await expect(
                auth.authenticate(undefined, makeFormData({ email: 'x', password: 'p' })),
            ).rejects.toThrow('NEXT_REDIRECT');
        });

        it('rethrows unknown errors after logging', async () => {
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            signIn.mockRejectedValue(new Error('boom'));

            await expect(
                auth.authenticate(undefined, makeFormData({ email: 'x', password: 'p' })),
            ).rejects.toThrow('boom');
            errSpy.mockRestore();
        });
    });

    describe('logout', () => {
        it('calls signOut with redirectTo=/login', async () => {
            signOut.mockResolvedValue(undefined);
            await auth.logout();
            expect(signOut).toHaveBeenCalledWith({ redirectTo: '/login' });
        });
    });
});
