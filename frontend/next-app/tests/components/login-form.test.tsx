import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 19 only flushes updates inside act() when the test renderer is opted in.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/lib/actions/auth', () => ({
    authenticate: vi.fn(async () => undefined),
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function buttonByText(name: string): HTMLButtonElement | null {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find((element) => (element.textContent ?? '').includes(name)) ?? null;
}

function headingByText(name: string): Element | null {
    const headings = Array.from(document.querySelectorAll('h1,h2,h3'));
    return headings.find((element) => element.textContent === name) ?? null;
}

async function renderLogin(locale: 'en' | 'th' = 'en') {
    // LocaleProvider reconciles against the cookie on mount and otherwise
    // falls back to Thai, which would hide the English strings under test.
    document.cookie = `hr-ims-locale=${locale}; path=/`;
    const { default: LoginForm } = await import('@/components/auth/login-form');
    const { LocaleProvider } = await import('@/lib/i18n/provider');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
        root!.render(
            <LocaleProvider initialLocale={locale}>
                <LoginForm />
            </LocaleProvider>,
        );
    });
}

describe('LoginForm Quick Demo panel', () => {
    beforeEach(() => {
        // demo-accounts.ts reads process.env at module load. Clear the flag
        // before resetting modules so a stub left by a prior case cannot leak
        // into the freshly imported module graph.
        delete process.env.NEXT_PUBLIC_DEMO_MODE;
        vi.resetModules();
        // jsdom keeps cookies across cases inside one file. LocaleProvider
        // reconciles against this cookie on mount, so clear stale locales.
        document.cookie = 'hr-ims-locale=; path=/; max-age=0';
        HTMLFormElement.prototype.requestSubmit = vi.fn();
    });

    afterEach(async () => {
        await act(async () => {
            root?.unmount();
        });
        container?.remove();
        root = null;
        container = null;
        document.cookie = 'hr-ims-locale=; path=/; max-age=0';
        vi.unstubAllEnvs();
        delete process.env.NEXT_PUBLIC_DEMO_MODE;
    });

    it.each(['', 'false', 'TRUE', '1', 'yes', 'true '])(
        'hides the panel when NEXT_PUBLIC_DEMO_MODE is %j',
        async (value) => {
            vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', value);
            vi.resetModules();
            await renderLogin();
            await vi.waitFor(
                () => expect(buttonByText('Sign In to Dashboard')).not.toBeNull(),
                { timeout: 5000, interval: 50 }
            );
            expect(headingByText('Quick Demo Access')).toBeNull();
            expect(buttonByText('Superadmin')).toBeNull();
        },
        60000,
    );

    it('hides the panel and the credential list when the flag is unset', async () => {
        delete process.env.NEXT_PUBLIC_DEMO_MODE;
        vi.resetModules();
        await renderLogin('th');
        await vi.waitFor(
            () => expect(buttonByText('เข้าสู่ระบบ')).not.toBeNull(),
            { timeout: 5000, interval: 50 }
        );
        expect(headingByText('เข้าระบบทดลอง')).toBeNull();
        expect(document.body.textContent).not.toContain('คลิกบทบาทเพื่อเข้าสู่ระบบอัตโนมัติ');
        expect(buttonByText('Superadmin')).toBeNull();

        const { DEMO_ACCOUNTS } = await import('@/components/auth/demo-accounts');
        expect(DEMO_ACCOUNTS).toEqual([]);
    }, 60000);

    it('renders the panel and fills the login form when the flag is exactly true', async () => {
        vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
        vi.resetModules();
        await renderLogin('en');

        await vi.waitFor(
            () => expect(headingByText('Quick Demo Access')).not.toBeNull(),
            { timeout: 5000, interval: 50 }
        );
        expect(document.body.textContent).toContain('Click any role to auto-login');

        const { DEMO_ACCOUNTS } = await import('@/components/auth/demo-accounts');
        expect(DEMO_ACCOUNTS.map((account) => account.email)).toEqual([
            'superadmin@demo.com',
            'admin@demo.com',
            'approver@demo.com',
            'auditor@demo.com',
            'tech@demo.com',
            'user@demo.com',
        ]);

        const superadmin = DEMO_ACCOUNTS.find((account) => account.role === 'Superadmin');
        expect(superadmin?.email).toBe('superadmin@demo.com');

        await act(async () => {
            buttonByText('Superadmin')!.click();
        });

        const emailInput = document.querySelector<HTMLInputElement>('#email');
        const passwordInput = document.querySelector<HTMLInputElement>('#password');
        expect(emailInput?.value).toBe('superadmin@demo.com');
        expect(passwordInput?.value).toBe(superadmin?.password);

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 150));
        });
        expect(HTMLFormElement.prototype.requestSubmit).toHaveBeenCalled();
    }, 60000);
});

