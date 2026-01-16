'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

// Get Current User's Assets
export async function getMyAssets() {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                heldItems: true
            }
        });

        if (!user) return { error: 'User not found' };

        // Enrich with borrow date from Request (more accurate than History)
        const assetsWithHistory = await Promise.all(user.heldItems.map(async (item) => {
            // Find active borrow request
            const activeBorrow = await prisma.request.findFirst({
                where: {
                    userId: user.id,
                    type: 'borrow',
                    status: 'approved',
                    requestItems: { some: { itemId: item.id } }
                },
                orderBy: { date: 'desc' }
            });

            // Check if there is a pending return request
            const activeReturn = await prisma.request.findFirst({
                where: {
                    userId: user.id,
                    type: 'return',
                    status: 'pending',
                    requestItems: { some: { itemId: item.id } }
                }
            });

            return {
                ...item,
                borrowDate: activeBorrow?.date || item.updatedAt,
                dueDate: activeBorrow?.dueDate || null,
                isOverdue: activeBorrow?.isOverdue || false,
                lastCheckDate: (await prisma.history.findFirst({
                    where: { userId: user.id, item: item.name, action: 'check' },
                    orderBy: { date: 'desc' }
                }))?.date || null,
                isReturning: !!activeReturn
            };
        }));

        return { success: true, assets: assetsWithHistory };
    } catch (error) {
        console.error('Failed to fetch assets:', error);
        return { error: 'Failed to fetch assets' };
    }
}

// Check-in (Verify) Asset
export async function checkInAsset(itemId: number) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
        if (!item) return { error: 'Item not found' };

        // Log check in history
        await prisma.history.create({
            data: {
                userId: parseInt(session.user.id || '0'),
                action: 'check',
                item: item.name,
                status: 'verified',
            }
        });

        revalidatePath('/my-assets');
        return { success: true };
    } catch (error) {
        return { error: 'Check-in failed' };
    }
}

// Request Return
export async function requestReturn(itemId: number) {
    const session = await auth();
    if (!session?.user?.email) return { error: 'Unauthorized' };

    try {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } });
        if (!user) return { error: 'User not found' };

        // Create return request
        await prisma.request.create({
            data: {
                userId: user.id,
                type: 'return',
                status: 'pending',
                requestItems: {
                    create: {
                        itemId: itemId,
                        quantity: 1
                    }
                }
            }
        });

        revalidatePath('/my-assets');
        return { success: true };
    } catch (error) {
        return { error: 'Return request failed' };
    }
}

// Report Issue
export async function reportIssue(itemId: number, issue: string) {
    const session = await auth();
    if (!session) return { error: 'Unauthorized' };

    // Update item status/log?
    // For now, just log history
    try {
        const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
        if (!item) return { error: 'Item not found' };

        await prisma.history.create({
            data: {
                userId: parseInt(session.user.id || '0'),
                action: 'report',
                item: item.name + ` (${issue})`,
                status: 'issue_reported'
            }
        });

        // Update item status
        await prisma.inventoryItem.update({
            where: { id: itemId },
            data: { status: 'issue_reported' }
        });

        revalidatePath('/my-assets');
        return { success: true };
    } catch (error) {
        return { error: 'Report failed' };
    }
}
