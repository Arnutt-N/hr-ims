'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getNotifications, markAsRead, markAllAsRead } from '@/lib/actions/notifications';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Notifications() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Poll every 1 min

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

    const fetchData = async () => {
        const data = await getNotifications();
        setNotifications(data);
    };

    const handleMarkRead = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        await markAsRead(id);
        fetchData(); // Refresh local state
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setNotifications([]);
        toast.success('All notifications marked as read');
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-all outline-none"
            >
                <Bell size={20} />
                {notifications.length > 0 && (
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse"></span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-[350px] bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                        <h4 className="font-semibold text-sm text-slate-800">Notifications</h4>
                        {notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-transparent"
                                onClick={handleMarkAllRead}
                            >
                                Mark all read
                            </Button>
                        )}
                    </div>

                    <div className="h-[300px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                                <Bell size={32} className="mb-2 opacity-20" />
                                <p className="text-xs">No new notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((item) => (
                                    <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-3 w-full cursor-default">
                                        <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm text-slate-700 leading-snug">{item.text}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => handleMarkRead(item.id, e)}
                                            className="text-slate-300 hover:text-indigo-600 shrink-0 self-start p-1 bg-transparent border-0 cursor-pointer"
                                            title="Mark as read"
                                        >
                                            <Check size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
