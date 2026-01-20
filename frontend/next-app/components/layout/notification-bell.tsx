'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { getNotifications, markAsRead } from '@/lib/actions/notifications';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationBell() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        const res = await getNotifications();
        if (res.notifications) {
            setNotifications(res.notifications);
            setUnreadCount(res.unreadCount || 0);
        }
    };

    // Poll every 30 seconds
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (id: number) => {
        await markAsRead(id);
        // Optimistic update
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[9px] text-white justify-center items-center">
                                {/* {unreadCount} */}
                            </span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <h4 className="font-medium text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">{unreadCount} New</Badge>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No new notifications</p>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map((n) => (
                                <div key={n.id} className="p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => handleMarkAsRead(n.id)}>
                                    <p className="text-sm text-gray-800">{n.text}</p>
                                    <span className="text-xs text-gray-400 block mt-1">
                                        {new Date(n.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="mt-2 pt-2 border-t text-center">
                    <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-xs text-gray-500 w-full">
                        Close
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
