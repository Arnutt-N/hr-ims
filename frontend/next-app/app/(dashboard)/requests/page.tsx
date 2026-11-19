import { Suspense } from 'react';
import RequestsTable from '@/components/dashboard/requests-table';
import { getRequests } from '@/lib/actions/requests';
import { CheckOverdueButton } from '@/components/dashboard/check-overdue-button';
import { getCachedAuth } from '@/lib/auth-cache';
import { APPROVER_ROLES, sessionHasAnyRole } from '@/lib/auth-guards';
import { getServerT } from '@/lib/i18n/server';

export const metadata = {
    title: 'Requests Management | HR-IMS',
    description: 'Manage inventory requests',
};

export default async function RequestsPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string; status?: string }>;
}) {
    const params = await searchParams;
    const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
    const status = params.status;
    const [result, session, { t }] = await Promise.all([
        getRequests({ page, status }),
        getCachedAuth(),
        getServerT()
    ]);
    const requests = result.data ?? [];
    const pagination = result.pagination ?? { page, perPage: 20, total: 0, totalPages: 0 };
    const pendingCount = result.pendingCount ?? 0;
    const canCheckOverdue = sessionHasAnyRole(session, ...APPROVER_ROLES);

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('requests.title')}</h1>
                    <p className="text-slate-500 mt-1">{t('requests.subtitle')}</p>
                </div>

                <div className="flex gap-2">
                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="text-sm font-medium text-slate-700">
                            {t('requests.pending-badge', { count: pendingCount })}
                        </span>
                    </div>
                    {canCheckOverdue ? <CheckOverdueButton /> : null}
                </div>
            </div>

            <Suspense fallback={<div className="h-64 bg-slate-50 rounded-xl animate-pulse" />}>
                <RequestsTable initialRequests={requests} pagination={pagination} />
            </Suspense>
        </div >
    );
}
