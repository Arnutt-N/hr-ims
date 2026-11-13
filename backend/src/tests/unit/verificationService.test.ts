jest.mock('../../utils/prisma', () => ({
    __esModule: true,
    default: {
        user: { findUnique: jest.fn() },
        emailVerification: {
            deleteMany: jest.fn(),
            create: jest.fn(),
            findFirst: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock('../../utils/logger', () => ({
    logInfo: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined),
}));

import prisma from '../../utils/prisma';
import {
    createVerificationToken,
    createPasswordResetToken,
    verifyPasswordResetToken,
    verifyToken,
    usePasswordResetToken,
} from '../../services/verificationService';

describe('verificationService token type isolation (F-005)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('createVerificationToken isolates by EMAIL_VERIFICATION type', async () => {
        await createVerificationToken(10);

        expect(prisma.emailVerification.deleteMany).toHaveBeenCalledWith({
            where: { userId: 10, type: 'EMAIL_VERIFICATION' },
        });
        expect(prisma.emailVerification.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 10,
                type: 'EMAIL_VERIFICATION',
            }),
        });
    });

    test('createPasswordResetToken isolates by PASSWORD_RESET type', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 10, email: 'u@example.com' });

        await createPasswordResetToken('u@example.com');

        expect(prisma.emailVerification.deleteMany).toHaveBeenCalledWith({
            where: { userId: 10, type: 'PASSWORD_RESET' },
        });
        expect(prisma.emailVerification.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                userId: 10,
                type: 'PASSWORD_RESET',
            }),
        });
    });

    test('verifyPasswordResetToken rejects EMAIL_VERIFICATION token via type filter', async () => {
        (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await verifyPasswordResetToken('email-only-token');

        expect(prisma.emailVerification.findFirst).toHaveBeenCalledWith({
            where: { token: 'email-only-token', type: 'PASSWORD_RESET' },
        });
        expect(result.valid).toBe(false);
    });

    test('verifyToken queries only EMAIL_VERIFICATION type', async () => {
        (prisma.emailVerification.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await verifyToken('reset-only-token');

        expect(prisma.emailVerification.findFirst).toHaveBeenCalledWith({
            where: { token: 'reset-only-token', type: 'EMAIL_VERIFICATION' },
            include: { user: true },
        });
        expect(result.success).toBe(false);
    });

    test('usePasswordResetToken deletes only PASSWORD_RESET type', async () => {
        (prisma.emailVerification.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

        const ok = await usePasswordResetToken('email-only-token');

        expect(prisma.emailVerification.deleteMany).toHaveBeenCalledWith({
            where: { token: 'email-only-token', type: 'PASSWORD_RESET' },
        });
        expect(ok).toBe(false);
    });
});
