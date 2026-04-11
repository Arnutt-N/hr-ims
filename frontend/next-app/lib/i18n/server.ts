import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, translate, type Locale } from './messages';

/**
 * Read the current locale from the request cookie in a Server Component.
 * Falls back to DEFAULT_LOCALE when the cookie is missing or invalid.
 *
 * Client components should use `useI18n()` instead.
 */
export async function readLocaleFromCookies(): Promise<Locale> {
    const store = await cookies();
    const value = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
    if (value && SUPPORTED_LOCALES.includes(value)) {
        return value;
    }
    return DEFAULT_LOCALE;
}

/**
 * Convenience helper for translating strings in Server Components. Reads
 * the locale cookie once and returns a bound t() function along with the
 * resolved locale (useful for date formatting etc.).
 */
export async function getServerT(): Promise<{
    locale: Locale;
    t: (key: string, values?: Record<string, string | number>) => string;
}> {
    const locale = await readLocaleFromCookies();
    return {
        locale,
        t: (key, values) => translate(locale, key, values),
    };
}
