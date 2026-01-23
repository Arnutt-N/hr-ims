'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getActiveSessions() {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        const sessions = await prisma.session.findMany({
            where: { userId: parseInt(session.user.id) },
            orderBy: { expires: 'desc' }
        });

        return { success: true, sessions };
    } catch (error) {
        console.error('Failed to fetch sessions:', error);
        return { error: 'Failed to fetch sessions' };
    }
}

export async function revokeSession(id: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Unauthorized' };

    try {
        await prisma.session.delete({
            where: { id, userId: parseInt(session.user.id) }
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

    // This is tricky for JWT. For JWT we usually increment tokenVersion.
    // For database sessions, we delete all sessions except the current one.
    // However, we don't easily know the "current" session ID in this action 
    // unless we pass it from the client (which gets it from headers if possible).

    try {
        // Option 1: Global revocation via tokenVersion
        await prisma.user.update({
            where: { id: parseInt(session.user.id) },
            data: { tokenVersion: { increment: 1 } }
        });

        // Option 2: Delete database sessions if any
        await prisma.session.deleteMany({
            where: { userId: parseInt(session.user.id) }
        });

        revalidatePath('/settings/sessions');
        return { success: true };
    } catch (error) {
        console.error('Failed to revoke all sessions:', error);
        return { error: 'Failed to revoke all sessions' };
    }
}
