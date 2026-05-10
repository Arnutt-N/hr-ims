'use client';

import { useEffect, useState } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    LineChart, Line, ResponsiveContainer, CartesianGrid,
} from 'recharts';

/**
 * Single dashboard panel that fetches getMaintenanceStats once and
 * renders all charts. Reused by both /reports/maintenance and
 * /maintenance/dashboard pages (Q7 — ship both, decide later).
 * PRP v6 Phase 3 commits #8+#9.
 */

interface StatsResponse {
    totalRequests: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
    byLocation: Array<{ departmentId: number; departmentName: string; count: number }>;
    averageResolveTimeHours: number | null;
    averageCloseTimeHours: number | null;
    topItemsByRequestCount: Array<{ itemId: number; itemName: string; count: number }>;
    costByDepartment: Array<{
        departmentId: number;
        departmentName: string;
        estimatedTotal: number;
        actualTotal: number;
        requestCount: number;
    }>;
    technicianProductivity: Array<{
        userId: number;
        userName: string;
        resolvedCount: number;
        closedCount: number;
        averageResolveTimeHours: number;
        averageCloseTimeHours: number;
        totalActualCost: number;
    }>;
    costSummary: { estimatedTotal: number; actualTotal: number };
    trendByDay: Array<{ date: string; created: number; closed: number }>;
}

const STATUS_COLORS: Record<string, string> = {
    open: '#94a3b8',
    assigned: '#6366f1',
    in_progress: '#3b82f6',
    awaiting_parts: '#f59e0b',
    resolved: '#10b981',
    closed: '#64748b',
    cancelled: '#ef4444',
};

const SEVERITY_COLORS: Record<string, string> = {
    low: '#94a3b8',
    medium: '#eab308',
    high: '#f97316',
    critical: '#dc2626',
};

const PRIORITY_COLORS: Record<string, string> = {
    low: '#94a3b8',
    normal: '#3b82f6',
    high: '#f97316',
    urgent: '#dc2626',
};

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
            {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
        </div>
    );
}

interface PanelProps {
    filters?: Record<string, unknown>;
}

export function MaintenanceStatsPanel({ filters }: PanelProps) {
    const [stats, setStats] = useState<StatsResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const { getMaintenanceStats } = await import('@/lib/actions/maintenance');
                const r = await getMaintenanceStats(filters);
                if (cancelled) return;
                if (r && 'stats' in r && r.stats) {
                    setStats(r.stats as StatsResponse);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, [filters]);

    if (loading) return <PageLoader />;
    if (!stats) return <p className="text-slate-500">โหลดสถิติไม่สำเร็จ</p>;

    const statusData = Object.entries(stats.byStatus).map(([status, count]) => ({ name: status, value: count }));
    const severityData = Object.entries(stats.bySeverity).map(([sev, count]) => ({ name: sev, value: count }));
    const priorityData = Object.entries(stats.byPriority).map(([p, count]) => ({ name: p, value: count }));

    return (
        <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="คำขอทั้งหมด" value={stats.totalRequests} />
                <StatCard
                    label="เวลาซ่อมเฉลี่ย"
                    value={stats.averageResolveTimeHours !== null ? `${stats.averageResolveTimeHours.toFixed(1)} ชม.` : '—'}
                />
                <StatCard
                    label="เวลาปิดงานเฉลี่ย"
                    value={stats.averageCloseTimeHours !== null ? `${stats.averageCloseTimeHours.toFixed(1)} ชม.` : '—'}
                />
                <StatCard
                    label="ค่าใช้จ่ายจริง"
                    value={stats.costSummary.actualTotal.toLocaleString()}
                    subtext={`ประมาณ ${stats.costSummary.estimatedTotal.toLocaleString()} บาท`}
                />
            </div>

            {/* Charts grid */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Status pie */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">สถานะคำขอ</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                            <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} label>
                                {statusData.map((entry) => (
                                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#cbd5e1'} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Severity bar */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">ผลกระทบ</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={severityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value">
                                {severityData.map((entry) => (
                                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? '#cbd5e1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Priority bar (v4) */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">ความเร่งด่วน</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={priorityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="value">
                                {priorityData.map((entry) => (
                                    <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name] ?? '#cbd5e1'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Trend line */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">แนวโน้ม 30 วัน</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={stats.trendByDay}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="created" stroke="#6366f1" name="แจ้ง" />
                            <Line type="monotone" dataKey="closed" stroke="#10b981" name="ปิดงาน" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Cost by department (v4) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">ค่าใช้จ่ายแยกหน่วยงาน</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.costByDepartment}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="departmentName" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="estimatedTotal" stackId="cost" fill="#94a3b8" name="ประมาณ" />
                        <Bar dataKey="actualTotal" stackId="cost" fill="#6366f1" name="จริง" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Technician productivity (v4) */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">ประสิทธิภาพช่าง</h3>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-600">
                            <th className="py-2 pr-3">ช่าง</th>
                            <th className="py-2 pr-3 text-right">ปิดงาน</th>
                            <th className="py-2 pr-3 text-right">ซ่อมเสร็จ</th>
                            <th className="py-2 pr-3 text-right">เวลาซ่อมเฉลี่ย (ชม.)</th>
                            <th className="py-2 pr-3 text-right">ค่าใช้จ่ายรวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.technicianProductivity.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-6 text-center text-slate-500">
                                    ยังไม่มีข้อมูล
                                </td>
                            </tr>
                        ) : (
                            stats.technicianProductivity.map((t) => (
                                <tr key={t.userId} className="border-b border-slate-100">
                                    <td className="py-2 pr-3 font-medium">{t.userName}</td>
                                    <td className="py-2 pr-3 text-right">{t.closedCount}</td>
                                    <td className="py-2 pr-3 text-right">{t.resolvedCount}</td>
                                    <td className="py-2 pr-3 text-right">{t.averageResolveTimeHours.toFixed(1)}</td>
                                    <td className="py-2 pr-3 text-right">{t.totalActualCost.toLocaleString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Top items */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">อุปกรณ์แจ้งซ่อมบ่อย (Top 10)</h3>
                <ul className="space-y-2 text-sm">
                    {stats.topItemsByRequestCount.map((it, idx) => (
                        <li key={it.itemId} className="flex items-center justify-between gap-3">
                            <span className="flex-1 min-w-0">
                                <span className="text-xs text-slate-500 mr-2">#{idx + 1}</span>
                                {it.itemName}
                            </span>
                            <span className="font-bold text-slate-700">{it.count}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
