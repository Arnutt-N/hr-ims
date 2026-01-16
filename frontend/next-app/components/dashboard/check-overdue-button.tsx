'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { checkOverdueItems } from '@/lib/actions/requests';
import { toast } from 'sonner';
import { TimerReset, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CheckOverdueButton() {
    const [loading, setLoading] = useState(false);

    const handleCheck = async () => {
        setLoading(true);
        try {
            const res = await checkOverdueItems();
            if (res.error) {
                toast.error(res.error);
            } else {
                if (res.count && res.count > 0) {
                    toast.success(`Found and flagged ${res.count} overdue items.`);
                } else {
                    toast.info('No new overdue items found.');
                }
            }
        } catch (error) {
            toast.error('Failed to check overdue items');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleCheck}
            disabled={loading}
            className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
        >
            <TimerReset className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            {loading ? 'Checking...' : 'Check Overdue'}
        </Button>
    );
}
