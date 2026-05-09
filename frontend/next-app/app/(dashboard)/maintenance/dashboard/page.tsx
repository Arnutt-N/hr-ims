import Link from 'next/link';
import { ArrowLeft, List, BarChart3 } from 'lucide-react';
import { MaintenanceStatsPanel } from '@/components/maintenance/MaintenanceStatsPanel';

/**
 * Maintenance dashboard, option B: sub-route of /maintenance.
 * Tab nav at top distinguishes List vs Dashboard. Q7 — ship both this
 * and /reports/maintenance, decide which to keep after ~1 week.
 */
export default function MaintenanceDashboardPage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <Link href="/maintenance" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600">
                <ArrowLeft size={14} /> รายการแจ้งซ่อม
            </Link>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">ภาพรวมซ่อมบำรุง</h1>
                    <p className="text-slate-500 mt-1">สถิติและประสิทธิภาพ</p>
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
                    <Link
                        href="/maintenance"
                        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-slate-600 hover:text-slate-900"
                    >
                        <List size={14} /> รายการ
                    </Link>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-100 px-3 py-1.5 text-indigo-700">
                        <BarChart3 size={14} /> ภาพรวม
                    </span>
                </div>
            </div>

            <MaintenanceStatsPanel />
        </div>
    );
}
