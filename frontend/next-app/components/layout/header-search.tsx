'use client';

import { Search } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';

/**
 * Locale-aware search input for the top bar. Extracted from Header so the
 * placeholder text can respond to the language toggle without forcing the
 * whole Header into a client component.
 */
export function SearchInput() {
    const { t } = useI18n();
    return (
        <div className="hidden md:flex items-center bg-slate-100/50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 transition-all w-64">
            <Search size={18} className="text-slate-400" />
            <input
                type="text"
                placeholder={t('header.search.placeholder')}
                className="bg-transparent border-none focus:outline-none text-sm ml-3 w-full text-slate-600 placeholder:text-slate-400"
            />
        </div>
    );
}
