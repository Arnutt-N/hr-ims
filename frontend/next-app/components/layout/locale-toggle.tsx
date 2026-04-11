'use client';

import { Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

/**
 * Simple two-state language toggle. Shows the currently-active locale code
 * and switches to the opposite locale on click. The provider persists the
 * choice in a cookie so it survives reloads.
 */
export function LocaleToggle() {
    const { locale, setLocale, t } = useI18n();
    const next = locale === 'th' ? 'en' : 'th';

    return (
        <button
            type="button"
            onClick={() => setLocale(next)}
            aria-label={t('header.locale.switch')}
            title={t('header.locale.switch')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer"
        >
            <Languages size={16} className="text-slate-400" />
            <span>{locale === 'th' ? 'ไทย' : 'EN'}</span>
        </button>
    );
}
