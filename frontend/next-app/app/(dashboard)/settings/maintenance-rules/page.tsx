import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CategoryRuleManager } from '@/components/maintenance/CategoryRuleManager';

/**
 * Admin page for managing CategoryAssigneeRule entries (PRP v6 Phase 5).
 * RBAC: gated to admin/superadmin via /settings prefix in proxy-authorize.
 */
export default function MaintenanceRulesPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <Link
                href="/settings"
                className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600"
            >
                <ArrowLeft size={14} /> ตั้งค่าทั้งหมด
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-slate-900">กฎมอบหมายงานซ่อมอัตโนมัติ</h1>
                <p className="text-slate-500 mt-1">
                    เมื่อมีคำขอซ่อมประเภทที่ตรงกับกฎ ระบบจะมอบหมายให้ผู้รับผิดชอบที่กำหนดทันที
                </p>
            </div>
            <CategoryRuleManager />
        </div>
    );
}
