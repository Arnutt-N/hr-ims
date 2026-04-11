'use client';

import { motion } from 'framer-motion';
import { useI18n } from '@/lib/i18n/provider';
import type { Locale } from '@/lib/i18n/messages';

/**
 * Segmented-control language toggle. Two pill segments sit side by side
 * (TH | EN) with an animated highlight that slides under the active one
 * when the user clicks the other segment.
 *
 * After writing the cookie via setLocale() we hard-reload the page so
 * Server Components re-render against the new cookie — see comment in
 * the previous version of this file for the reasoning.
 */
const OPTIONS: ReadonlyArray<{ value: Locale; short: string; aria: string }> = [
    { value: 'th', short: 'TH', aria: 'ภาษาไทย' },
    { value: 'en', short: 'EN', aria: 'English' },
];

export function LocaleToggle() {
    const { locale, setLocale } = useI18n();

    const handleSelect = (value: Locale) => {
        if (value === locale) return;
        setLocale(value);
        if (typeof window !== 'undefined') {
            // Force Server Components to re-render against the new cookie.
            window.location.reload();
        }
    };

    return (
        <div
            role="radiogroup"
            aria-label="Language"
            className="relative hidden sm:inline-flex items-center p-0.5 rounded-full bg-slate-100 border border-slate-200"
        >
            {OPTIONS.map((option) => {
                const isActive = option.value === locale;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        aria-label={option.aria}
                        onClick={() => handleSelect(option.value)}
                        className={`relative z-10 px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors cursor-pointer ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {isActive && (
                            <motion.span
                                layoutId="locale-toggle-pill"
                                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                aria-hidden="true"
                            />
                        )}
                        <span className="relative z-10">{option.short}</span>
                    </button>
                );
            })}
        </div>
    );
}
