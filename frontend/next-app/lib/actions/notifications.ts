'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function getNotifications() {
    const session = await auth();
    if (!session || !session.user || !session.user.id) return [];

    try {
        const notifications = await prisma.notification.findMany({
            where: {
                userId: parseInt(session.user.id),
                read: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 10,
        });

        return notifications;
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        return [];
    }
}

export async function markAsRead(id: number) {
    const session = await auth();
    if (!session || !session.user) return { success: false };

    try {
        await prisma.notification.update({
            where: { id },
            data: { read: true },
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function markAllAsRead() {
    const session = await auth();
    if (!session || !session.user || !session.user.id) return { success: false };

    try {
        await prisma.notification.updateMany({
            where: {
                userId: parseInt(session.user.id),
                read: false,
            },
            data: { read: true },
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function createNotification(userId: number, text: string) {
    try {
        await prisma.notification.create({
            data: {
                userId,
                text,
                read: false,
            },
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to create notification:', error);
        return { success: false };
    }
}
