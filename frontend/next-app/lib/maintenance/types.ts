/**
 * Maintenance workflow shared types.
 *
 * String-literal unions mirror the Prisma enums in
 * `backend/prisma/schema.prisma` (MaintenanceRequestStatus, MaintenanceItemStatus,
 * and the severity, priority, and category enums). Keep this file in sync with
 * those enums and with PRP section 6 (Decisions) for the state machine.
 */

export type ItemStatus =
    | 'open'
    | 'in_progress'
    | 'awaiting_parts'
    | 'resolved'
    | 'closed'
    | 'cancelled';

export type RequestStatus =
    | 'open'
    | 'assigned'
    | 'in_progress'
    | 'awaiting_parts'
    | 'resolved'
    | 'closed'
    | 'cancelled';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export type Category =
    | 'electrical'
    | 'mechanical'
    | 'software'
    | 'physical'
    | 'other';

/**
 * MaintenanceLog.action catalog. Every state transition or audit event must
 * use one of these values; new entries require a schema comment update too.
 */
export type LogAction =
    | 'created'
    | 'assigned'
    | 'unassigned'
    | 'status_changed'
    | 'item_marked_awaiting_parts'
    | 'item_resumed_work'
    | 'item_resolved'
    | 'item_approved'
    | 'item_rejected'
    | 'request_resolved'
    | 'request_closed'
    | 'reopened'
    | 'cancelled'
    | 'escalated'
    | 'deleted'
    | 'restored'
    | 'note_added';

export const ITEM_STATUSES = [
    'open',
    'in_progress',
    'awaiting_parts',
    'resolved',
    'closed',
    'cancelled',
] as const satisfies readonly ItemStatus[];

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const satisfies readonly Severity[];

export const PRIORITY_LEVELS = ['low', 'normal', 'high', 'urgent'] as const satisfies readonly Priority[];

export const CATEGORIES = ['electrical', 'mechanical', 'software', 'physical', 'other'] as const satisfies readonly Category[];
