
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { Package, AlertTriangle, FileText, Activity } from "lucide-react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    // const session = await auth();
    // if (!session) {
    //     redirect('/login');
    // }
    console.log("Rendering DashboardPage...");

    const stats = await getDashboardStats();

    if (!stats) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalItems}</div>
                        <p className="text-xs text-muted-foreground">items in system</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.lowStockItems}</div>
                        <p className="text-xs text-muted-foreground">needs reordering</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pendingRequests}</div>
                        <p className="text-xs text-muted-foreground">awaiting approval</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Activity className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+573</div>
                        <p className="text-xs text-muted-foreground">+201 since last hour</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity Section */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {stats.recentActivity.map((activity, i) => (
                                <div key={i} className="flex items-center">
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{activity.user.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {activity.action} {activity.item}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium text-xs text-muted-foreground">
                                        {new Date(activity.date).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                            {stats.recentActivity.length === 0 && (
                                <div className="text-center text-muted-foreground py-4">No recent activity</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
