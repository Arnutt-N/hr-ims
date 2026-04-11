'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
    MapPin,
    Activity,
    FolderOpen,
    Shield,
    Mail,
    Database,
    Lock,
    FileCode,
    HeartPulse
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { motion, AnimatePresence } from 'framer-motion';
import { logout } from '@/lib/actions/auth';

interface SidebarItem {
    href: string;
    icon: any;
    label: string;
    count?: number;
    hasSubMenu?: boolean;
    submenu?: { href: string; label: string; icon: any; allowedRoles?: string[] }[];
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
    { href: '/users', icon: Users, label: 'Users', allowedRoles: ['superadmin', 'admin'] },
    { href: '/logs', icon: Activity, label: 'Audit Logs', allowedRoles: ['superadmin', 'admin', 'auditor'] },

    // Settings Menu with Sub-menu (รวมเมนูเดิมและใหม่)
    {
        label: 'Settings',
        icon: Settings,
        href: '/settings',
        hasSubMenu: true,
        allowedRoles: ['superadmin', 'admin'],
        submenu: [
            // เมนูเดิม
            { href: '/settings/categories', label: 'Categories', icon: FolderOpen },
            { href: '/settings/warehouses', label: 'Warehouses', icon: Box },
            { href: '/settings/departments', label: 'Dept Mapping', icon: MapPin },

            // เมนูใหม่ - System Configuration (Superadmin only)
            { href: '/settings/system', label: 'System Config', icon: Settings, allowedRoles: ['superadmin'] },
            { href: '/settings/permissions', label: 'Permissions', icon: Shield },
            { href: '/settings/sessions', label: 'Active Sessions', icon: Lock },
            { href: '/settings/logging', label: 'Logging', icon: FileCode, allowedRoles: ['superadmin'] },
            { href: '/settings/backup', label: 'Backup & Restore', icon: Database, allowedRoles: ['superadmin'] },
            { href: '/settings/email', label: 'Email Config', icon: Mail, allowedRoles: ['superadmin'] },
            { href: '/settings/health', label: 'System Health', icon: HeartPulse },
        ]
    },
];

// Query-string keys that act as mutually-exclusive tab selectors across
// sibling submenu items. If the current URL contains any of these keys,
// a "default" child link (one whose href has no query string) must NOT
// highlight — otherwise "All Items" and "Borrow" would both look active
// at the same time when the user is on /inventory?type=durable.
//
// Add more keys here if new tab-style submenus are introduced (e.g. for
// requests or warehouse filters).
const MUTEX_QUERY_KEYS = ['type'];

/**
 * Maps the English label (used as the data-model key) to a translation key.
 * Anything not in the map falls back to the raw label, which is also the
 * fallback behavior of translate() when a key is missing — so untranslated
 * items still render, just in English.
 */
const SIDEBAR_LABEL_KEYS: Readonly<Record<string, string>> = Object.freeze({
    'Dashboard': 'sidebar.dashboard',
    'Inventory': 'sidebar.inventory',
    'All Items': 'sidebar.inventory.all',
    'Borrow (Durable)': 'sidebar.inventory.borrow',
    'Withdraw': 'sidebar.inventory.withdraw',
    'Cart': 'sidebar.cart',
    'My Assets': 'sidebar.my-assets',
    'Requests': 'sidebar.requests',
    'Maintenance': 'sidebar.maintenance',
    'History': 'sidebar.history',
    'Reports': 'sidebar.reports',
    'Scanner': 'sidebar.scanner',
    'Tags': 'sidebar.tags',
    'Users': 'sidebar.users',
    'Audit Logs': 'sidebar.logs',
    'Settings': 'sidebar.settings',
    'Categories': 'sidebar.settings.categories',
    'Warehouses': 'sidebar.settings.warehouses',
    'Dept Mapping': 'sidebar.settings.departments',
    'System Config': 'sidebar.settings.system',
    'Permissions': 'sidebar.settings.permissions',
    'Active Sessions': 'sidebar.settings.sessions',
    'Logging': 'sidebar.settings.logging',
    'Backup & Restore': 'sidebar.settings.backup',
    'Email Config': 'sidebar.settings.email',
    'System Health': 'sidebar.settings.health',
});

function sidebarLabelKey(label: string): string {
    return SIDEBAR_LABEL_KEYS[label] ?? label;
}

function isHrefActive(href: string, pathname: string, searchParams: ReturnType<typeof useSearchParams>) {
    const [targetPath, targetQuery] = href.split('?');
    if (pathname !== targetPath) return false;

    if (!targetQuery) {
        // Default/"All" link — active only when no sibling tab selector is set.
        return !MUTEX_QUERY_KEYS.some((key) => searchParams.get(key));
    }

    const expectedParams = new URLSearchParams(targetQuery);
    let matches = true;
    expectedParams.forEach((value, key) => {
        if (searchParams.get(key) !== value) matches = false;
    });

    return matches;
}

export function Sidebar({ user }: { user?: any }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { t } = useI18n();
    const [isOpen, setIsOpen] = useState(false); // Mobile state
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

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
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-600 cursor-pointer"
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
                    "fixed md:relative inset-y-0 left-0 z-50 h-[100dvh] w-72 transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col overflow-hidden shadow-2xl border-r border-white/5",
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
                            <p className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">{t('sidebar.brand.subtitle')}</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="relative z-10 flex-1 px-4 py-6 space-y-1 overflow-y-auto sidebar-scrollbar">
                    {sidebarItems.map((item, idx) => {
                        // 1. Superadmin bypass
                        if (user?.role === 'superadmin') {
                            // Proceed to render
                        }
                        // 2. Common/Public Items (No restrictions defined) -> Always Show
                        else if (!item.allowedRoles && !item.adminOnly) {
                            // Proceed to render (Dashboard, Inventory, Cart, My Assets)
                        }
                        // 3. Dynamic Permission Check (Only if permissions exist)
                        else if (user?.permissions && Array.isArray(user.permissions) && user.permissions.length > 0) {
                            // Check if current item path is in permissions
                            const hasPermission = user.permissions.includes(item.href);
                            if (!hasPermission) return null;
                        }
                        // 4. Fallback to Legacy Role check
                        else {
                            if (item.allowedRoles && (!user?.role || !item.allowedRoles.includes(user.role))) return null;
                            if (!item.allowedRoles && item.adminOnly && user?.role !== 'admin') return null;
                        }

                        if (item.hasSubMenu) {
                            const isActiveParent = item.href
                                ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                                : false;
                            const visibleSubmenuItems = item.submenu?.filter((sub) => {
                                if (!sub.allowedRoles) return true;
                                return !!user?.role && sub.allowedRoles.includes(user.role);
                            }) ?? [];
                            const hasActiveSubmenu = visibleSubmenuItems.some((sub) => isHrefActive(sub.href, pathname, searchParams));
                            const isSubMenuOpen = openMenus[item.label] ?? (isActiveParent || hasActiveSubmenu);

                            return (
                                <div key={idx} className="mb-2">
                                    <button
                                        onClick={() => setOpenMenus((prev) => ({
                                            ...prev,
                                            [item.label]: !(prev[item.label] ?? (isActiveParent || hasActiveSubmenu)),
                                        }))}
                                        className={cn(
                                            "w-full flex items-center justify-between p-3.5 rounded-xl transition-all duration-200 group cursor-pointer",
                                            isActiveParent ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon size={20} className={isActiveParent ? "text-blue-400" : "text-slate-500 group-hover:text-blue-300"} />
                                            <span className="font-medium text-sm">{t(sidebarLabelKey(item.label))}</span>
                                        </div>
                                        {isSubMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    </button>

                                    <AnimatePresence>
                                        {isSubMenuOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="pl-4 mt-1 space-y-1">
                                                    {visibleSubmenuItems.map((sub, subIdx) => {
                                                        const isSubActive = isHrefActive(sub.href, pathname, searchParams);

                                                        return (
                                                            <Link
                                                                key={subIdx}
                                                                href={sub.href}
                                                                className={cn(
                                                                    "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-sm pl-11 relative group/sub mb-1",
                                                                    isSubActive
                                                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-900/30"
                                                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                                                )}
                                                            >
                                                                {sub.icon && <sub.icon size={16} className={cn(
                                                                    "transition-colors",
                                                                    isSubActive ? "text-white" : "text-slate-500 group-hover/sub:text-blue-300"
                                                                )} />}
                                                                <span>{t(sidebarLabelKey(sub.label))}</span>
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
                                    <span className="font-medium text-sm">{t(sidebarLabelKey(item.label))}</span>
                                </div>
                                {item.count && (
                                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                        {item.count}
                                    </span>
                                )}
                            </Link>
                        );
                    })
                    }
                </nav>

                {/* Footer */}
                <div className="relative z-10 p-6 border-t border-white/10 bg-black/10 backdrop-blur-sm mt-2">
                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-4 w-full p-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group cursor-pointer"
                    >
                        <LogOut size={22} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium text-sm">{t('sidebar.sign-out')}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}

