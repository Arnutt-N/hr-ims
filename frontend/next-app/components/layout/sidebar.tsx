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
    X,
    ChevronDown,
    ChevronRight,
    Box,
    ClipboardList,
    Layers,
    ShoppingCart,
    PackageCheck,
    Wrench,
    BarChart3,
    ScanLine,
    QrCode,
    MapPin
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '@/lib/actions/auth';
import { Role } from '@prisma/client';

interface SidebarItem {
    href: string;
    icon: any;
    label: string;
    count?: number;
    hasSubMenu?: boolean;
    submenu?: { href: string; label: string; icon: any }[];
    adminOnly?: boolean;
    allowedRoles?: any[]; // Loose type to avoid import issues
}

const sidebarItems: SidebarItem[] = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    {
        label: 'Inventory',
        icon: Layers,
        href: '/inventory',
        hasSubMenu: true,
        submenu: [
            { href: '/inventory', label: 'All Items', icon: Package },
            { href: '/inventory?type=durable', label: 'Borrow (Durable)', icon: History },
            { href: '/inventory?type=consumable', label: 'Withdraw', icon: ClipboardList },
        ]
    },
    { href: '/cart', icon: ShoppingCart, label: 'Cart' },
    { href: '/my-assets', icon: PackageCheck, label: 'My Assets' },
    { href: '/requests', icon: FileText, label: 'Requests', allowedRoles: ['superadmin', 'admin', 'approver'] },
    { href: '/maintenance', icon: Wrench, label: 'Maintenance', allowedRoles: ['superadmin', 'admin', 'technician'] },
    { href: '/history', icon: History, label: 'History', allowedRoles: ['superadmin', 'admin', 'auditor'] },
    { href: '/reports', icon: BarChart3, label: 'Reports', allowedRoles: ['superadmin', 'admin', 'auditor'] },
    { href: '/scanner', icon: ScanLine, label: 'Scanner', allowedRoles: ['superadmin', 'admin', 'technician'] },
    { href: '/tags', icon: QrCode, label: 'Tags', allowedRoles: ['superadmin', 'admin'] },
    { href: '/settings/departments', icon: MapPin, label: 'Dept Mapping', allowedRoles: ['superadmin', 'admin'] },
    { href: '/users', icon: Users, label: 'Users', allowedRoles: ['superadmin', 'admin'] },
    { href: '/settings', icon: Settings, label: 'Settings', allowedRoles: ['superadmin'] },
];

export function Sidebar({ user }: { user?: any }) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false); // Mobile state
    const [isInventoryOpen, setIsInventoryOpen] = useState(true);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        await logout();
    };

    return (
        <>
            {/* Mobile Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-600"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Backdrop for Mobile */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <aside
                className={cn(
                    "fixed md:static inset-y-0 left-0 z-50 h-[100dvh] w-72 transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col overflow-hidden shadow-2xl border-r border-white/5",
                    isOpen ? "translate-x-0" : "-translate-x-full",
                    "bg-[#0f172a] text-white"
                )}
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#1e1b4b] to-[#172554] opacity-100 z-0 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0 pointer-events-none mix-blend-overlay"></div>

                {/* Logo Section */}
                <div className="relative z-10 p-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10">
                            <Package size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-wide text-white">IMS.Pro</h1>
                            <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">Inventory System</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="relative z-10 flex-1 px-4 py-6 space-y-1 overflow-y-auto sidebar-scrollbar">
                    {sidebarItems.map((item, idx) => {
                        // Role check
                        if (item.allowedRoles && (!user?.role || !item.allowedRoles.includes(user.role))) return null;
                        if (!item.allowedRoles && item.adminOnly && user?.role !== 'admin') return null;

                        if (item.hasSubMenu) {
                            const isActiveParent = pathname.startsWith('/inventory');

                            return (
                                <div key={idx} className="mb-2">
                                    <button
                                        onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 group",
                                            isActiveParent ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon size={20} className={isActiveParent ? "text-blue-400" : "text-slate-500 group-hover:text-blue-300"} />
                                            <span className="font-medium text-sm">{item.label}</span>
                                        </div>
                                        {isInventoryOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    <AnimatePresence>
                                        {isInventoryOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="pl-4 mt-1 space-y-1">
                                                    {item.submenu?.map((sub, subIdx) => {
                                                        const isSubActive = pathname === sub.href || (sub.href.includes('?') && pathname === sub.href.split('?')[0] && window.location.search === sub.href.split('?')[1]);
                                                        // Note: window check in SSR might fail, simpler check below
                                                        const simpleActive = pathname === sub.href.split('?')[0]; // Simplified for now

                                                        return (
                                                            <Link
                                                                key={subIdx}
                                                                href={sub.href}
                                                                className={cn(
                                                                    "flex items-center gap-3 p-3 rounded-lg transition-all text-sm pl-11 relative",
                                                                    (pathname === sub.href || (pathname === '/inventory' && sub.label === 'All Items'))
                                                                        ? "text-white font-medium bg-white/5"
                                                                        : "text-slate-500 hover:text-slate-300"
                                                                )}
                                                            >
                                                                {sub.label === 'All Items' && <Box size={16} />}
                                                                {sub.label.includes('Borrow') && <History size={16} />}
                                                                {sub.label.includes('Withdraw') && <ClipboardList size={16} />}
                                                                <span>{sub.label}</span>
                                                            </Link>
                                                        )
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        }

                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href || '#'}
                                className={cn(
                                    "flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 group mb-1",
                                    isActive
                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/20"
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon size={20} className={isActive ? "text-white" : "text-slate-500 group-hover:text-blue-300 transition-colors"} />
                                    <span className="font-medium text-sm">{item.label}</span>
                                </div>
                                {item.count && (
                                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                        {item.count}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="relative z-10 p-4 border-t border-white/10 bg-black/10 backdrop-blur-sm">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full p-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

