'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNotifications, markAsRead, markAllAsRead, checkLowStock } from '@/lib/actions/notifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatRelativeTime } from '@/lib/date-utils';

export function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const fetchData = async () => {
        try {
            const res = await getNotifications();
            if (res.notifications) {
                setNotifications(res.notifications);
                setUnreadCount(res.unreadCount || 0);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    useEffect(() => {
        fetchData();
        // Trigger a check when component mounts
        checkLowStock();

        const interval = setInterval(() => {
            fetchData();
            checkLowStock();
        }, 60000); // Check every 1 min

        // Click outside to close
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            clearInterval(interval);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleMarkRead = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        await markAsRead(id);
        fetchData();
    };

    const handleMarkAllRead = async () => {
        setLoading(true);
        const res = await markAllAsRead();
        if (res.success) {
            setNotifications([]);
            setUnreadCount(0);
            toast.success('All notifications cleared');
        }
        setLoading(false);
        setOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    "relative p-2.5 rounded-xl transition-all outline-none cursor-pointer",
                    open ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-indigo-600 hover:bg-slate-50"
                )}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-[350px] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-800">Notifications</h4>
                            {unreadCount > 0 && (
                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-1.5 h-5 text-[10px]">
                                    {unreadCount}
                                </Badge>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={loading}
                                className="h-auto p-1.5 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg group transition-colors"
                                onClick={handleMarkAllRead}
                                title="Clear all"
                            >
                                <Trash2 size={14} className="mr-1.5" />
                                Clear all
                            </Button>
                        )}
                    </div>

                    <ScrollArea className="h-[350px]">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-8">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                    <Bell size={24} className="opacity-20 translate-y-[-1px]" />
                                </div>
                                <p className="text-sm font-medium">All caught up!</p>
                                <p className="text-xs mt-1 text-center">No new notifications to show right now.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((item) => (
                                    <div
                                        key={item.id}
                                        className="p-4 hover:bg-slate-50 transition-colors flex gap-3 group items-start cursor-default"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                                            <Bell size={14} className="text-amber-600" />
                                        </div>
                                        <div className="flex-1 space-y-1 overflow-hidden">
                                            <p className="text-sm text-slate-700 leading-snug font-medium">
                                                {item.text}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                {formatRelativeTime(item.createdAt)}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => handleMarkRead(item.id, e)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 shadow-sm cursor-pointer"
                                            title="Mark as read"
                                        >
                                            <Check size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {notifications.length > 0 && (
                        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                            <button className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer">
                                View all notification history
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
