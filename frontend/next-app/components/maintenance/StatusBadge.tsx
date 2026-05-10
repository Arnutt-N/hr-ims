import { cn } from '@/lib/utils';
import type { ItemStatus, RequestStatus } from '@/lib/maintenance/types';

/**
 * Atomic status badge for both item-level (6 states) and request-level
 * (7 states) maintenance statuses. PRP v6 — Phase 3.
 *
 * Palette is colorblind-aware: uses both background hue AND label text
 * (no icon-only variants). Critical for WCAG AA + the v3 awaiting_parts
 * + v4 priority decisions where amber is meaningful.
 */

const ITEM_PALETTE: Record<ItemStatus, string> = {
    open: 'bg-slate-100 text-slate-700 ring-slate-200',
    in_progress: 'bg-blue-100 text-blue-800 ring-blue-200',
    awaiting_parts: 'bg-amber-100 text-amber-800 ring-amber-200',
    resolved: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    closed: 'bg-slate-200 text-slate-600 ring-slate-300',
    cancelled: 'bg-red-100 text-red-700 ring-red-200',
};

const REQUEST_PALETTE: Record<RequestStatus, string> = {
    ...ITEM_PALETTE,
    assigned: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
};

const ITEM_LABELS: Record<ItemStatus, string> = {
    open: 'รอดำเนินการ',
    in_progress: 'กำลังซ่อม',
    awaiting_parts: 'รออะไหล่',
    resolved: 'รอตรวจรับ',
    closed: 'ปิดงาน',
    cancelled: 'ยกเลิก',
};

const REQUEST_LABELS: Record<RequestStatus, string> = {
    ...ITEM_LABELS,
    assigned: 'มอบหมายแล้ว',
};

interface StatusBadgeProps {
    status: ItemStatus | RequestStatus;
    level?: 'item' | 'request';
    className?: string;
}

export function StatusBadge({ status, level = 'item', className }: StatusBadgeProps) {
    const palette = level === 'request' ? REQUEST_PALETTE : ITEM_PALETTE;
    const labels = level === 'request' ? REQUEST_LABELS : ITEM_LABELS;
    const colorClass = (palette as Record<string, string>)[status] ?? 'bg-slate-100 text-slate-700 ring-slate-200';
    const label = (labels as Record<string, string>)[status] ?? status;

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                colorClass,
                className,
            )}
        >
            {label}
        </span>
    );
}
