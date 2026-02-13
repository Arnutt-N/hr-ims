'use client';

import { useState, useEffect } from 'react';
import { getHistory } from '@/lib/actions/history';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Filter } from 'lucide-react';
import { formatThaiDateShort } from '@/lib/date-utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export default function HistoryPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        query: '',
        action: 'all',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        setLoading(true);
        const res = await getHistory(filters);
        if (res.success) {
            setHistory(res.history || []);
        }
        setLoading(false);
    };

    const handleSearch = () => {
        loadHistory();
    };

    const handleReset = () => {
        setFilters({ query: '', action: 'all', startDate: '', endDate: '' });
        setTimeout(() => loadHistory(), 100);
    };

    const actionColors: Record<string, string> = {
        'borrow': 'bg-purple-100 text-purple-700',
        'withdraw': 'bg-blue-100 text-blue-700',
        'return': 'bg-green-100 text-green-700',
        'check': 'bg-emerald-100 text-emerald-700',
        'report': 'bg-red-100 text-red-700',
        'approve': 'bg-indigo-100 text-indigo-700',
        'reject': 'bg-slate-100 text-slate-700'
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading history...</div>;

    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold text-slate-900">Transaction History</h2>
                <p className="text-slate-500 mt-1">View all system activities and transactions.</p>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Keyword Search */}
                    <div className="lg:col-span-2">
                        <label className="text-xs font-bold text-slate-600 mb-2 block">KEYWORD SEARCH</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <Input
                                placeholder="Search item, action, status..."
                                value={filters.query}
                                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                                className="pl-10"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>

                    {/* Action Filter */}
                    <div>
                        <label className="text-xs font-bold text-slate-600 mb-2 block">ACTION TYPE</label>
                        <select
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                            <option value="all">All Actions</option>
                            <option value="borrow">Borrow</option>
                            <option value="withdraw">Withdraw</option>
                            <option value="return">Return</option>
                            <option value="check">Check-in</option>
                            <option value="report">Report Issue</option>
                            <option value="approve">Approve</option>
                            <option value="reject">Reject</option>
                        </select>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="text-xs font-bold text-slate-600 mb-2 block">DATE RANGE</label>
                        <div className="flex gap-2">
                            <Input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="text-xs"
                            />
                            <span className="text-slate-400 self-center">—</span>
                            <Input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="text-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* Filter Actions */}
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        Clear Filters
                    </Button>
                    <Button size="sm" onClick={handleSearch} className="bg-indigo-600 hover:bg-indigo-700">
                        <Filter size={16} className="mr-2" /> Apply Filters
                    </Button>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {history.length === 0 ? (
                    <div className="text-center py-16 text-slate-400">
                        <Calendar size={48} className="mx-auto mb-4 text-slate-200" />
                        <p className="font-medium">No history found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="w-[140px]">Date</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((log) => (
                                    <TableRow key={log.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-mono text-xs text-slate-500">
                                            {formatThaiDateShort(log.date)}
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-bold text-slate-800">{log.user?.name || 'Unknown'}</div>
                                                <div className="text-xs text-slate-500">{log.user?.department || '-'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={`${actionColors[log.action] || 'bg-slate-100 text-slate-600'} capitalize`}>
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-700">{log.item}</TableCell>
                                        <TableCell>
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 capitalize">
                                                {log.status}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <div className="text-sm text-slate-500 text-center">
                Showing {history.length} record{history.length !== 1 ? 's' : ''}
            </div>
        </div>
    );
}
