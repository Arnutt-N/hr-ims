import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
