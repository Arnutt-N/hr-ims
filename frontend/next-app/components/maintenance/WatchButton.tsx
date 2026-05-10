'use client';

import { useEffect, useState, useTransition } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WatchButtonProps {
    requestId: number;
    initialIsWatching?: boolean;
}

/**
 * Toggle subscribe/unsubscribe to a maintenance request's notifications.
 * PRP v6 Phase 6 — Q20.
 *
 * Loads initial state on mount via isWatching() Server Action; toggles via
 * watchRequest/unwatchRequest. Optimistic UI: flip state immediately, revert
 * on server error.
 */
export function WatchButton({ requestId, initialIsWatching }: WatchButtonProps) {
    const [watching, setWatching] = useState<boolean | null>(initialIsWatching ?? null);
    const [pending, startTransition] = useTransition();

    useEffect(() => {
        if (initialIsWatching !== undefined) return;
        let cancelled = false;
        async function check() {
            try {
                const { isWatching: check } = await import('@/lib/actions/maintenance-watchers');
                const r = await check(requestId);
                if (!cancelled) setWatching(r);
            } catch {
                if (!cancelled) setWatching(false);
            }
        }
        void check();
        return () => {
            cancelled = true;
        };
    }, [requestId, initialIsWatching]);

    const toggle = () => {
        if (watching === null) return;
        const next = !watching;
        setWatching(next); // optimistic
        startTransition(async () => {
            const mod = await import('@/lib/actions/maintenance-watchers');
            const r = await (next
                ? mod.watchRequest({ requestId })
                : mod.unwatchRequest({ requestId }));
            if (!('success' in r) || !r.success) {
                setWatching(!next); // revert
                toast.error(('error' in r && r.error) || 'อัปเดตไม่สำเร็จ');
            } else {
                toast.success(next ? 'ติดตามคำขอแล้ว' : 'เลิกติดตามแล้ว');
            }
        });
    };

    if (watching === null) {
        return (
            <Button size="sm" variant="outline" disabled>
                <Bell size={14} className="mr-1.5" /> กำลังโหลด...
            </Button>
        );
    }

    return (
        <Button
            size="sm"
            variant={watching ? 'default' : 'outline'}
            onClick={toggle}
            disabled={pending}
            className={watching ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
        >
            {watching ? <BellOff size={14} className="mr-1.5" /> : <Bell size={14} className="mr-1.5" />}
            {watching ? 'เลิกติดตาม' : 'ติดตามคำขอ'}
        </Button>
    );
}
