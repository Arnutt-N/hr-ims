'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Package,
    FileText,
    History,
    Settings,
    Users,
    LogOut,
    Menu,
    X
} from 'lucide-react';
import { useState } from 'react';

import { logout } from '@/lib/actions/auth';

const sidebarItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/inventory', icon: Package, label: 'Inventory' },
    { href: '/requests', icon: FileText, label: 'Requests' },
    { href: '/history', icon: History, label: 'History' },
    { href: '/users', icon: Users, label: 'Users', adminOnly: true },
    { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            <div
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:inset-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex flex-col h-full">
                    <div className="h-16 flex items-center px-6 border-b border-slate-800">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            HR-IMS Pro
                        </h1>
                    </div>

                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {sidebarItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                        isActive
                                            ? "bg-indigo-600 text-white"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                                    )}
                                >
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-slate-800">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 w-full text-left text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
