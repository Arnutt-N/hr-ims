'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// The app uses JWT strategy — active sessions are tracked via tokenVersion.
// There is no database Session model; session revocation is done by incrementing tokenVersion.

export async function getActiveSessions() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // JWT sessions are stateless — return the current session info only
    return {
        success: true,
        sessions: [{
            id: 'current',
            userId: parseInt(session.user.id),
            active: true,
            role: session.user.role,
        }]
    };
}

export async function revokeSession(_id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // For JWT, revoking a specific session requires incrementing tokenVersion
    // which invalidates ALL sessions for this user (JWT is stateless)
    try {
        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: { tokenVersion: { increment: 1 } }
        });

        revalidatePath('/settings/sessions');
        return { success: true };
    } catch (error) {
        console.error('Failed to revoke session:', error);
        return { error: 'Failed to revoke session' };
    }
}

export async function revokeAllOtherSessions() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    // Invalidate all sessions by incrementing tokenVersion
    try {
        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: { tokenVersion: { increment: 1 } }
        });

        revalidatePath('/settings/sessions');
        return { success: true };
    } catch (error) {
        console.error('Failed to revoke all sessions:', error);
        return { error: 'Failed to revoke all sessions' };
    }
}
