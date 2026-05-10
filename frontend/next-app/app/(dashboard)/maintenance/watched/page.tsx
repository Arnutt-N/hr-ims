'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { RequestCard } from '@/components/maintenance/RequestCard';

interface WatchedRequest {
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

export default function WatchedRequestsPage() {
    const [requests, setRequests] = useState<WatchedRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const { getMyWatchedRequests } = await import('@/lib/actions/maintenance-watchers');
                const r = await getMyWatchedRequests();
                if (cancelled) return;
                if (r && 'requests' in r && Array.isArray(r.requests)) {
                    setRequests(r.requests as WatchedRequest[]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) return <PageLoader />;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <Link href="/maintenance" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600">
                <ArrowLeft size={14} /> รายการแจ้งซ่อม
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <Bell size={26} /> คำขอที่ติดตาม ({requests.length})
                </h1>
                <p className="text-slate-500 mt-1">คำขอที่คุณติดตาม — รับการแจ้งเตือนทุกการเปลี่ยนสถานะ</p>
            </div>

            {requests.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-20 text-center">
                    <Bell className="mx-auto mb-4 text-slate-300" size={48} />
                    <h3 className="text-lg font-semibold text-slate-700">ยังไม่ได้ติดตามคำขอใด</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        เปิดคำขอแจ้งซ่อม แล้วกดปุ่ม &ldquo;ติดตามคำขอ&rdquo; เพื่อรับการแจ้งเตือน
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {requests.map((r) => <RequestCard key={r.id} request={r} />)}
                </div>
            )}
        </div>
    );
}
