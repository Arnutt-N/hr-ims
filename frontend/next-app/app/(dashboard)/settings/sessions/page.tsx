'use client';

import { useState, useEffect } from 'react';
import { getActiveSessions, revokeSession, revokeAllOtherSessions } from '@/lib/actions/sessions';
import { Button } from '@/components/ui/button';
import { Shield, Smartphone, Monitor, Globe, XCircle, Trash2, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function SessionsPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        setLoading(true);
        const res = await getActiveSessions();
        if (res.success) {
            setSessions(res.sessions || []);
        } else {
            toast.error(res.error || 'Failed to load sessions');
        }
        setLoading(false);
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('Are you sure you want to log out this device?')) return;

        const res = await revokeSession(id);
        if (res.success) {
            toast.success('Session revoked');
            loadSessions();
        } else {
            toast.error(res.error || 'Failed to revoke session');
        }
    };

    const handleRevokeAll = async () => {
        if (!confirm('This will log out ALL devices (including this one if using DB sessions). Continue?')) return;

        const res = await revokeAllOtherSessions();
        if (res.success) {
            toast.success('All other sessions revoked. You may need to log in again.');
            loadSessions();
        } else {
            toast.error(res.error || 'Failed to revoke sessions');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="text-indigo-600" />
                        Active Sessions
                    </h2>
                    <p className="text-slate-500">Manage devices currently logged into your account.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={loadSessions} disabled={loading}>
                        <RefreshCcw size={16} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleRevokeAll}>
                        <Trash2 size={16} className="mr-2" />
                        Revoke All
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {sessions.length === 0 ? (
                    <div className="p-12 text-center">
                        <Monitor className="mx-auto text-slate-300 mb-4" size={48} />
                        <p className="text-slate-500">No active sessions found (or using JWT-only mode).</p>
                        <p className="text-xs text-slate-400 mt-2">Note: Individual session tracking requires database sessions.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {sessions.map((session) => (
                            <li key={session.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                        {session.userAgent?.toLowerCase().includes('mobile') ? <Smartphone size={24} /> : <Monitor size={24} />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900 flex items-center gap-2">
                                            {session.userAgent || 'Unknown Device'}
                                            {/* Logic to highlight current session could be added here */}
                                        </div>
                                        <div className="text-sm text-slate-500 flex items-center gap-3">
                                            {session.ipAddress && (
                                                <span className="flex items-center gap-1">
                                                    <Globe size={14} /> {session.ipAddress}
                                                </span>
                                            )}
                                            <span> Expires: {new Date(session.expires).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleRevoke(session.id)}
                                >
                                    <XCircle size={20} />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800">
                <Shield size={20} className="shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold mb-1">Security Hint</p>
                    <p>If you see a device or location you don't recognize, revoke that session immediately and change your password.</p>
                </div>
            </div>
        </div>
    );
}
