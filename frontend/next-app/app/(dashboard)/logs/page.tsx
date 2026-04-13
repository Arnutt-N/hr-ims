import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { sessionHasAnyRole } from '@/lib/auth-guards';
import { getAuditLogs } from '@/lib/actions/audit';
import { getServerT } from '@/lib/i18n/server';
import { formatThaiDateTime } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Activity } from 'lucide-react';

export default async function AuditLogsPage() {
    const session = await auth();
    if (!session) redirect('/login');
    if (!sessionHasAnyRole(session, 'superadmin', 'admin', 'auditor')) {
        redirect('/dashboard');
    }

    const { t } = await getServerT();
    const result = await getAuditLogs(200);

    if ('error' in result) {
        return (
            <div className="p-8 text-center text-slate-500">{result.error}</div>
        );
    }

    const logs = result.logs ?? [];

    const actionColors: Record<string, string> = {
        CREATE: 'bg-green-100 text-green-700',
        UPDATE: 'bg-blue-100 text-blue-700',
        DELETE: 'bg-red-100 text-red-700',
        LOGIN: 'bg-indigo-100 text-indigo-700',
        LOGOUT: 'bg-slate-100 text-slate-700',
        EXPORT: 'bg-purple-100 text-purple-700',
        VIEW: 'bg-emerald-100 text-emerald-700',
    };

    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
                <Activity className="h-7 w-7 text-slate-600" />
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">
                        {t('audit.title') || 'Audit Logs'}
                    </h2>
                    <p className="text-slate-500 mt-1">
                        {t('audit.subtitle') ||
                            'System activity and security audit trail'}
                    </p>
                </div>
            </div>

            {logs.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                    {t('common.no-data')}
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('common.actions') || 'Action'}</TableHead>
                                <TableHead>Entity</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <Badge
                                            className={
                                                actionColors[log.action] ??
                                                'bg-slate-100 text-slate-700'
                                            }
                                        >
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs text-slate-600">
                                        {log.entity}
                                        {log.entityId ? `#${log.entityId}` : ''}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            {log.user?.name ?? '—'}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {log.user?.email ?? ''}
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-md truncate text-xs text-slate-500">
                                        {log.details ?? ''}
                                    </TableCell>
                                    <TableCell className="text-right text-xs text-slate-500 whitespace-nowrap">
                                        {formatThaiDateTime(log.createdAt)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
