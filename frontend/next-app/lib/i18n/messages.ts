/**
 * Translation dictionaries for the UI.
 *
 * Both languages are loaded statically — the dictionaries are small and
 * storing them separately would add bundle overhead without a real win.
 * Keys use dot-notation for soft grouping (sidebar.*, header.*, etc.).
 *
 * When adding a new string, add it to BOTH `en` and `th` at the same time
 * so nothing silently falls back to the key name at runtime.
 */

export type Locale = 'en' | 'th';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'th'] as const;
export const DEFAULT_LOCALE: Locale = 'th';
export const LOCALE_COOKIE = 'hr-ims-locale';

type Dictionary = Record<string, string>;

const en: Dictionary = {
    // Header
    'header.title.dashboard': 'Dashboard Overview',
    'header.title.inventory': 'Inventory',
    'header.title.cart': 'Cart',
    'header.title.my-assets': 'My Active Assets',
    'header.title.requests': 'Requests',
    'header.title.maintenance': 'Maintenance & Repairs',
    'header.title.history': 'Transaction History',
    'header.title.reports': 'Reports & Analytics',
    'header.title.scanner': 'Device Scanner',
    'header.title.users': 'User Management',
    'header.title.warehouse': 'Warehouse Management',
    'header.title.settings': 'System Configuration',
    'header.title.settings.system': 'System Configuration',
    'header.title.settings.warehouses': 'Warehouses',
    'header.title.settings.departments': 'Department Mapping',
    'header.title.settings.categories': 'Categories',
    'header.title.settings.permissions': 'Permissions',
    'header.title.settings.sessions': 'Active Sessions',
    'header.title.settings.logging': 'System Logging',
    'header.title.settings.backup': 'Backup & Restore',
    'header.title.settings.email': 'Email Configuration',
    'header.title.settings.health': 'System Health',
    'header.title.logs': 'Audit Logs',
    'header.title.tags': 'Tags',
    'header.search.placeholder': 'Search...',
    'header.locale.switch': 'Switch to Thai',

    // Sidebar
    'sidebar.brand.subtitle': 'Inventory System',
    'sidebar.dashboard': 'Dashboard',
    'sidebar.inventory': 'Inventory',
    'sidebar.inventory.all': 'All Items',
    'sidebar.inventory.borrow': 'Borrow (Durable)',
    'sidebar.inventory.withdraw': 'Withdraw',
    'sidebar.cart': 'Cart',
    'sidebar.my-assets': 'My Assets',
    'sidebar.requests': 'Requests',
    'sidebar.maintenance': 'Maintenance',
    'sidebar.history': 'History',
    'sidebar.reports': 'Reports',
    'sidebar.scanner': 'Scanner',
    'sidebar.tags': 'Tags',
    'sidebar.users': 'Users',
    'sidebar.logs': 'Audit Logs',
    'sidebar.settings': 'Settings',
    'sidebar.settings.categories': 'Categories',
    'sidebar.settings.warehouses': 'Warehouses',
    'sidebar.settings.departments': 'Dept Mapping',
    'sidebar.settings.system': 'System Config',
    'sidebar.settings.permissions': 'Permissions',
    'sidebar.settings.sessions': 'Active Sessions',
    'sidebar.settings.logging': 'Logging',
    'sidebar.settings.backup': 'Backup & Restore',
    'sidebar.settings.email': 'Email Config',
    'sidebar.settings.health': 'System Health',
    'sidebar.sign-out': 'Sign Out',

    // Dashboard stat cards
    'dashboard.welcome': 'Welcome back',
    'dashboard.welcome.summary': "Here's what's happening with your inventory today. You have {pending} pending requests and {lowStock} items running low on stock.",
    'dashboard.stat.total-assets': 'Total Assets',
    'dashboard.stat.total-assets.sub': 'items in system',
    'dashboard.stat.low-stock': 'Low Stock',
    'dashboard.stat.low-stock.sub': 'needs reordering',
    'dashboard.stat.pending-requests': 'Pending Requests',
    'dashboard.stat.pending-requests.sub': 'awaiting approval',
    'dashboard.stat.active-users': 'Active Users',
    'dashboard.stat.active-users.sub': 'active this month',
    'dashboard.widget.low-stock.title': 'Low Stock Alerts',
    'dashboard.widget.low-stock.subtitle': 'Items below minimum stock level',
    'dashboard.widget.low-stock.items-label': 'Items',
    'dashboard.widget.low-stock.restock': 'Restock',
    'dashboard.widget.low-stock.view-all': 'View All Alerts',
    'dashboard.widget.low-stock.healthy': 'All stock levels are healthy.',
    'dashboard.widget.activity.title': 'Recent Activity',
    'dashboard.widget.activity.subtitle': 'Latest transactions and updates',
    'dashboard.widget.activity.view-all': 'View All',
    'dashboard.widget.activity.empty': 'No recent activity found.',
};

const th: Dictionary = {
    // Header
    'header.title.dashboard': 'ภาพรวมระบบ',
    'header.title.inventory': 'คลังสินค้า',
    'header.title.cart': 'ตะกร้าคำขอ',
    'header.title.my-assets': 'ทรัพย์สินของฉัน',
    'header.title.requests': 'คำขอทั้งหมด',
    'header.title.maintenance': 'ซ่อมบำรุงและแจ้งปัญหา',
    'header.title.history': 'ประวัติการทำรายการ',
    'header.title.reports': 'รายงานและสรุปข้อมูล',
    'header.title.scanner': 'สแกนบาร์โค้ด/คิวอาร์',
    'header.title.users': 'จัดการผู้ใช้งาน',
    'header.title.warehouse': 'จัดการคลังพัสดุ',
    'header.title.settings': 'ตั้งค่าระบบ',
    'header.title.settings.system': 'ตั้งค่าระบบ',
    'header.title.settings.warehouses': 'คลังพัสดุ',
    'header.title.settings.departments': 'ผูกข้อมูลหน่วยงาน',
    'header.title.settings.categories': 'หมวดหมู่',
    'header.title.settings.permissions': 'สิทธิ์การใช้งาน',
    'header.title.settings.sessions': 'การใช้งานปัจจุบัน',
    'header.title.settings.logging': 'บันทึกระบบ',
    'header.title.settings.backup': 'สำรองและกู้คืนข้อมูล',
    'header.title.settings.email': 'ตั้งค่าอีเมล',
    'header.title.settings.health': 'สถานะระบบ',
    'header.title.logs': 'บันทึกการตรวจสอบ',
    'header.title.tags': 'แท็ก',
    'header.search.placeholder': 'ค้นหา...',
    'header.locale.switch': 'เปลี่ยนเป็นภาษาอังกฤษ',

    // Sidebar
    'sidebar.brand.subtitle': 'ระบบจัดการคลังพัสดุ',
    'sidebar.dashboard': 'ภาพรวม',
    'sidebar.inventory': 'คลังสินค้า',
    'sidebar.inventory.all': 'ทั้งหมด',
    'sidebar.inventory.borrow': 'ยืม (คงทน)',
    'sidebar.inventory.withdraw': 'เบิก (สิ้นเปลือง)',
    'sidebar.cart': 'ตะกร้า',
    'sidebar.my-assets': 'ทรัพย์สินของฉัน',
    'sidebar.requests': 'คำขอ',
    'sidebar.maintenance': 'ซ่อมบำรุง',
    'sidebar.history': 'ประวัติ',
    'sidebar.reports': 'รายงาน',
    'sidebar.scanner': 'สแกน',
    'sidebar.tags': 'แท็ก',
    'sidebar.users': 'ผู้ใช้งาน',
    'sidebar.logs': 'บันทึกตรวจสอบ',
    'sidebar.settings': 'ตั้งค่า',
    'sidebar.settings.categories': 'หมวดหมู่',
    'sidebar.settings.warehouses': 'คลังพัสดุ',
    'sidebar.settings.departments': 'ผูกหน่วยงาน',
    'sidebar.settings.system': 'ระบบ',
    'sidebar.settings.permissions': 'สิทธิ์',
    'sidebar.settings.sessions': 'การใช้งาน',
    'sidebar.settings.logging': 'บันทึก',
    'sidebar.settings.backup': 'สำรองข้อมูล',
    'sidebar.settings.email': 'อีเมล',
    'sidebar.settings.health': 'สถานะระบบ',
    'sidebar.sign-out': 'ออกจากระบบ',

    // Dashboard stat cards
    'dashboard.welcome': 'ยินดีต้อนรับกลับ',
    'dashboard.welcome.summary': 'สรุปสถานะคลังสินค้าของคุณวันนี้ — มีคำขอรอดำเนินการ {pending} รายการ และพัสดุใกล้หมด {lowStock} รายการ',
    'dashboard.stat.total-assets': 'ทรัพย์สินทั้งหมด',
    'dashboard.stat.total-assets.sub': 'รายการในระบบ',
    'dashboard.stat.low-stock': 'สต็อกต่ำ',
    'dashboard.stat.low-stock.sub': 'ต้องสั่งเพิ่ม',
    'dashboard.stat.pending-requests': 'คำขอรอดำเนินการ',
    'dashboard.stat.pending-requests.sub': 'รออนุมัติ',
    'dashboard.stat.active-users': 'ผู้ใช้งานเดือนนี้',
    'dashboard.stat.active-users.sub': 'ใช้งานเดือนปัจจุบัน',
    'dashboard.widget.low-stock.title': 'แจ้งเตือนสต็อกต่ำ',
    'dashboard.widget.low-stock.subtitle': 'พัสดุที่ต่ำกว่าระดับขั้นต่ำ',
    'dashboard.widget.low-stock.items-label': 'รายการ',
    'dashboard.widget.low-stock.restock': 'เติมสต็อก',
    'dashboard.widget.low-stock.view-all': 'ดูการแจ้งเตือนทั้งหมด',
    'dashboard.widget.low-stock.healthy': 'สต็อกพัสดุทั้งหมดอยู่ในเกณฑ์ปกติ',
    'dashboard.widget.activity.title': 'กิจกรรมล่าสุด',
    'dashboard.widget.activity.subtitle': 'รายการและการอัปเดตล่าสุด',
    'dashboard.widget.activity.view-all': 'ดูทั้งหมด',
    'dashboard.widget.activity.empty': 'ไม่มีกิจกรรมล่าสุด',
};

export const MESSAGES: Record<Locale, Dictionary> = { en, th };

/**
 * Lookup a translation key in the given locale. Substitutes {var} placeholders
 * from the values object. If the key is missing from the dictionary, the key
 * itself is returned so broken strings stand out in the UI rather than
 * silently rendering empty.
 */
export function translate(locale: Locale, key: string, values?: Record<string, string | number>): string {
    const dict = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
    let result = dict[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;

    if (values) {
        for (const [name, value] of Object.entries(values)) {
            result = result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
        }
    }

    return result;
}
