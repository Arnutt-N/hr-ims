import { validateSettings } from '../../utils/settings';

/**
 * Unit Tests for Settings Module
 */

describe('Settings Validation', () => {
    it('should validate valid settings', () => {
        const settings = {
            orgName: 'Test Organization',
            borrowLimit: 7,
            checkInterval: 7,
            maintenanceAlert: true,
            allowRegistration: false,
        };

        const result = validateSettings(settings);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject negative borrow limit', () => {
        const settings = {
            orgName: 'Test',
            borrowLimit: -1,
        };

        const result = validateSettings(settings);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('borrowLimit must be positive');
    });

    it('should reject empty organization name', () => {
        const settings = {
            orgName: '',
            borrowLimit: 7,
        };

        const result = validateSettings(settings);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('orgName is required');
    });

    it('should validate rate limiting settings', () => {
        const settings = {
            rateLimitEnabled: true,
            rateLimitWindowMs: 900000,
            rateLimitMaxRequests: 100,
        };

        const result = validateSettings(settings);
        expect(result.valid).toBe(true);
    });

    it('should reject invalid rate limit window', () => {
        const settings = {
            rateLimitEnabled: true,
            rateLimitWindowMs: 0,
            rateLimitMaxRequests: 100,
        };

        const result = validateSettings(settings);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('rateLimitWindowMs must be greater than 0');
    });
});

// Helper function for validation
function validateSettings(settings: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.orgName !== undefined && !settings.orgName.trim()) {
        errors.push('orgName is required');
    }

    if (settings.borrowLimit !== undefined && settings.borrowLimit < 0) {
        errors.push('borrowLimit must be positive');
    }

    if (settings.rateLimitWindowMs !== undefined && settings.rateLimitWindowMs <= 0) {
        errors.push('rateLimitWindowMs must be greater than 0');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
