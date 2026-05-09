'use client';

import { useEffect, useState, use } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { PrintWorkOrder } from '@/components/maintenance/PrintWorkOrder';

interface PrintPageProps {
    params: Promise<{ id: string }>;
}

/**
 * Print-only page for a maintenance request work order.
 * Auto-triggers window.print() on mount; rendered via the same dashboard
 * layout but the PrintWorkOrder component's @media print CSS hides
 * everything except itself. PRP v6 Q13.
 */
export default function PrintPage({ params }: PrintPageProps) {
    const { id: idStr } = use(params);
    const requestId = Number.parseInt(idStr, 10);
    // Use 'unknown' here because the Server Action returns a discriminated union.
    const [request, setRequest] = useState<unknown | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (Number.isNaN(requestId)) return;
        let cancelled = false;
        async function load() {
            try {
                const { getMaintenanceRequest } = await import('@/lib/actions/maintenance');
                const r = await getMaintenanceRequest(requestId);
                if (cancelled) return;
                if (r && 'request' in r && r.request) {
                    setRequest(r.request);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [requestId]);

    if (loading) return <PageLoader />;
    if (!request) return <p className="p-8 text-center text-slate-500">ไม่พบคำขอ</p>;

    return <PrintWorkOrder request={request as Parameters<typeof PrintWorkOrder>[0]['request']} />;
}
