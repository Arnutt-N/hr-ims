'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PageLoader } from '@/components/ui/page-loader';
import { Activity, ChevronRight } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
    created: '✏️ สร้างคำขอ',
    assigned: '👤 มอบหมาย',
    unassigned: '👤 ยกเลิกมอบหมาย',
    status_changed: '🔄 เปลี่ยนสถานะ',
    item_marked_awaiting_parts: '⏸️ รออะไหล่',
    item_resumed_work: '▶️ กลับมาทำงาน',
    item_resolved: '✅ บันทึกซ่อมเสร็จ',
    item_approved: '✓ ตรวจรับ',
    item_rejected: '✗ ปฏิเสธการแก้ไข',
    request_resolved: '✅ คำขอ: รอตรวจรับ',
    request_closed: '🎉 คำขอ: ปิดงาน',
    reopened: '🔁 เปิดงานใหม่',
    cancelled: '🚫 ยกเลิก',
    escalated: '⏰ ส่งต่อผู้บริหาร',
    deleted: '🗑️ ลบ',
    restored: '↩️ กู้คืน',
    note_added: '📝 บันทึกหมายเหตุ',
};

const ACTION_OPTIONS = [
    { value: '', label: 'ทุกประเภท' },
    ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
];

interface ActivityLog {
    id: number;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    notes: string | null;
    itemId: number | null;
    createdAt: Date | string;
    request: { id: number; title: string; status: string };
    item?: { id: number; name: string } | null;
}

interface ActivityFeedProps {
    userId: number;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionFilter, setActionFilter] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { getUserActivity } = await import('@/lib/actions/user-activity');
            const r = await getUserActivity(userId, {
                actionType: actionFilter || undefined,
                limit: 100,
            });
            if (r && 'logs' in r && Array.isArray(r.logs)) {
                setLogs(r.logs as ActivityLog[]);
            }
        } finally {
            setLoading(false);
        }
    }, [userId, actionFilter]);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <div className="space-y-4">
            {/* Filter */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <label className="text-xs font-medium text-slate-600">ประเภทกิจกรรม</label>
                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="mt-1 block w-full sm:w-64 rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                    {ACTION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* Feed */}
            {loading ? (
                <PageLoader />
            ) : logs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
                    <Activity className="mx-auto mb-3 text-slate-300" size={40} />
                    <p className="text-sm text-slate-500">ไม่มีกิจกรรมในช่วงเวลาที่เลือก</p>
                </div>
            ) : (
                <ol className="relative border-l-2 border-slate-200 pl-6 space-y-4">
                    {logs.map((log) => (
                        <li key={log.id} className="relative">
                            <div className="absolute -left-[34px] top-1.5 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-white" />
                            <Link
                                href={`/maintenance/${log.request.id}`}
                                className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-indigo-300 hover:shadow-sm transition"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-slate-900">
                                            {ACTION_LABELS[log.action] ?? log.action}
                                        </div>
                                        <div className="text-xs text-slate-600 mt-0.5">
                                            <span className="text-indigo-600">#{log.request.id}</span>{' '}
                                            {log.request.title}
                                            {log.item && <span className="text-slate-500"> → {log.item.name}</span>}
                                        </div>
                                        {log.notes && (
                                            <div className="mt-1.5 text-xs text-slate-700 bg-slate-50 rounded p-1.5">
                                                {log.notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 whitespace-nowrap">
                                        {new Date(log.createdAt).toLocaleString('th-TH')}
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0 mt-0.5" />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}
