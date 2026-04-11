/**
 * Mapping from app route path -> translation key for the top-bar page title.
 *
 * Resolution order (first match wins):
 *   1. Exact match on pathname
 *   2. Longest matching prefix (so /settings/system picks up the specific key,
 *      not the generic /settings one)
 *   3. Default "dashboard" key as a catch-all
 */

export const PAGE_TITLE_KEYS: Readonly<Record<string, string>> = Object.freeze({
    '/dashboard': 'header.title.dashboard',
    '/inventory': 'header.title.inventory',
    '/cart': 'header.title.cart',
    '/my-assets': 'header.title.my-assets',
    '/requests': 'header.title.requests',
    '/maintenance': 'header.title.maintenance',
    '/history': 'header.title.history',
    '/reports': 'header.title.reports',
    '/scanner': 'header.title.scanner',
    '/tags': 'header.title.tags',
    '/users': 'header.title.users',
    '/logs': 'header.title.logs',
    '/warehouse': 'header.title.warehouse',
    // Settings tree — more specific paths listed first so prefix matching
    // picks the right one.
    '/settings/system': 'header.title.settings.system',
    '/settings/warehouses': 'header.title.settings.warehouses',
    '/settings/departments': 'header.title.settings.departments',
    '/settings/categories': 'header.title.settings.categories',
    '/settings/permissions': 'header.title.settings.permissions',
    '/settings/sessions': 'header.title.settings.sessions',
    '/settings/logging': 'header.title.settings.logging',
    '/settings/backup': 'header.title.settings.backup',
    '/settings/email': 'header.title.settings.email',
    '/settings/health': 'header.title.settings.health',
    '/settings': 'header.title.settings',
});

export function resolvePageTitleKey(pathname: string): string {
    // Exact match
    if (PAGE_TITLE_KEYS[pathname]) {
        return PAGE_TITLE_KEYS[pathname];
    }

    // Longest prefix match — sort keys by length descending so specific
    // routes win over generic ones. We do this once at lookup time since
    // the route list is small.
    const prefixMatch = Object.keys(PAGE_TITLE_KEYS)
        .sort((a, b) => b.length - a.length)
        .find((route) => pathname.startsWith(`${route}/`) || pathname === route);

    if (prefixMatch) {
        return PAGE_TITLE_KEYS[prefixMatch];
    }

    return 'header.title.dashboard';
}
