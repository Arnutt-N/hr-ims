'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { LocaleProvider } from '@/lib/i18n/provider';
import type { Locale } from '@/lib/i18n/messages';

export function Providers({
    children,
    initialLocale,
}: {
    children: React.ReactNode;
    initialLocale?: Locale;
}) {
    return (
        <SessionProvider>
            <LocaleProvider initialLocale={initialLocale}>
                {children}
                <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    expand={false}
                    toastOptions={{
                        className: 'font-medium',
                    }}
                />
            </LocaleProvider>
        </SessionProvider>
    );
}
