import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { getCachedAuth } from '@/lib/auth-cache';
import { getCachedSettings } from '@/lib/settings-cache';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [session, settings] = await Promise.all([
        getCachedAuth(),
        getCachedSettings().catch((err) => {
            console.error('Failed to load settings for layout:', err);
            return null;
        }),
    ]);

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
            <Sidebar user={session?.user} />
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Header session={session} />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    <div className="max-w-7xl mx-auto min-h-full flex flex-col">
                        <div className="flex-1">
                            {children}
                        </div>

                        {/* Dynamic Footer */}
                        <footer className="mt-12 py-6 border-t border-slate-200 text-center text-slate-400 text-sm">
                            <p>{settings?.footerText || "IMS Asset Management System"} • © {new Date().getFullYear()}</p>
                        </footer>
                    </div>
                </main>
            </div>
        </div>
    );
}
