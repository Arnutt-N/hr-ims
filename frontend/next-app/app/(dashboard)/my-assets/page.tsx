'use client';

import { useState, useEffect } from 'react';
import { getMyAssets, checkInAsset, requestReturn, reportIssue } from '@/lib/actions/assets';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Package, CheckCircle, AlertTriangle, ArrowRightLeft, Clock } from 'lucide-react';
import { formatThaiDateShort, formatRelativeTime } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';

export default function MyAssetsPage() {
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAssets();
    }, []);

    const loadAssets = async () => {
        const res = await getMyAssets();
        if (res.success) {
            setAssets(res.assets || []);
        }
        setLoading(false);
    };

    const handleCheckIn = async (id: number) => {
        const res = await checkInAsset(id);
        if (res.success) {
            toast.success('Verified successfully');
            loadAssets();
        } else {
            toast.error('Verification failed');
        }
    };

    const handleReturn = async (id: number) => {
        const res = await requestReturn(id);
        if (res.success) {
            toast.success('Return request sent');
            loadAssets();
        } else {
            toast.error('Failed to request return');
        }
    };

    const handleReport = async (id: number) => {
        // Simple prompt for now
        const issue = prompt('Describe the issue:');
        if (issue) {
            const res = await reportIssue(id, issue);
            if (res.success) {
                toast.success('Issue reported');
                loadAssets();
            } else {
                toast.error('Failed to report issue');
            }
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading assets...</div>;

    return (
        <div className="space-y-8 animate-fade-in-up max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">My Active Assets</h1>
                    <p className="text-slate-500 mt-1">Items currently held by you. Please verify status every 7 days.</p>
                </div>
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="text-slate-300" size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">No active assets</h3>
                    <p className="text-slate-400 mb-8 mt-2">You don't have any borrowed items currently.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {assets.map((asset) => {
                        // Logic for warning: last check > 7 days
                        const lastCheck = asset.lastCheckDate ? new Date(asset.lastCheckDate) : new Date(asset.borrowDate);
                        const daysSinceCheck = (new Date().getTime() - lastCheck.getTime()) / (1000 * 3600 * 24);
                        const isWarning = daysSinceCheck > 7;

                        return (
                            <div key={asset.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${isWarning ? 'border-red-200 bg-red-50/10' : 'border-slate-100'} flex flex-col md:flex-row items-center justify-between transition-all hover:shadow-md`}>
                                <div className="flex items-center gap-6 mb-4 md:mb-0 w-full md:w-auto">
                                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 ${isWarning ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
                                        {asset.image ? <img src={asset.image} className="w-full h-full object-cover rounded-xl" /> : '📦'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-800 text-lg">{asset.name}</h3>
                                            <Badge variant="outline" className="font-mono text-xs">{asset.serial || 'NO-SN'}</Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <Clock size={14} /> Borrowed: {formatThaiDateShort(asset.borrowDate)}
                                            </span>
                                            <span className={`flex items-center gap-1.5 ${isWarning ? 'text-red-600 font-bold' : 'text-emerald-600'}`}>
                                                <CheckCircle size={14} /> Last Check: {formatRelativeTime(asset.lastCheckDate || asset.borrowDate)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                                    {/* Action Buttons */}
                                    {asset.isReturning ? (
                                        <Badge variant="secondary" className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 hover:bg-amber-100">
                                            Returning...
                                        </Badge>
                                    ) : asset.status === 'issue_reported' ? (
                                        <Badge variant="destructive" className="px-3 py-1.5 text-sm">
                                            Issue Reported
                                        </Badge>
                                    ) : (
                                        <>
                                            {isWarning ? (
                                                <Button
                                                    onClick={() => handleCheckIn(asset.id)}
                                                    className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200 animate-pulse"
                                                    size="sm"
                                                >
                                                    <CheckCircle size={16} className="mr-2" /> Verify Now
                                                </Button>
                                            ) : (
                                                <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-bold border border-emerald-100 flex items-center">
                                                    <CheckCircle size={14} className="mr-1.5" /> Verified
                                                </div>
                                            )}

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleReport(asset.id)}
                                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <AlertTriangle size={16} className="mr-2" /> Report
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReturn(asset.id)}
                                                className="border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            >
                                                <ArrowRightLeft size={16} className="mr-2" /> Return
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
