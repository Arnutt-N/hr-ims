'use client';

import { useEffect, useState, useCallback, useTransition, use } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Printer, RotateCcw, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { PageLoader } from '@/components/ui/page-loader';
import { StatusBadge } from '@/components/maintenance/StatusBadge';
import { SeverityIcon, PriorityBadge } from '@/components/maintenance/SeverityIcon';
import { PhotoGallery } from '@/components/maintenance/PhotoGallery';
import { RequestItemRow } from '@/components/maintenance/RequestItemRow';
import { CancelRequestDialog, DeleteRequestDialog } from '@/components/maintenance/dialogs';
import { WatchButton } from '@/components/maintenance/WatchButton';
import type { ItemStatus, RequestStatus, Severity, Priority } from '@/lib/maintenance/types';

interface DetailPageProps {
    params: Promise<{ id: string }>;
}

interface MaintenanceLog {
    id: number;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    notes: string | null;
    itemId: number | null;
    createdAt: Date | string;
    user: { id: number; name: string | null };
}

interface MaintenanceItem {
    id: number;
    status: ItemStatus;
    version: number;
    resolution: string | null;
    rejectionReason: string | null;
    actualCost: number | null;
    item: { id: number; name: string; serial: string | null; image: string | null };
}

interface MaintenanceRequestDetail {
    id: number;
    title: string;
    description: string;
    status: RequestStatus | string;
    severity: Severity | string;
    priority: Priority | string;
    category: string;
    tags: string | null;
    photos: string | null;
    estimatedCost: number | null;
    createdAt: Date | string;
    closedAt: Date | string | null;
    deletedAt: Date | string | null;
    items: MaintenanceItem[];
    logs: MaintenanceLog[];
    reportedBy: { id: number; name: string | null } | null;
    assignedTo: { id: number; name: string | null } | null;
    location: { id: number; name: string } | null;
    reportedById: number;
    assignedToId: number | null;
}

const ACTION_LABELS: Record<string, string> = {
    created: '✏️ สร้างคำขอ',
    assigned: '👤 มอบหมาย',
    unassigned: '👤 ยกเลิกมอบหมาย',
    status_changed: '🔄 เปลี่ยนสถานะ',
    item_marked_awaiting_parts: '⏸️ รออะไหล่',
    item_resumed_work: '▶️ กลับมาทำงาน',
    item_resolved: '✅ ช่างบันทึกซ่อมเสร็จ',
    item_approved: '✓ ผู้แจ้งตรวจรับ',
    item_rejected: '✗ ผู้แจ้งปฏิเสธ',
    request_resolved: '✅ ทั้งคำขอ: รอตรวจรับ',
    request_closed: '🎉 ทั้งคำขอ: ปิดงาน',
    reopened: '🔁 เปิดงานใหม่',
    cancelled: '🚫 ยกเลิก',
    escalated: '⏰ ส่งต่อผู้บริหาร',
    deleted: '🗑️ ลบ',
    restored: '↩️ กู้คืน',
    note_added: '📝 บันทึกหมายเหตุ',
};

export default function MaintenanceDetailPage({ params }: DetailPageProps) {
    const { id: idStr } = use(params);
    const requestId = Number.parseInt(idStr, 10);
    const { data: session } = useSession();
    const [request, setRequest] = useState<MaintenanceRequestDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pending, startTransition] = useTransition();

    const userId = session?.user?.id ? Number.parseInt(session.user.id, 10) : 0;
    const roles = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
    const isAdmin = roles.includes('admin') || roles.includes('superadmin');
    const isReporter = !!request && request.reportedById === userId;
    const isAssignee = !!request && request.assignedToId === userId;

    // Snapshot Date.now() once on mount — calling Date.now() during render
    // violates react-hooks/purity (see ESLint rule). The 1-hour reporter
    // cancel window is computed against this snapshot. If user keeps the
    // page open past the boundary, they see a stale 'can cancel' state for
    // a few seconds; reload corrects it. Acceptable trade-off.
    const [mountTimestamp, setMountTimestamp] = useState<number | null>(null);
    useEffect(() => {
        setMountTimestamp(Date.now());
    }, []);

    const load = useCallback(async () => {
        if (Number.isNaN(requestId)) return;
        setLoading(true);
        try {
            const { getMaintenanceRequest } = await import('@/lib/actions/maintenance');
            const r = await getMaintenanceRequest(requestId);
            if (r && 'request' in r && r.request) {
                setRequest(r.request as MaintenanceRequestDetail);
            } else {
                toast.error(('error' in r && r.error) || 'ไม่พบคำขอ');
                setRequest(null);
            }
        } finally {
            setLoading(false);
        }
    }, [requestId]);

    useEffect(() => {
        void load();
    }, [load]);

    const reopenRequest = () => {
        const reason = window.prompt('เหตุผลการเปิดงานใหม่:');
        if (!reason || !reason.trim()) return;
        startTransition(async () => {
            const { reopenMaintenanceRequest } = await import('@/lib/actions/maintenance');
            const r = await reopenMaintenanceRequest({ requestId, reason: reason.trim() });
            if ('success' in r && r.success) {
                toast.success('เปิดงานใหม่แล้ว');
                void load();
            } else {
                toast.error(('error' in r && r.error) || 'เปิดใหม่ไม่สำเร็จ');
            }
        });
    };

    if (loading) return <PageLoader />;
    if (!request) {
        return (
            <div className="max-w-2xl mx-auto py-12 text-center text-slate-600">
                <p>ไม่พบคำขอนี้ หรือคุณไม่มีสิทธิ์เข้าถึง</p>
                <Link href="/maintenance" className="text-indigo-600 hover:underline">
                    ← กลับรายการ
                </Link>
            </div>
        );
    }

    const tags = (() => {
        if (!request.tags) return [] as string[];
        try {
            const p = JSON.parse(request.tags);
            return Array.isArray(p) ? p.filter((t): t is string => typeof t === 'string') : [];
        } catch {
            return [];
        }
    })();

    const isTerminal = request.status === 'closed' || request.status === 'cancelled';
    const canCancelAsReporter =
        isReporter &&
        !isTerminal &&
        mountTimestamp !== null &&
        mountTimestamp - new Date(request.createdAt).getTime() < 60 * 60 * 1000;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <Link href="/maintenance" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600">
                <ArrowLeft size={14} /> กลับรายการ
            </Link>

            {/* Header */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <StatusBadge status={request.status as RequestStatus} level="request" />
                            <SeverityIcon severity={request.severity as Severity} showLabel />
                            <PriorityBadge priority={request.priority as Priority} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{request.title}</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            #{request.id} • โดย {request.reportedBy?.name ?? 'Unknown'}
                            {request.assignedTo && ` → ${request.assignedTo.name ?? 'Unknown'}`}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2">
                        <WatchButton requestId={request.id} />
                        <Link href={`/maintenance/${request.id}/print`} target="_blank">
                            <Button variant="outline" size="sm" className="w-full">
                                <Printer size={14} className="mr-1.5" /> พิมพ์
                            </Button>
                        </Link>
                    </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{request.description}</p>

                {/* Meta strip */}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    {request.location && (
                        <span className="inline-flex items-center gap-1">
                            <MapPin size={12} /> {request.location.name}
                        </span>
                    )}
                    {request.estimatedCost !== null && (
                        <span>ประมาณ {request.estimatedCost.toLocaleString()} บาท</span>
                    )}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {tags.map((t) => (
                                <span key={t} className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Photos */}
                {request.photos && (
                    <div className="mt-4">
                        <PhotoGallery photos={request.photos} />
                    </div>
                )}

                {/* Action panel */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {isAdmin && !isTerminal && !request.assignedTo && (
                        <Button size="sm" variant="outline" disabled={pending}>
                            <UserPlus size={14} className="mr-1.5" /> มอบหมาย (ไป /settings)
                        </Button>
                    )}
                    {isAdmin && request.status === 'closed' && (
                        <Button size="sm" variant="outline" onClick={reopenRequest} disabled={pending}>
                            <RotateCcw size={14} className="mr-1.5" /> เปิดงานใหม่
                        </Button>
                    )}
                    {(canCancelAsReporter || isAdmin) && !isTerminal && (
                        <Button size="sm" variant="outline" onClick={() => setCancelOpen(true)} disabled={pending}>
                            <X size={14} className="mr-1.5" /> ยกเลิกคำขอ
                        </Button>
                    )}
                    {isAdmin && !request.deletedAt && (
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setDeleteOpen(true)} disabled={pending}>
                            <Trash2 size={14} className="mr-1.5" /> ลบ
                        </Button>
                    )}
                </div>
            </div>

            {/* Items section */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">
                    อุปกรณ์ ({request.items.length})
                </h2>
                <div className="space-y-3">
                    {request.items.map((it) => (
                        <RequestItemRow
                            key={it.id}
                            requestId={request.id}
                            item={it}
                            isAssignee={isAssignee}
                            isReporter={isReporter}
                            isAdmin={isAdmin}
                            onChange={() => void load()}
                        />
                    ))}
                </div>
            </div>

            {/* Logs timeline */}
            <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-3">ประวัติ</h2>
                <ol className="relative border-l-2 border-slate-200 pl-6 space-y-4">
                    {request.logs.map((log) => (
                        <li key={log.id} className="relative">
                            <div className="absolute -left-[34px] top-1.5 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-white" />
                            <div className="text-sm">
                                <div className="font-medium text-slate-900">
                                    {ACTION_LABELS[log.action] ?? log.action}
                                    {log.fromStatus && log.toStatus && (
                                        <span className="ml-2 text-xs text-slate-500">
                                            ({log.fromStatus} → {log.toStatus})
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-600">
                                    {log.user.name ?? 'Unknown'} •{' '}
                                    {new Date(log.createdAt).toLocaleString('th-TH')}
                                </div>
                                {log.notes && (
                                    <div className="mt-1 text-sm text-slate-700 bg-slate-50 rounded p-2">
                                        {log.notes}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            </div>

            <CancelRequestDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                requestId={request.id}
                hasResolvedItems={request.items.some((i) => i.status === 'resolved' || i.status === 'closed')}
                onSuccess={() => void load()}
            />
            <DeleteRequestDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                requestId={request.id}
                onSuccess={() => {
                    // After delete, navigate back to list
                    window.location.href = '/maintenance';
                }}
            />
        </div>
    );
}
