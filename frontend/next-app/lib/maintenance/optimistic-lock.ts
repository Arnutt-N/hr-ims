import type { Prisma } from '@prisma/client';

/**
 * Optimistic locking for MaintenanceRequestItem state mutations (PRP v6 Q23).
 *
 * Pattern: caller passes `expectedVersion` (read from item.version at fetch
 * time). Inside the same `prisma.$transaction`, call `assertItemVersion`
 * before any mutation. On match, mutation proceeds; on mismatch, throw
 * `OptimisticLockError` and the transaction rolls back. The mutation itself
 * must increment version atomically:
 *
 *   await assertItemVersion(tx, itemId, expectedVersion);
 *   await tx.maintenanceRequestItem.update({
 *     where: { id: itemId },
 *     data: { status: newStatus, version: { increment: 1 } },
 *   });
 *
 * Without this guard, two technicians clicking "Mark Resolved" simultaneously
 * would both succeed; the second silently overwrites the first (lost update).
 */
export class OptimisticLockError extends Error {
    constructor(
        public readonly entity: string,
        public readonly id: number,
        public readonly expected: number,
        public readonly actual: number,
    ) {
        super(
            `${entity}#${id} was modified by another user (expected version ${expected}, found ${actual}). Please refresh.`,
        );
        this.name = 'OptimisticLockError';
    }
}

export async function assertItemVersion(
    tx: Prisma.TransactionClient,
    itemId: number,
    expectedVersion: number,
): Promise<void> {
    const current = await tx.maintenanceRequestItem.findUnique({
        where: { id: itemId },
        select: { version: true },
    });
    if (!current) {
        throw new Error(`MaintenanceRequestItem#${itemId} not found`);
    }
    if (current.version !== expectedVersion) {
        throw new OptimisticLockError(
            'MaintenanceRequestItem',
            itemId,
            expectedVersion,
            current.version,
        );
    }
}
