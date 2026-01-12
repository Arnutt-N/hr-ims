import { getDashboardStats } from "@/lib/actions/dashboard";
import { Package, AlertTriangle, FileText, Activity } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { formatThaiDateTime, formatRelativeTime } from "@/lib/date-utils";

export default async function DashboardPage() {
    const session = await auth();
    // if (!session) {
    //     redirect('/login');
    // }

    const stats = await getDashboardStats();

    if (!stats) return <div className="p-8 text-center text-slate-500">Loading dashboard data...</div>;

    const statCards = [
        {
            title: 'Total Assets',
            val: stats.totalItems,
            sub: 'items in system',
            icon: <Package size={24} />,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
        },
        {
            title: 'Low Stock',
            val: stats.lowStockItems,
            sub: 'needs reordering',
            icon: <AlertTriangle size={24} />,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50'
        },
        {
            title: 'Pending Requests',
            val: stats.pendingRequests,
            sub: 'awaiting approval',
            icon: <FileText size={24} />,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50'
        },
        {
            title: 'Active Users',
            val: '+573', // Mock
            sub: 'active this month',
            icon: <Activity size={24} />,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50'
        },
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <h1 className="text-3xl font-bold mb-2 relative z-10">Welcome back, {session?.user?.name || 'Admin'}</h1>
                <p className="text-blue-100 relative z-10 max-w-xl">
                    Here's what's happening with your inventory today. You have {stats.pendingRequests} pending requests and {stats.lowStockItems} items running low on stock.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow duration-200">
                        <div>
                            <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-slate-800">{stat.val}</h3>
                            <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                        </div>
                        <div className={`p-4 rounded-xl ${stat.bgColor} ${stat.color}`}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Recent Activity</h2>
                        <p className="text-sm text-slate-500">Latest transactions and updates</p>
                    </div>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
                </div>

                <div className="divide-y divide-slate-100">
                    {stats.recentActivity.length > 0 ? (
                        stats.recentActivity.map((activity, i) => (
                            <div key={i} className="p-4 hover:bg-slate-50/50 transition-colors flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                                    ${activity.action === 'Withdraw' ? 'bg-orange-100 text-orange-600' :
                                        activity.action === 'Return' ? 'bg-green-100 text-green-600' :
                                            'bg-blue-100 text-blue-600'}`}>
                                    {activity.action.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                            <span className="font-bold">{activity.user.name}</span>
                                            <span className="font-normal text-slate-600"> {activity.action.toLowerCase()} </span>
                                            <span className="font-medium text-slate-900">{activity.item}</span>
                                        </p>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{formatThaiDateTime(activity.date)} ({formatRelativeTime(activity.date)})</p>
                                </div>
                                <div className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                                    {activity.status}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-slate-400">
                            No recent activity found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
