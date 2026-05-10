'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Wrench } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { useSession } from 'next-auth/react';
import { RequestCard } from '@/components/maintenance/RequestCard';
import { RequestForm } from '@/components/maintenance/RequestForm';
import { TagFilterChips } from '@/components/maintenance/TagFilterChips';
import {
    SEVERITY_LEVELS,
    type RequestStatus,
} from '@/lib/maintenance/types';

const STATUS_FILTER_OPTIONS: Array<{ value: RequestStatus | 'all'; label: string }> = [
    { value: 'all', label: 'ทั้งหมด' },
    { value: 'open', label: 'รอดำเนินการ' },
    { value: 'assigned', label: 'มอบหมายแล้ว' },
    { value: 'in_progress', label: 'กำลังซ่อม' },
    { value: 'awaiting_parts', label: 'รออะไหล่' },
    { value: 'resolved', label: 'รอตรวจรับ' },
    { value: 'closed', label: 'ปิดงาน' },
    { value: 'cancelled', label: 'ยกเลิก' },
];

const SEVERITY_LABELS: Record<string, string> = {
    low: 'ต่ำ',
    medium: 'กลาง',
    high: 'สูง',
    critical: 'วิกฤต',
};

interface MaintenanceListItem {
    id: number;
    title: string;
    status: string;
    severity: string;
    priority: string;
    tags: string | null;
    createdAt: Date | string;
    items: { id: number; status: string; item: { id: number; name: string } }[];
    reportedBy?: { id: number; name: string | null } | null;
    assignedTo?: { id: number; name: string | null } | null;
    location?: { id: number; name: string } | null;
}

export default function MaintenanceListPage() {
    const { data: session } = useSession();
    const [requests, setRequests] = useState<MaintenanceListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [severityFilter, setSeverityFilter] = useState<string>('all');
    const [tags, setTags] = useState<string[]>([]);
    const [scopeFilter, setScopeFilter] = useState<'all' | 'me' | 'pending-approval' | 'deleted'>('all');
    const [showNewForm, setShowNewForm] = useState(false);

    const isAdmin = (() => {
        const r = (session?.user as { roles?: string[] } | undefined)?.roles ?? [];
        return r.includes('admin') || r.includes('superadmin');
    })();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { getMaintenanceRequests, getMyMaintenanceRequests } = await import(
                '@/lib/actions/maintenance'
            );
            const filters: Record<string, unknown> = {};
            if (statusFilter !== 'all') filters.status = statusFilter;
            if (severityFilter !== 'all') filters.severity = severityFilter;
            if (tags.length > 0) filters.tags = tags;
            if (scopeFilter === 'me') filters.assignedToId = 'me';
            if (scopeFilter === 'deleted') filters.view = 'deleted';

            // 'pending-approval' uses a separate path: fetch own requests with resolved items
            const result =
                scopeFilter === 'pending-approval'
                    ? await getMyMaintenanceRequests()
                    : await getMaintenanceRequests(filters);

            if (result && 'requests' in result && Array.isArray(result.requests)) {
                let list = result.requests as MaintenanceListItem[];
                if (scopeFilter === 'pending-approval') {
                    list = list.filter((r) => r.items.some((it) => it.status === 'resolved'));
                }
                setRequests(list);
            } else {
                setRequests([]);
            }
        } finally {
            setLoading(false);
        }
    }, [statusFilter, severityFilter, tags, scopeFilter]);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">รายการแจ้งซ่อม</h2>
                    <p className="text-slate-500 mt-1">จัดการคำขอซ่อมบำรุงทั้งหมด</p>
                </div>
                <Button onClick={() => setShowNewForm(true)}>
                    <Plus size={16} className="mr-1.5" /> แจ้งซ่อมใหม่
                </Button>
            </div>

            {/* Filter bar */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                        <label className="text-xs font-medium text-slate-600">สถานะ</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                        >
                            {STATUS_FILTER_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600">ผลกระทบ</label>
                        <select
                            value={severityFilter}
                            onChange={(e) => setSeverityFilter(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                        >
                            <option value="all">ทั้งหมด</option>
                            {SEVERITY_LEVELS.map((s) => (
                                <option key={s} value={s}>
                                    {SEVERITY_LABELS[s]}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-600">ขอบเขต</label>
                        <select
                            value={scopeFilter}
                            onChange={(e) =>
                                setScopeFilter(e.target.value as typeof scopeFilter)
                            }
                            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
                        >
                            <option value="all">ทั้งหมด</option>
                            <option value="me">มอบหมายให้ฉัน</option>
                            <option value="pending-approval">รอฉันตรวจรับ</option>
                            {isAdmin && <option value="deleted">ที่ถูกลบ (Admin)</option>}
                        </select>
                    </div>
                </div>
                <div className="mt-3">
                    <TagFilterChips selected={tags} onChange={setTags} />
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <PageLoader />
            ) : requests.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
                    <Wrench className="mx-auto mb-4 text-slate-300" size={48} />
                    <h3 className="text-lg font-semibold text-slate-700">ไม่มีคำขอแจ้งซ่อม</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        เริ่มแจ้งซ่อมโดยกดปุ่ม &ldquo;แจ้งซ่อมใหม่&rdquo; ด้านบน
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {requests.map((r) => (
                        <RequestCard key={r.id} request={r} />
                    ))}
                </div>
            )}

            <RequestForm open={showNewForm} onOpenChange={setShowNewForm} onSuccess={() => void load()} />
        </div>
    );
}
