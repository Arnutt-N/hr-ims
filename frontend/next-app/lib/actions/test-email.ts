'use server';

import { getSessionRoles, requireRole, SUPERADMIN_ONLY } from '@/lib/auth-guards';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function sendTestEmail() {
    const session = await requireRole(...SUPERADMIN_ONLY);
    if (!session?.user?.email || !session.user.id) {
        return { success: false, error: 'Unauthorized' };
    }

    const roles = getSessionRoles(session);

    try {
        const response = await fetch(`${BACKEND_URL}/api/email/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': session.user.id,
                'x-user-role': roles.join(',') || session.user.role || '',
                'x-internal-key': process.env.INTERNAL_API_KEY || '',
            },
            body: JSON.stringify({ email: session.user.email }),
            cache: 'no-store',
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                success: false,
                error: payload.error || payload.message || 'Failed to send test email',
            };
        }

        return {
            success: true,
            message: payload.message || 'Test email sent successfully',
        };
    } catch (error) {
        console.error('Test email failed:', error);
        return { success: false, error: 'Failed to send test email' };
    }
}
