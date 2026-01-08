
import React from 'react';
import { Box, FileText, Wrench, CheckCircle, Briefcase, RefreshCw, AlertCircle } from 'lucide-react';

const DashboardView = ({ inventory = [], currentUser, myAssets = [], requests = [] }) => {
    const adminStats = [
        { title: 'Total Assets', value: inventory.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: <Box /> },
        { title: 'Pending Requests', value: requests.filter(r => r.status === 'pending').length, color: 'text-purple-600', bg: 'bg-purple-50', icon: <FileText /> },
        { title: 'Maintenance', value: inventory.filter(i => i.status === 'maintenance').length, color: 'text-red-600', bg: 'bg-red-50', icon: <Wrench /> },
        { title: 'Borrowed Active', value: inventory.filter(i => i.status === 'borrowed').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle /> },
    ];

    const userStats = [
        { title: 'My Borrowed Items', value: myAssets.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: <Briefcase /> },
        { title: 'Need Verification', value: myAssets.filter(a => a.status === 'warning').length, color: 'text-red-600', bg: 'bg-red-50', icon: <RefreshCw /> },
    ];

    const stats = currentUser.role === 'admin' ? adminStats : userStats;

    return (
        <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
                <p className="text-slate-500 mt-1">Welcome back, {currentUser.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{stat.title}</p>
                            <h3 className="text-4xl font-extrabold text-slate-800">{stat.value}</h3>
                        </div>
                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} shadow-inner`}>
                            {React.cloneElement(stat.icon, { size: 28 })}
                        </div>
                    </div>
                ))}
            </div>

            {currentUser.role === 'admin' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Pending Asset Verification (Over 7 Days)</h3>
                    <div className="overflow-x-auto main-scrollbar">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">User</th>
                                    <th className="px-4 py-3">Asset Name</th>
                                    <th className="px-4 py-3">Last Checked</th>
                                    <th className="px-4 py-3 rounded-r-lg">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-50">
                                    <td className="px-4 py-3 font-bold">Somchai Staff</td>
                                    <td className="px-4 py-3">MacBook Pro M2 (Old)</td>
                                    <td className="px-4 py-3 text-red-500">8 days ago</td>
                                    <td className="px-4 py-3"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Overdue</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {currentUser.role === 'user' && myAssets.some(a => a.status === 'warning') && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
                    <div className="bg-red-100 p-2 rounded-full text-red-600"><AlertCircle /></div>
                    <div>
                        <h3 className="font-bold text-red-800 text-lg">Action Required: Asset Verification</h3>
                        <p className="text-red-600 text-sm mt-1">You have items that haven't been verified for over 7 days. Please go to "My Assets" to confirm you still possess them.</p>
                        <button onClick={() => document.querySelector('button[label="My Assets (Check)"]')?.click()} className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
                            Go to Verify
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardView;
