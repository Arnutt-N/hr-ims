import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { MaintenanceStatsPanel } from '@/components/maintenance/MaintenanceStatsPanel';

/**
 * Maintenance dashboard, option A: lives under /reports
 * (analytical view alongside other reports). Q7 — ship both this and
 * /maintenance/dashboard, decide which to keep after ~1 week of usage.
 */
export default function ReportsMaintenancePage() {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <Link
                href="/reports"
                className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600"
            >
                <ArrowLeft size={14} /> รายงานทั้งหมด
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-slate-900">รายงานซ่อมบำรุง</h1>
                <p className="text-slate-500 mt-1">สถิติและประสิทธิภาพการซ่อมบำรุง</p>
            </div>
            <MaintenanceStatsPanel />
        </div>
    );
}
