import type { ItemStatus } from './types';

/**
 * Item-level state transition table (PRP v6 — section 6 state machine).
 *
 * Exhaustive Record means TypeScript fails to compile if a state is missed
 * after a future enum addition. Allowed pairs are derived directly from the
 * decision matrix in PRP section 6.
 *
 * Key semantics:
 *   - `resolved → in_progress` is allowed only via `rejectItemResolution`
 *     Server Action (reporter-driven; carries a `rejectionReason`).
 *   - `resolved → closed` is allowed only via `approveItemResolution` Server
 *     Action (reporter-driven; sets `closedAt` + may sync inventoryItem.status).
 *   - `closed → in_progress` is allowed only via `reopenMaintenanceRequest`
 *     (admin-only).
 *   - `cancelled` is fully terminal — admin reopen on a cancelled request
 *     bumps items back to `in_progress`, not `cancelled → anything`.
 */
export const ALLOWED_ITEM_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
    open: ['in_progress', 'cancelled'],
    in_progress: ['awaiting_parts', 'resolved', 'cancelled'],
    awaiting_parts: ['in_progress', 'resolved', 'cancelled'],
    resolved: ['closed', 'in_progress', 'cancelled'],
    closed: ['in_progress'],
    cancelled: [],
};

export class IllegalItemTransitionError extends Error {
    constructor(public readonly from: ItemStatus, public readonly to: ItemStatus) {
        super(`Illegal item transition: ${from} → ${to}`);
        this.name = 'IllegalItemTransitionError';
    }
}

export function assertValidItemTransition(from: ItemStatus, to: ItemStatus): void {
    if (!ALLOWED_ITEM_TRANSITIONS[from].includes(to)) {
        throw new IllegalItemTransitionError(from, to);
    }
}

export function isItemTransitionAllowed(from: ItemStatus, to: ItemStatus): boolean {
    return ALLOWED_ITEM_TRANSITIONS[from].includes(to);
}
