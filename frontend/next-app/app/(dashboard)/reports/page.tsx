'use client';

import { useState, useEffect } from 'react';
import { getReportStats } from '@/lib/actions/reports';
import { Button } from '@/components/ui/button';
import { Calendar, Download, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        const res = await getReportStats();
        if (res.success) {
            setStats(res.stats);
        }
        setLoading(false);
    };

    const handleExport = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading reports...</div>;
    if (!stats) return <div className="p-8 text-center text-slate-500">No data available</div>;

    // Prepare data for charts
    const statusData = stats.statusBreakdown.map((item: any) => ({
        name: item.status,
        value: item._count.id
    }));

    const topItemsData = stats.topBorrowed.map((item: any) => ({
        name: item.item.length > 20 ? item.item.substring(0, 20) + '...' : item.item,
        count: item._count.id
    }));

    const deptData = stats.topDepartments;

    const trendData = stats.monthlyTrend.sort((a: any, b: any) => a.month.localeCompare(b.month));

    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Reports & Analytics</h2>
                    <p className="text-slate-500">System usage summary and insights.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                        <Calendar size={16} className="mr-2" /> Last 6 Months
                    </Button>
                    <Button size="sm" onClick={handleExport} className="bg-indigo-600 hover:bg-indigo-700">
                        <Download size={16} className="mr-2" /> Export PDF
                    </Button>
                </div>
            </div>

            {/* Chart Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Breakdown */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-indigo-600" />
                        Item Status Breakdown
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {statusData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Top 10 Items */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Top 10 Most Borrowed Items</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={topItemsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Department Usage */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Top Departments by Usage</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={deptData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#10b981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Monthly Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Monthly Usage Trend</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
                    <div className="text-indigo-100 text-sm font-bold uppercase mb-2">Total Items</div>
                    <div className="text-4xl font-bold">
                        {statusData.reduce((acc: number, item: any) => acc + item.value, 0)}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg">
                    <div className="text-emerald-100 text-sm font-bold uppercase mb-2">Available</div>
                    <div className="text-4xl font-bold">
                        {statusData.find((s: any) => s.name === 'available')?._count?.id || 0}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg">
                    <div className="text-purple-100 text-sm font-bold uppercase mb-2">Total Borrows</div>
                    <div className="text-4xl font-bold">
                        {topItemsData.reduce((acc: number, item: any) => acc + item.count, 0)}
                    </div>
                </div>
            </div>
        </div>
    );
}
