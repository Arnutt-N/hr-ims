'use client';

import { Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';

/**
 * Two-state language toggle. Shows the currently-active locale code and
 * switches to the opposite locale on click. The provider persists the
 * choice in a cookie and updates React context so client components
 * re-render immediately.
 *
 * Server components that call getServerT() read the locale from the
 * cookie at render time, so we also call router.refresh() after toggling
 * — that tells Next.js to re-fetch the current route's server components,
 * picking up the new cookie value. Without it, clicking the toggle would
 * translate the sidebar and header instantly but leave the main content
 * (rendered on the server) stuck in the previous locale until the user
 * navigated somewhere else.
 */
export function LocaleToggle() {
    const router = useRouter();
    const { locale, setLocale, t } = useI18n();
    const next = locale === 'th' ? 'en' : 'th';

    const handleClick = () => {
        setLocale(next);
        // Re-fetch the current route's server components with the new cookie.
        router.refresh();
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            aria-label={t('header.locale.switch')}
            title={t('header.locale.switch')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer"
        >
            <Languages size={16} className="text-slate-400" />
            <span>{locale === 'th' ? 'ไทย' : 'EN'}</span>
        </button>
    );
}
