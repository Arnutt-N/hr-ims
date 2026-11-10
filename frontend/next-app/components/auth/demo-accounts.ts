// [2026-11-10] Modified by Cursor: demo credentials live in this module only.
// Next inlines NEXT_PUBLIC_DEMO_MODE at build time (see next.config.mjs). When
// the flag is not exactly "true", the account list is an empty dead branch so
// the literals can be tree-shaken. Fail closed.

export type DemoAccount = {
    role: string;
    email: string;
    password: string;
    color: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] =
    process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
        ? [
              { role: 'Superadmin', email: 'superadmin@demo.com', password: 'demo123', color: 'from-purple-600 to-pink-600' },
              { role: 'Admin', email: 'admin@demo.com', password: 'demo123', color: 'from-blue-600 to-cyan-600' },
              { role: 'Approver', email: 'approver@demo.com', password: 'demo123', color: 'from-green-600 to-emerald-600' },
              { role: 'Auditor', email: 'auditor@demo.com', password: 'demo123', color: 'from-orange-600 to-amber-600' },
              { role: 'Technician', email: 'tech@demo.com', password: 'demo123', color: 'from-indigo-600 to-blue-600' },
              { role: 'User', email: 'user@demo.com', password: 'demo123', color: 'from-slate-600 to-gray-600' },
          ]
        : [];
