import bcrypt from 'bcrypt';

import {
    calculatePasswordStrength,
    createPasswordSchema,
    getPasswordRequirements,
    isPasswordExpired,
    isPasswordReused,
    savePasswordToHistory,
    validatePassword,
} from '../../utils/passwordPolicy';
import { getPasswordPolicySettings } from '../../utils/settings';
import prisma from '../../utils/prisma';

jest.mock('bcrypt', () => ({
    __esModule: true,
    default: {
        compare: jest.fn(),
    },
}));

jest.mock('../../utils/settings', () => ({
    __esModule: true,
    getPasswordPolicySettings: jest.fn(),
}));

jest.mock('../../utils/prisma', () => ({
    __esModule: true,
    default: {
        passwordHistory: {
            findMany: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

const mockedGetPasswordPolicySettings = getPasswordPolicySettings as jest.MockedFunction<
    typeof getPasswordPolicySettings
>;
const mockedBcryptCompare = bcrypt.compare as unknown as jest.Mock;
const mockedPrisma = prisma as unknown as {
    passwordHistory: {
        findMany: jest.Mock;
        create: jest.Mock;
        delete: jest.Mock;
    };
};

describe('Password Policy Service', () => {
    const baseSettings = {
        enabled: true,
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        expiryDays: 30,
        historyCount: 3,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetPasswordPolicySettings.mockResolvedValue({ ...baseSettings });
    });

    describe('validatePassword', () => {
        it('accepts a strong password when policy is enabled', async () => {
            const result = await validatePassword('TestPassword123!@#');

            expect(result).toEqual({
                valid: true,
                errors: [],
                strength: 'strong',
            });
        });

        it('returns the real validation errors from the service', async () => {
            const result = await validatePassword('weak');

            expect(result.valid).toBe(false);
            expect(result.errors).toEqual([
                'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร',
                'รหัสผ่านต้องมีตัวพิมพ์ใหญ่ (A-Z)',
                'รหัสผ่านต้องมีตัวเลข (0-9)',
                'รหัสผ่านต้องมีอักขระพิเศษ (!@#$%^&*)',
            ]);
            expect(result.strength).toBe('weak');
        });

        it('short-circuits when the policy is disabled', async () => {
            mockedGetPasswordPolicySettings.mockResolvedValue({
                ...baseSettings,
                enabled: false,
            });

            const result = await validatePassword('weak');

            expect(result).toEqual({
                valid: true,
                errors: [],
                strength: 'good',
            });
        });
    });

    describe('calculatePasswordStrength', () => {
        it('classifies password strength using the implementation score', () => {
            expect(calculatePasswordStrength('weak')).toBe('weak');
            expect(calculatePasswordStrength('Password1')).toBe('good');
            expect(calculatePasswordStrength('Password123!@#LongEnough')).toBe('strong');
        });
    });

    describe('isPasswordReused', () => {
        it('returns false when password history is disabled', async () => {
            mockedGetPasswordPolicySettings.mockResolvedValue({
                ...baseSettings,
                historyCount: 0,
            });

            await expect(isPasswordReused(1, 'NewPassword123!')).resolves.toBe(false);
            expect(mockedPrisma.passwordHistory.findMany).not.toHaveBeenCalled();
        });

        it('returns true when the password matches one of the recent hashes', async () => {
            mockedPrisma.passwordHistory.findMany.mockResolvedValue([
                { id: 1, password: 'hash-1' },
                { id: 2, password: 'hash-2' },
            ]);
            mockedBcryptCompare.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

            await expect(isPasswordReused(42, 'NewPassword123!')).resolves.toBe(true);
            expect(mockedPrisma.passwordHistory.findMany).toHaveBeenCalledWith({
                where: { userId: 42 },
                orderBy: { createdAt: 'desc' },
                take: 3,
            });
            expect(mockedBcryptCompare).toHaveBeenNthCalledWith(1, 'NewPassword123!', 'hash-1');
            expect(mockedBcryptCompare).toHaveBeenNthCalledWith(2, 'NewPassword123!', 'hash-2');
        });

        it('returns false when no history entry matches', async () => {
            mockedPrisma.passwordHistory.findMany.mockResolvedValue([
                { id: 1, password: 'hash-1' },
            ]);
            mockedBcryptCompare.mockResolvedValue(false);

            await expect(isPasswordReused(42, 'NewPassword123!')).resolves.toBe(false);
        });
    });

    describe('savePasswordToHistory', () => {
        it('stores the new hash and trims history beyond the configured limit', async () => {
            mockedPrisma.passwordHistory.findMany.mockResolvedValue([
                { id: 11, password: 'old-hash-1' },
                { id: 12, password: 'old-hash-2' },
            ]);

            await savePasswordToHistory(7, 'new-hash');

            expect(mockedPrisma.passwordHistory.create).toHaveBeenCalledWith({
                data: {
                    userId: 7,
                    password: 'new-hash',
                },
            });
            expect(mockedPrisma.passwordHistory.findMany).toHaveBeenCalledWith({
                where: { userId: 7 },
                orderBy: { createdAt: 'desc' },
                skip: 3,
            });
            expect(mockedPrisma.passwordHistory.delete).toHaveBeenNthCalledWith(1, {
                where: { id: 11 },
            });
            expect(mockedPrisma.passwordHistory.delete).toHaveBeenNthCalledWith(2, {
                where: { id: 12 },
            });
        });

        it('does nothing when history retention is disabled', async () => {
            mockedGetPasswordPolicySettings.mockResolvedValue({
                ...baseSettings,
                historyCount: 0,
            });

            await savePasswordToHistory(7, 'new-hash');

            expect(mockedPrisma.passwordHistory.create).not.toHaveBeenCalled();
            expect(mockedPrisma.passwordHistory.findMany).not.toHaveBeenCalled();
        });
    });

    describe('isPasswordExpired', () => {
        it('uses the configured expiry window', async () => {
            // Use relative dates so this test does not bit-rot as time moves forward.
            // Previous version used hardcoded dates (2026-01-01 / 2026-03-01) which
            // silently expired ~2 months after being written.
            const ONE_HOUR_MS = 60 * 60 * 1000;
            const ONE_DAY_MS = 24 * ONE_HOUR_MS;
            const oldDate = new Date(Date.now() - 10 * ONE_DAY_MS); // 10 days ago — beyond 1-day expiry
            const recentDate = new Date(Date.now() - ONE_HOUR_MS);  // 1 hour ago — within 1-day expiry

            await expect(isPasswordExpired(1, oldDate)).resolves.toBe(true);
            await expect(isPasswordExpired(1, recentDate)).resolves.toBe(false);
        });

        it('returns false when expiry is disabled or the timestamp is missing', async () => {
            mockedGetPasswordPolicySettings.mockResolvedValue({
                ...baseSettings,
                expiryDays: 0,
            });

            await expect(isPasswordExpired(1, new Date('2026-01-01T00:00:00.000Z'))).resolves.toBe(false);
            await expect(isPasswordExpired(1, null)).resolves.toBe(false);
        });
    });

    describe('createPasswordSchema', () => {
        it('builds a schema that enforces the current settings', async () => {
            const schema = await createPasswordSchema();

            expect(schema.safeParse('Password123!')).toEqual({ success: true, data: 'Password123!' });
            expect(schema.safeParse('password')).toEqual({
                success: false,
                error: expect.any(Object),
            });
        });
    });

    describe('getPasswordRequirements', () => {
        it('returns user-facing requirements derived from settings', async () => {
            const requirements = await getPasswordRequirements();

            expect(requirements).toEqual([
                'ความยาวอย่างน้อย 8 ตัวอักษร',
                'ต้องมีตัวพิมพ์ใหญ่ (A-Z)',
                'ต้องมีตัวพิมพ์เล็ก (a-z)',
                'ต้องมีตัวเลข (0-9)',
                'ต้องมีอักขระพิเศษ (!@#$%^&*)',
                'หมดอายุทุก 30 วัน',
                'ห้ามใช้รหัสผ่านเดิม 3 รุ่นล่าสุด',
            ]);
        });
    });
});
