'use client';

import { Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

/**
 * Two-state language toggle. Shows the currently-active locale code and
 * switches to the opposite locale on click. The provider persists the
 * choice in a cookie and updates React context so client components
 * re-render immediately.
 *
 * Server components that call getServerT() read the locale from the
 * cookie at render time, so after writing the cookie we trigger a full
 * window reload. A lighter-weight router.refresh() would be preferable,
 * but Next.js 16's RSC caching does not always include the cookie as
 * part of the cache key, so the refreshed payload can come back
 * identical to the previous render — the user sees the sidebar and
 * header flip but the main page content stays in the old locale.
 * A hard reload guarantees every server component re-runs against the
 * fresh cookie value. Losing client state is acceptable here because
 * the user explicitly asked for a global language change.
 */
export function LocaleToggle() {
    const { locale, setLocale, t } = useI18n();
    const next = locale === 'th' ? 'en' : 'th';

    const handleClick = () => {
        setLocale(next);
        // Nuclear option: full reload so every server component re-runs
        // with the freshly-written cookie. See header comment for why
        // router.refresh() is not enough.
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
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
