'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// JWT strategy — no database Session model. Revocation works by incrementing tokenVersion.

export async function getActiveSessions() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

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

async function invalidateTokenVersion() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: { tokenVersion: { increment: 1 } }
        });
        revalidatePath('/settings/sessions');
        return { success: true };
    } catch (error) {
        console.error('Failed to revoke sessions:', error);
        return { error: 'Failed to revoke sessions' };
    }
}

// Both operations are identical for JWT: increment tokenVersion to invalidate all tokens
export async function revokeSession(_id: string) {
    return invalidateTokenVersion();
}

export async function revokeAllOtherSessions() {
    return invalidateTokenVersion();
}
