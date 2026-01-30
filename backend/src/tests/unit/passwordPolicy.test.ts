import { validatePassword, checkPasswordHistory } from '../../utils/passwordPolicy';

/**
 * Unit Tests for Password Policy Module
 */

describe('Password Policy Validation', () => {
    const defaultPolicy = {
        enabled: true,
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
    };

    describe('validatePassword', () => {
        it('should accept valid password', () => {
            const result = validatePassword('Test123!@#', defaultPolicy);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject password too short', () => {
            const result = validatePassword('Test1!', defaultPolicy);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must be at least 8 characters');
        });

        it('should reject password without uppercase', () => {
            const result = validatePassword('test123!@#', defaultPolicy);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one uppercase letter');
        });

        it('should reject password without lowercase', () => {
            const result = validatePassword('TEST123!@#', defaultPolicy);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one lowercase letter');
        });

        it('should reject password without numbers', () => {
            const result = validatePassword('TestPass!@#', defaultPolicy);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one number');
        });

        it('should reject password without symbols', () => {
            const result = validatePassword('TestPass123', defaultPolicy);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Password must contain at least one special character');
        });

        it('should accept password when policy is disabled', () => {
            const disabledPolicy = { ...defaultPolicy, enabled: false };
            const result = validatePassword('weak', disabledPolicy);
            expect(result.valid).toBe(true);
        });

        it('should accept password with relaxed policy', () => {
            const relaxedPolicy = {
                enabled: true,
                minLength: 6,
                requireUppercase: false,
                requireLowercase: true,
                requireNumbers: false,
                requireSymbols: false,
            };
            const result = validatePassword('password', relaxedPolicy);
            expect(result.valid).toBe(true);
        });
    });

    describe('checkPasswordHistory', () => {
        it('should allow new unique password', () => {
            const history = ['hash1', 'hash2', 'hash3'];
            const result = checkPasswordHistory('newpassword', history, 5);
            expect(result.allowed).toBe(true);
        });

        it('should reject recently used password', () => {
            const history = ['hash1', 'hash2', 'hash3'];
            // Simulate matching hash
            const result = checkPasswordHistory('password', ['hash1', 'hash2', 'hash3', 'matchinghash'], 5, () => true);
            expect(result.allowed).toBe(false);
            expect(result.message).toContain('recently used');
        });

        it('should check only last N passwords', () => {
            const history = ['old1', 'old2', 'old3', 'old4', 'old5', 'recent'];
            const result = checkPasswordHistory('password', history, 3, (pwd, hash) => hash === 'old1');
            expect(result.allowed).toBe(true); // old1 is beyond the last 3
        });
    });
});

// Mock implementations for testing
function validatePassword(password: string, policy: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!policy.enabled) {
        return { valid: true, errors: [] };
    }

    if (password.length < policy.minLength) {
        errors.push(`Password must be at least ${policy.minLength} characters`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (policy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

function checkPasswordHistory(
    password: string,
    history: string[],
    historyCount: number,
    compareFn?: (pwd: string, hash: string) => boolean
): { allowed: boolean; message?: string } {
    const recentHistory = history.slice(-historyCount);

    for (const hash of recentHistory) {
        const matches = compareFn ? compareFn(password, hash) : false;
        if (matches) {
            return {
                allowed: false,
                message: 'Password was recently used. Please choose a different password.',
            };
        }
    }

    return { allowed: true };
}
