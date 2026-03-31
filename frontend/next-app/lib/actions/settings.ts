'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSessionRoles, requireRole, SUPERADMIN_ONLY } from '@/lib/auth-guards';

const settingsSchema = z.object({
    orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
    borrowLimit: z.number().int().min(1).max(365, 'Borrow limit must be between 1 and 365 days'),
    checkInterval: z.number().int().min(1).max(90, 'Check interval must be between 1 and 90 days'),
    maintenanceAlert: z.boolean(),
    allowRegistration: z.boolean(),
    footerText: z.string().max(200, 'Footer text must be under 200 characters').optional()
});

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'test-internal-key';
type SettingsPayload = z.infer<typeof settingsSchema>;
type AuthorizedSession = {
    user: {
        id: string;
        email?: string | null;
        role?: string | null;
        roles?: string[] | null;
    };
};

function backendHeaders(session: AuthorizedSession) {
    const roles = getSessionRoles(session);

    return {
        'Content-Type': 'application/json',
        'x-user-id': session.user.id || '',
        'x-user-role': roles.join(',') || session.user.role || '',
        'x-internal-key': INTERNAL_API_KEY,
    };
}

export async function getSettings() {
    const session = await requireRole(...SUPERADMIN_ONLY);
    if (!session?.user?.email || !session.user.id) return { error: 'Unauthorized' };

    try {
        const response = await fetch(`${BACKEND_URL}/api/settings`, {
            method: 'GET',
            headers: backendHeaders(session),
            cache: 'no-store',
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return {
                error: payload.error || payload.message || 'Failed to fetch settings',
            };
        }

        return { success: true, settings: payload };
    } catch (error) {
        console.error('Failed to fetch settings:', error);
        return { error: 'Failed to fetch settings' };
    }
}

export async function updateSettings(id: number, data: any) {
    const session = await requireRole(...SUPERADMIN_ONLY);
    if (!session?.user?.email || !session.user.id) return { error: 'Unauthorized' };

    try {
        // Validate
        const validated: SettingsPayload = settingsSchema.parse(data);

        const response = await fetch(`${BACKEND_URL}/api/settings`, {
            method: 'PUT',
            headers: backendHeaders(session),
            body: JSON.stringify(validated),
            cache: 'no-store',
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            return {
                error: payload.error || payload.message || 'Failed to update settings',
            };
        }

        revalidatePath('/settings');
        return { success: true, settings: payload.settings || validated };
    } catch (error) {
        if (error instanceof z.ZodError) {
            return { error: error.issues[0].message };
        }
        console.error('Failed to update settings:', error);
        return { error: 'Failed to update settings' };
    }
}
