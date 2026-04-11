'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, translate, type Locale } from './messages';

type LocaleContextValue = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, values?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Reads the locale cookie from document.cookie. Returns DEFAULT_LOCALE if
 * the cookie is missing or the value is not a supported locale.
 */
function readCookieLocale(): Locale {
    if (typeof document === 'undefined') return DEFAULT_LOCALE;
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
    if (!match) return DEFAULT_LOCALE;
    const value = match.slice(LOCALE_COOKIE.length + 1) as Locale;
    return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

function writeCookieLocale(locale: Locale): void {
    if (typeof document === 'undefined') return;
    // One-year max-age; SameSite=Lax so the cookie travels with navigation.
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Client-side locale provider. Wraps the app so any client component can
 * call useI18n() to get the current locale + t() function.
 *
 * Server components cannot read React context, so for them we read the
 * cookie directly via next/headers in a sibling helper (see `readLocaleFromCookies`).
 */
export function LocaleProvider({
    initialLocale,
    children,
}: {
    initialLocale?: Locale;
    children: ReactNode;
}) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

    // On first mount, reconcile with whatever the cookie actually says —
    // handles the case where the server-rendered `initialLocale` was stale
    // or the user cleared cookies in another tab.
    useEffect(() => {
        const cookieLocale = readCookieLocale();
        if (cookieLocale !== locale) {
            setLocaleState(cookieLocale);
        }
        // Run only once on mount — subsequent updates come through setLocale.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reflect the selected locale on <html lang="..."> for accessibility and
    // browser hints (e.g. font fallback, hyphenation).
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = locale;
        }
    }, [locale]);

    const setLocale = useCallback((next: Locale) => {
        writeCookieLocale(next);
        setLocaleState(next);
    }, []);

    const t = useCallback(
        (key: string, values?: Record<string, string | number>) => translate(locale, key, values),
        [locale],
    );

    return (
        <LocaleContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LocaleContext.Provider>
    );
}

/**
 * Client hook for translations. Throws if called outside LocaleProvider
 * so missing provider wrap-ups are caught at development time.
 */
export function useI18n(): LocaleContextValue {
    const ctx = useContext(LocaleContext);
    if (!ctx) {
        throw new Error('useI18n must be called inside <LocaleProvider>');
    }
    return ctx;
}
