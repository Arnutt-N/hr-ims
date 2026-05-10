'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight } from 'lucide-react';

interface PendingItem {
    requestId: number;
    title: string;
    itemName: string;
}

/**
 * Surfaces items that the current user (as reporter) needs to verify
 * (item.status === 'resolved'). Click navigates to the request detail
 * where they can Approve or Reject. Renders nothing if no pending items.
 * PRP v6 Phase 3 commit #12.
 */
export function PendingVerificationWidget() {
    const [pending, setPending] = useState<PendingItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const { getMyMaintenanceRequests } = await import('@/lib/actions/maintenance');
                const r = await getMyMaintenanceRequests();
                if (cancelled) return;
                if (r && 'requests' in r && Array.isArray(r.requests)) {
                    const items: PendingItem[] = [];
                    for (const req of r.requests) {
                        for (const it of req.items) {
                            if (it.status === 'resolved') {
                                items.push({ requestId: req.id, title: req.title, itemName: it.item.name });
                            }
                        }
                    }
                    setPending(items);
                }
            } finally {
                if (!cancelled) setLoaded(true);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    if (!loaded || pending.length === 0) return null;

    return (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
                    <CheckCircle2 size={20} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-amber-900">รอคุณตรวจรับ ({pending.length})</h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                        ช่างซ่อมเสร็จแล้ว — กรุณาตรวจสอบและยืนยันการปิดงาน
                    </p>
                    <ul className="mt-3 space-y-1.5">
                        {pending.slice(0, 5).map((p, i) => (
                            <li key={`${p.requestId}-${i}`}>
                                <Link
                                    href={`/maintenance/${p.requestId}`}
                                    className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm hover:bg-amber-100 transition"
                                >
                                    <span className="flex-1 min-w-0">
                                        <span className="font-medium text-slate-900 truncate block">
                                            {p.title}
                                        </span>
                                        <span className="text-xs text-slate-500">→ {p.itemName}</span>
                                    </span>
                                    <ChevronRight size={16} className="text-slate-400" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                    {pending.length > 5 && (
                        <Link
                            href="/maintenance?scope=pending-approval"
                            className="mt-2 inline-block text-xs text-amber-700 underline-offset-2 hover:underline"
                        >
                            ดูทั้งหมด ({pending.length})
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
