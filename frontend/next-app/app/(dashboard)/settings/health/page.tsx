'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Loader2,
    RefreshCw,
    Database,
    HardDrive,
    Activity,
    Server,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    FileText,
    Archive
} from 'lucide-react';
import { toast } from 'sonner';

interface HealthStatus {
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    services: {
        database: {
            status: string;
            latency: string;
            stats?: {
                users: number;
                inventoryItems: number;
                requests: number;
                warehouses: number;
            };
        };
        cache: {
            status: string;
            keys: number;
            hits: number;
            misses: number;
        };
    };
    system: {
        memory: {
            used: string;
            total: string;
            rss: string;
            external?: string;
        };
        cpu?: any;
        logs: {
            directory: string;
            totalSize: string;
            files?: { name: string; size: string }[];
        };
        backups?: {
            directory: string;
            count: number;
            recent: { name: string; size: string; date: string }[];
        };
    };
}

export default function HealthPage() {
    const [health, setHealth] = useState<HealthStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [adminMode, setAdminMode] = useState(false);

    const fetchHealth = async (admin = false) => {
        setLoading(true);
        try {
            const endpoint = admin ? '/api/health/admin' : '/api/health/detailed';
            const res = await fetch(endpoint);

            if (res.ok) {
                const data = await res.json();
                setHealth(data);
                setAdminMode(admin);
            } else if (res.status === 403) {
                // Fallback to basic health if not admin
                const basicRes = await fetch('/api/health/detailed');
                if (basicRes.ok) {
                    const data = await basicRes.json();
                    setHealth(data);
                    setAdminMode(false);
                }
            } else {
                throw new Error('Failed to fetch health status');
            }
        } catch (error) {
            toast.error('Failed to fetch health status');
            // Try basic health endpoint
            try {
                const res = await fetch('/api/health');
                if (res.ok) {
                    const data = await res.json();
                    setHealth({
                        status: data.status,
                        timestamp: data.timestamp,
                        uptime: data.uptime,
                        version: 'unknown',
                        environment: 'unknown',
                        services: {
                            database: { status: 'unknown', latency: 'unknown' },
                            cache: { status: 'unknown', keys: 0, hits: 0, misses: 0 },
                        },
                        system: {
                            memory: { used: 'unknown', total: 'unknown', rss: 'unknown' },
                            logs: { directory: 'unknown', totalSize: 'unknown' },
                        },
                    });
                }
            } catch {
                // Ignore
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        // Auto refresh every 30 seconds
        const interval = setInterval(() => fetchHealth(adminMode), 30000);
        return () => clearInterval(interval);
    }, [adminMode]);

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    if (!health) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">System Health</h1>
                    <p className="text-muted-foreground">
                        Monitor system status and performance
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchHealth(false)}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        variant={adminMode ? "default" : "outline"}
                        size="sm"
                        onClick={() => fetchHealth(true)}
                        disabled={loading}
                    >
                        Admin View
                    </Button>
                </div>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-full ${health.status === 'ok' ? 'bg-green-100' : 'bg-red-100'
                                }`}>
                                {health.status === 'ok' ? (
                                    <CheckCircle className="h-6 w-6 text-green-600" />
                                ) : (
                                    <XCircle className="h-6 w-6 text-red-600" />
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Status</p>
                                <p className="text-lg font-semibold capitalize">{health.status}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-blue-100">
                                <Clock className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Uptime</p>
                                <p className="text-lg font-semibold">{formatUptime(health.uptime)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-purple-100">
                                <Server className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Version</p>
                                <p className="text-lg font-semibold">{health.version}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-orange-100">
                                <Activity className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Environment</p>
                                <p className="text-lg font-semibold capitalize">{health.environment}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Services Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Services
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Database */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                            <Database className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Database</p>
                                <p className="text-sm text-muted-foreground">
                                    Latency: {health.services.database.latency}
                                </p>
                            </div>
                        </div>
                        <Badge variant={health.services.database.status === 'connected' ? 'success' : 'destructive'}>
                            {health.services.database.status}
                        </Badge>
                    </div>

                    {/* Cache */}
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                            <HardDrive className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Cache</p>
                                <p className="text-sm text-muted-foreground">
                                    {health.services.cache.keys} keys | {health.services.cache.hits} hits | {health.services.cache.misses} misses
                                </p>
                            </div>
                        </div>
                        <Badge variant={health.services.cache.status === 'active' ? 'success' : 'secondary'}>
                            {health.services.cache.status}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Database Stats (Admin only) */}
            {adminMode && health.services.database.stats && (
                <Card>
                    <CardHeader>
                        <CardTitle>Database Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-2xl font-bold">{health.services.database.stats.users}</p>
                                <p className="text-sm text-muted-foreground">Users</p>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-2xl font-bold">{health.services.database.stats.inventoryItems}</p>
                                <p className="text-sm text-muted-foreground">Inventory Items</p>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-2xl font-bold">{health.services.database.stats.requests}</p>
                                <p className="text-sm text-muted-foreground">Requests</p>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <p className="text-2xl font-bold">{health.services.database.stats.warehouses}</p>
                                <p className="text-sm text-muted-foreground">Warehouses</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* System Resources */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        System Resources
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Memory Used</p>
                            <p className="text-xl font-semibold">{health.system.memory.used}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Memory Total</p>
                            <p className="text-xl font-semibold">{health.system.memory.total}</p>
                        </div>
                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">RSS</p>
                            <p className="text-xl font-semibold">{health.system.memory.rss}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Logs & Backups (Admin only) */}
            {adminMode && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Logs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Directory</p>
                                    <p className="font-mono text-sm">{health.system.logs.directory}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Size</p>
                                    <p className="font-semibold">{health.system.logs.totalSize}</p>
                                </div>
                            </div>
                            {health.system.logs.files && health.system.logs.files.length > 0 && (
                                <div className="space-y-2">
                                    {health.system.logs.files.slice(0, 5).map((file) => (
                                        <div key={file.name} className="flex justify-between text-sm">
                                            <span className="font-mono">{file.name}</span>
                                            <span className="text-muted-foreground">{file.size}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {health.system.backups && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Archive className="h-5 w-5" />
                                    Recent Backups
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Directory</p>
                                        <p className="font-mono text-sm">{health.system.backups.directory}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Total Count</p>
                                        <p className="font-semibold">{health.system.backups.count}</p>
                                    </div>
                                </div>
                                {health.system.backups.recent.length > 0 && (
                                    <div className="space-y-2">
                                        {health.system.backups.recent.map((backup) => (
                                            <div key={backup.name} className="flex justify-between text-sm">
                                                <span className="font-mono">{backup.name}</span>
                                                <div className="text-right">
                                                    <span className="text-muted-foreground mr-4">{backup.size}</span>
                                                    <span className="text-muted-foreground">
                                                        {new Date(backup.date).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                    Last updated: {new Date(health.timestamp).toLocaleString()}
                    {adminMode && " (Admin view shows detailed information)"}
                </AlertDescription>
            </Alert>
        </div>
    );
}
