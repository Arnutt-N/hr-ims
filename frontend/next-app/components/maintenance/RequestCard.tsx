import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Calendar, MapPin, Package, User as UserIcon } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { SeverityIcon, PriorityBadge } from './SeverityIcon';
import type { ItemStatus, RequestStatus, Severity, Priority } from '@/lib/maintenance/types';

interface RequestCardItem {
    id: number;
    status: ItemStatus;
    item: { id: number; name: string };
}

interface RequestCardProps {
    request: {
        id: number;
        title: string;
        status: RequestStatus | string;
        severity: Severity | string;
        priority: Priority | string;
        tags: string | null;
        createdAt: Date | string;
        items: RequestCardItem[];
        reportedBy?: { id: number; name: string | null } | null;
        assignedTo?: { id: number; name: string | null } | null;
        location?: { id: number; name: string } | null;
    };
    className?: string;
}

function parseTags(raw: string | null): string[] {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
    } catch {
        return [];
    }
}

function formatDate(d: Date | string): string {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function RequestCard({ request, className }: RequestCardProps) {
    const tags = parseTags(request.tags);
    const itemCount = request.items.length;
    const closedCount = request.items.filter((i) => i.status === 'closed').length;
    const resolvedCount = request.items.filter((i) => i.status === 'resolved').length;
    const inProgressCount = request.items.filter(
        (i) => i.status === 'in_progress' || i.status === 'awaiting_parts',
    ).length;

    return (
        <Link
            href={`/maintenance/${request.id}`}
            className={cn(
                'block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md',
                className,
            )}
        >
            {/* Header row: title + status badge */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{request.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">#{request.id}</p>
                </div>
                <StatusBadge status={request.status as RequestStatus} level="request" />
            </div>

            {/* Meta row: severity + priority + location */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <SeverityIcon severity={request.severity as Severity} showLabel />
                <PriorityBadge priority={request.priority as Priority} />
                {request.location && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <MapPin size={12} />
                        {request.location.name}
                    </span>
                )}
            </div>

            {/* Item count summary with mini progress */}
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                <Package size={14} />
                <span className="font-medium">{itemCount} อุปกรณ์</span>
                {(closedCount > 0 || resolvedCount > 0 || inProgressCount > 0) && (
                    <span className="text-slate-500">
                        — {closedCount > 0 && `${closedCount} ปิดงาน`}
                        {resolvedCount > 0 && `${closedCount > 0 ? ', ' : ''}${resolvedCount} รอตรวจ`}
                        {inProgressCount > 0 && `${closedCount + resolvedCount > 0 ? ', ' : ''}${inProgressCount} กำลังดำเนินการ`}
                    </span>
                )}
            </div>

            {/* Mini progress bar */}
            {itemCount > 0 && (
                <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-slate-100">
                    {closedCount > 0 && (
                        <div className="bg-emerald-500" style={{ width: `${(closedCount / itemCount) * 100}%` }} />
                    )}
                    {resolvedCount > 0 && (
                        <div className="bg-blue-400" style={{ width: `${(resolvedCount / itemCount) * 100}%` }} />
                    )}
                    {inProgressCount > 0 && (
                        <div className="bg-amber-400" style={{ width: `${(inProgressCount / itemCount) * 100}%` }} />
                    )}
                </div>
            )}

            {/* Tags row */}
            {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                    {tags.slice(0, 5).map((tag) => (
                        <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                        >
                            {tag}
                        </span>
                    ))}
                    {tags.length > 5 && (
                        <span className="text-[10px] text-slate-500">+{tags.length - 5}</span>
                    )}
                </div>
            )}

            {/* Footer: reporter + assignee + date */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                    {request.reportedBy && (
                        <span className="inline-flex items-center gap-1">
                            <UserIcon size={12} />
                            {request.reportedBy.name ?? 'Unknown'}
                        </span>
                    )}
                    {request.assignedTo && (
                        <span className="inline-flex items-center gap-1 text-indigo-600">
                            → {request.assignedTo.name ?? 'Unknown'}
                        </span>
                    )}
                </div>
                <span className="inline-flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(request.createdAt)}
                </span>
            </div>
        </Link>
    );
}
