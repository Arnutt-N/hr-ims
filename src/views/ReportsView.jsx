
import React from 'react';
import { Calendar, Download } from 'lucide-react';

const ReportsView = () => {
    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Reports & Analytics</h2>
                    <p className="text-slate-500">System usage summary and monthly reports.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-bold">
                        <Calendar size={16} /> Last 30 Days
                    </button>
                    <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold shadow-md">
                        <Download size={16} /> Export PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Item Status Breakdown</h3>
                    <div className="flex items-center justify-center h-40 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <span className="text-slate-400 text-sm">Chart: Pie Status</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Monthly Usage (Consumables)</h3>
                    <div className="flex items-center justify-center h-40 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <span className="text-slate-400 text-sm">Chart: Bar Usage</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Budget Utilization</h3>
                    <div className="flex items-center justify-center h-40 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <span className="text-slate-400 text-sm">Chart: Line Budget</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-bold text-slate-700 mb-4">Detailed Transaction Log</h3>
                <div className="text-center text-slate-400 py-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    Table Data Placeholder
                </div>
            </div>
        </div>
    );
};

export default ReportsView;
