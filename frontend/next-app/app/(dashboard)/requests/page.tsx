import { Suspense } from 'react';
import RequestsTable from '@/components/dashboard/requests-table';
import { getRequests } from '@/lib/actions/requests';
import { CheckOverdueButton } from '@/components/dashboard/check-overdue-button';
import { ArrowRightLeft } from 'lucide-react';

export const metadata = {
    title: 'Requests Management | HR-IMS',
    description: 'Manage inventory requests',
};

export default async function RequestsPage() {
    const result = await getRequests();
    const requests = result.success ? result.data : [];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Requests</h1>
                    <p className="text-slate-500 mt-1">Manage and approve inventory requests.</p>
                </div>

                <div className="flex gap-2">
                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="text-sm font-medium text-slate-700">
                            Pending: {requests.filter(r => r.status === 'pending').length}
                        </span>
                    </div>
                    <CheckOverdueButton />
                </div>
            </div>

            <Suspense fallback={<div className="h-64 bg-slate-50 rounded-xl animate-pulse" />}>
                <RequestsTable initialRequests={requests} />
            </Suspense>
        </div >
    );
}
