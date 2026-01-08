
import React from 'react';
import { CheckCircle, AlertTriangle, ArrowLeftRight } from 'lucide-react';

const MyAssetsView = ({ myAssets = [], onCheckIn, onReturn, onReport }) => {
    return (
        <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">My Active Assets</h2>
                    <p className="text-slate-500 mt-1">Items currently borrowed by you. Please verify status every 7 days.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {myAssets.map((asset) => {
                    const isWarning = asset.status === 'warning';
                    return (
                        <div key={asset.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${isWarning ? 'border-red-200 bg-red-50/30' : 'border-slate-100'} flex flex-col md:flex-row items-center justify-between`}>
                            <div className="flex items-center gap-4 mb-4 md:mb-0">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isWarning ? 'bg-red-100' : 'bg-slate-100'}`}>
                                    📦
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{asset.name}</h3>
                                    <p className="text-sm text-slate-500 font-mono">SN: {asset.serial}</p>
                                    <div className="flex gap-4 mt-2 text-xs">
                                        <span className="text-slate-500">Borrowed: {asset.borrowDate}</span>
                                        <span className={`${isWarning ? 'text-red-600 font-bold' : 'text-emerald-600'}`}>Last Check: {asset.lastCheckDate}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {isWarning ? (
                                    <button
                                        onClick={() => onCheckIn(asset.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2 text-sm"
                                    >
                                        <CheckCircle size={16} /> Verify
                                    </button>
                                ) : (
                                    <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold flex items-center border border-emerald-100">
                                        <CheckCircle size={16} className="mr-2" /> Verified
                                    </div>
                                )}

                                {asset.status === 'returning' ? (
                                    <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-bold border border-amber-100">
                                        Returning...
                                    </div>
                                ) : asset.status === 'issue_reported' ? (
                                    <div className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-bold border border-red-100">
                                        Issue Reported
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onReport(asset)}
                                            className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-sm"
                                            title="Report Broken/Issue"
                                        >
                                            <AlertTriangle size={16} /> Report
                                        </button>
                                        <button
                                            onClick={() => onReturn(asset)}
                                            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-sm"
                                        >
                                            <ArrowLeftRight size={16} /> Return
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MyAssetsView;
