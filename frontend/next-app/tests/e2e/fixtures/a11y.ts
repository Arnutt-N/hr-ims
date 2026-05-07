import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Accessibility scan helper for Playwright golden paths.
 *
 * Wraps `@axe-core/playwright` so each spec can drop a one-liner:
 *
 *   await runAxeScan(page, { route: '/dashboard' });
 *
 * Budget: 0 *serious* and 0 *critical* violations. Minor / moderate
 * violations are surfaced as console warnings but do NOT fail the test —
 * those are tracked separately as part of the a11y backlog.
 *
 * Loaded as a dynamic import so specs that don't run axe don't pay the
 * import cost (Mobile Chrome project is sometimes a11y-blind on Pixel 5
 * viewport sizing for non-blocking violations).
 */

type AxeResult = {
    violations: Array<{
        id: string;
        impact?: 'minor' | 'moderate' | 'serious' | 'critical' | null;
        description: string;
        nodes: Array<{ target: unknown[] }>;
    }>;
};

export async function runAxeScan(
    page: Page,
    opts: { route?: string; tag?: string } = {},
): Promise<AxeResult> {
    // Lazy import — keeps `@axe-core/playwright` out of the hot path for
    // specs that don't opt in.
    const mod = await import('@axe-core/playwright');
    const AxeBuilder = mod.default;

    const builder = new AxeBuilder({ page });
    // Stick to WCAG 2.1 AA + best-practice rules; matches Lighthouse a11y rubric.
    builder.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']);

    const result = (await builder.analyze()) as AxeResult;

    const blocking = result.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    const advisory = result.violations.filter(
        (v) => v.impact !== 'serious' && v.impact !== 'critical',
    );

    if (advisory.length > 0) {
        // Soft signal — surfaces in `--reporter=list`, doesn't fail.
        // eslint-disable-next-line no-console
        console.warn(
            `[axe] ${opts.route ?? page.url()} — ${advisory.length} non-blocking violation(s):`,
            advisory.map((v) => `${v.id}(${v.impact})`).join(', '),
        );
    }

    expect(
        blocking,
        `${opts.route ?? page.url()} — ${blocking.length} serious/critical a11y violation(s):\n${blocking
            .map((v) => `  • ${v.id} (${v.impact}): ${v.description}`)
            .join('\n')}`,
    ).toEqual([]);

    return result;
}
