'use client';

import { useEffect, useState, use } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { PrintRequisition } from '@/components/requests/PrintRequisition';

interface PrintPageProps {
    params: Promise<{ id: string }>;
}

export default function PrintRequestPage({ params }: PrintPageProps) {
    const { id: idStr } = use(params);
    const requestId = Number.parseInt(idStr, 10);
    const [request, setRequest] = useState<unknown | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (Number.isNaN(requestId)) {
            setLoading(false);
            return;
        }
        let cancelled = false;
        async function load() {
            try {
                const { getRequestForPrint } = await import('@/lib/actions/requests');
                const result = await getRequestForPrint(requestId);
                if (!cancelled && 'data' in result) {
                    setRequest(result.data);
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

    return <PrintRequisition request={request as Parameters<typeof PrintRequisition>[0]['request']} />;
}
