import type { ItemStatus, RequestStatus } from './types';

/**
 * Compute the request-level aggregate status from per-item states.
 *
 * Single source of truth for the aggregate rule (PRP section 4 Phase 1).
 * All Server Actions that mutate `MaintenanceRequestItem.status` must call
 * this helper inside the same `prisma.$transaction` and write the result
 * back to `MaintenanceRequest.status`. Without this discipline the
 * denormalized request status can drift from item state.
 *
 * Top-down match (first hit wins):
 *   1. cancelled  — explicit request-level cancel overrides item state
 *   2. closed     — every item terminal (closed|cancelled), at least one closed
 *   3. resolved   — every item in (resolved|closed|cancelled), at least one resolved
 *   4. in_progress — any item is in_progress
 *   5. awaiting_parts — any item is awaiting_parts AND none is in_progress
 *   6. assigned   — assignedToId set AND no item past 'open'
 *   7. open       — otherwise
 */
export function computeRequestStatus(
    items: ReadonlyArray<{ status: ItemStatus }>,
    assignedToId: number | null,
    isExplicitlyCancelled: boolean,
): RequestStatus {
    if (isExplicitlyCancelled) return 'cancelled';

    const isTerminal = (s: ItemStatus): boolean => s === 'closed' || s === 'cancelled';
    const isResolvedOrTerminal = (s: ItemStatus): boolean => s === 'resolved' || isTerminal(s);

    if (items.every((i) => isTerminal(i.status)) && items.some((i) => i.status === 'closed')) {
        return 'closed';
    }

    if (items.every((i) => isResolvedOrTerminal(i.status)) && items.some((i) => i.status === 'resolved')) {
        return 'resolved';
    }

    if (items.some((i) => i.status === 'in_progress')) return 'in_progress';

    if (items.some((i) => i.status === 'awaiting_parts')) return 'awaiting_parts';

    if (assignedToId !== null) return 'assigned';

    return 'open';
}

/**
 * `resolved` items are pending reporter verification — they have NOT yet
 * synced `inventoryItem.status` back to 'available'. Use this to gate
 * downstream "ready for use" logic.
 */
export function isPendingVerification(status: ItemStatus): boolean {
    return status === 'resolved';
}

/**
 * `closed` is the only positive terminal state — the workflow concluded
 * successfully. `cancelled` is also terminal but represents abandonment.
 */
export function isTerminalPositive(status: ItemStatus): boolean {
    return status === 'closed';
}
