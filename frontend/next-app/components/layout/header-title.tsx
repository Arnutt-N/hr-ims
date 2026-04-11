'use client';

import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n/provider';
import { resolvePageTitleKey } from '@/lib/i18n/page-titles';
import { formatThaiDate } from '@/lib/date-utils';

/**
 * Dynamic top-bar title that reads the current pathname and looks up the
 * matching translation key. Date subtitle reflects the active locale:
 * Thai uses the Buddhist calendar helper; English uses Intl.DateTimeFormat.
 */
export function HeaderTitle() {
    const pathname = usePathname();
    const { t, locale } = useI18n();

    const titleKey = resolvePageTitleKey(pathname);
    const title = t(titleKey);

    const today =
        locale === 'th'
            ? formatThaiDate(new Date())
            : new Intl.DateTimeFormat('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(new Date());

    return (
        <div className="flex flex-col ml-12 md:ml-0">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{today}</p>
        </div>
    );
}
