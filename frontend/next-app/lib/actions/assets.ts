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
    } catch {
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
    } catch {
        return { error: 'Return request failed' };
    }
}

// Report Issue (legacy single-item entry point)
//
// PRP v6 commit #12: this wrapper now delegates to the proper maintenance
// workflow's createMaintenanceRequest. The /my-assets page still calls
// reportIssue(itemId, issueText) — this preserves that contract while
// routing the data through the new MaintenanceRequest table.
//
// Phase 3 will replace the call site (/my-assets) with the proper modal
// RequestForm; once that lands, this wrapper can be removed entirely.
export async function reportIssue(itemId: number, issue: string) {
    const session = await auth();
    if (!session) return { error: 'Unauthorized' };

    try {
        const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
        if (!item) return { error: 'Item not found' };

        // History entry preserved for the existing /history view (legacy log).
        await prisma.history.create({
            data: {
                userId: parseInt(session.user.id || '0'),
                action: 'report',
                item: item.name + ` (${issue})`,
                status: 'issue_reported',
            },
        });

        // Try the new maintenance workflow first; fall back to the legacy
        // status flip if it rejects or throws. Inner try/catch isolates the
        // delegate failure so we don't bubble up a misleading "Report failed".
        let delegated = false;
        try {
            const { createMaintenanceRequest } = await import('@/lib/actions/maintenance');
            const result = await createMaintenanceRequest({
                itemIds: [itemId],
                title: `Issue reported: ${item.name}`,
                description: issue,
                severity: 'medium',
                priority: 'normal',
                category: 'other',
            });
            delegated = 'success' in result && result.success === true;
        } catch (delegateErr) {
            console.warn('reportIssue: createMaintenanceRequest delegate failed, using legacy fallback', delegateErr);
        }

        if (!delegated) {
            // Legacy fallback: direct status flip preserves the contract that
            // /my-assets has relied on since before the new workflow.
            await prisma.inventoryItem.update({
                where: { id: itemId },
                data: { status: 'issue_reported' },
            });
        }

        revalidatePath('/my-assets');
        return { success: true };
    } catch {
        return { error: 'Report failed' };
    }
}
