'use client';

// [2026-11-10] Modified by Cursor: Quick Demo panel. Imported by the login form
// only while NEXT_PUBLIC_DEMO_MODE === 'true'; otherwise webpack swaps in
// demo-quick-access-off.tsx so this module stays out of the client bundle.

import { Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n/provider';
import { DEMO_ACCOUNTS } from './demo-accounts';

type DemoQuickAccessProps = {
    onLogin: (email: string, password: string) => void;
};

export default function DemoQuickAccess({ onLogin }: DemoQuickAccessProps) {
    const { t } = useI18n();

    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' || DEMO_ACCOUNTS.length === 0) {
        return null;
    }

    return (
        <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Sparkles size={16} className="text-yellow-400" />
                <h3 className="text-sm font-semibold text-blue-200">{t('login.demo.title')}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                    <button
                        key={account.email}
                        type="button"
                        onClick={() => onLogin(account.email, account.password)}
                        className={`px-3 py-2 rounded-lg bg-gradient-to-r ${account.color} text-white text-xs font-medium hover:opacity-90 transition-opacity shadow-md cursor-pointer`}
                    >
                        {account.role}
                    </button>
                ))}
            </div>
            <p className="text-xs text-slate-400 mt-3">{t('login.demo.hint')}</p>
        </div>
    );
}
