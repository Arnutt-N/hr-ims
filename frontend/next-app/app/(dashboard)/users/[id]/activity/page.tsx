'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity } from 'lucide-react';
import { ActivityFeed } from '@/components/users/ActivityFeed';

interface ActivityPageProps {
    params: Promise<{ id: string }>;
}

/**
 * User activity feed page (PRP v6 Phase 6 — Q21).
 * Auth scope enforced server-side in getUserActivity:
 *   - own profile (any logged-in user)
 *   - others (admin/superadmin/auditor)
 */
export default function UserActivityPage({ params }: ActivityPageProps) {
    const { id: idStr } = use(params);
    const userId = Number.parseInt(idStr, 10);

    if (Number.isNaN(userId)) {
        return <p className="p-8 text-center text-red-600">Invalid user id</p>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Link href="/users" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600">
                <ArrowLeft size={14} /> ผู้ใช้งาน
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <Activity size={26} /> ประวัติกิจกรรมงานซ่อมบำรุง
                </h1>
                <p className="text-slate-500 mt-1">
                    บันทึกกิจกรรมที่ผู้ใช้นี้ดำเนินการในระบบซ่อมบำรุง
                </p>
            </div>
            <ActivityFeed userId={userId} />
        </div>
    );
}
