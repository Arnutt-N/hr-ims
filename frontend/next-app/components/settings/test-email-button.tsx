'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { sendTestEmail } from '@/lib/actions/test-email';

export function TestEmailButton() {
    const [loading, setLoading] = useState(false);

    const handleTestEmail = async () => {
        setLoading(true);
        const toastId = toast.loading('Sending test email...');

        try {
            const res = await sendTestEmail();

            if (res.success) {
                toast.success(res.message || 'Test email sent successfully! Check your inbox.', { id: toastId });
            } else {
                toast.error(res.error || 'Failed to send email', { id: toastId });
            }
        } catch {
            toast.error('An unexpected error occurred', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleTestEmail}
            disabled={loading}
            className="gap-2"
        >
            <Mail size={16} />
            {loading ? 'Sending...' : 'Send Test Email'}
        </Button>
    );
}
