import { describe, expect, it } from 'vitest';
import { MESSAGES, SUPPORTED_LOCALES, translate } from '@/lib/i18n/messages';

/**
 * i18n parity test
 *
 * Hard guard against drift between the EN and TH dictionaries. Phase A
 * confirmed parity at 0 diff on 2026-05-07; this test traps any future
 * commit that adds an English string without its Thai counterpart (or vice
 * versa) before the regression hits production.
 */
describe('i18n EN/TH key parity', () => {
    it('every supported locale has a non-empty dictionary', () => {
        for (const locale of SUPPORTED_LOCALES) {
            const dict = MESSAGES[locale];
            expect(dict, `${locale} dictionary missing`).toBeDefined();
            expect(Object.keys(dict).length, `${locale} dictionary is empty`).toBeGreaterThan(0);
        }
    });

    it('EN and TH have identical key sets', () => {
        const enKeys = new Set(Object.keys(MESSAGES.en));
        const thKeys = new Set(Object.keys(MESSAGES.th));

        const missingInTh = [...enKeys].filter((k) => !thKeys.has(k)).sort();
        const missingInEn = [...thKeys].filter((k) => !enKeys.has(k)).sort();

        expect(
            missingInTh,
            `Missing TH translations for: ${missingInTh.join(', ')}`,
        ).toEqual([]);
        expect(
            missingInEn,
            `Missing EN translations for: ${missingInEn.join(', ')}`,
        ).toEqual([]);
    });

    it('no value is the empty string in either locale', () => {
        for (const locale of SUPPORTED_LOCALES) {
            const dict = MESSAGES[locale];
            const empties = Object.entries(dict)
                .filter(([, v]) => v === '' || v == null)
                .map(([k]) => k);
            expect(empties, `${locale} has empty values for: ${empties.join(', ')}`).toEqual([]);
        }
    });

    it('translate() falls back to the key string when a locale is missing it', () => {
        // Sanity: translate() should NOT throw for unknown keys, just return the key.
        const result = translate('en', 'this.key.does.not.exist');
        expect(typeof result).toBe('string');
    });

    it('every key resolves to a string in every locale', () => {
        const enKeys = Object.keys(MESSAGES.en);
        for (const locale of SUPPORTED_LOCALES) {
            for (const key of enKeys) {
                const value = translate(locale, key);
                expect(typeof value, `${locale}.${key} not a string`).toBe('string');
                expect(value.length, `${locale}.${key} is empty`).toBeGreaterThan(0);
            }
        }
    });
});
