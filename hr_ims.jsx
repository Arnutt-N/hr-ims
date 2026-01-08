import React, { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard,
    Box,
    ShoppingCart,
    QrCode,
    Settings,
    LogOut,
    Search,
    Plus,
    Trash2,
    CheckCircle,
    AlertCircle,
    ScanLine,
    X,
    Package,
    History,
    Menu,
    User,
    ChevronRight,
    ChevronDown,
    Lock,
    Printer,
    Download,
    Shield,
    Briefcase,
    RefreshCw,
    ClipboardList,
    Clock,
    Layers,
    Archive,
    FileText,
    Wrench,
    Calendar,
    Users,
    MoreVertical,
    Edit,
    Bell,
    FileBarChart,
    ArrowLeftRight,
    Save, // Added for Settings
    AlertTriangle // Added for Report Issue
} from 'lucide-react';

// --- Simulation Data (Mocking MySQL Tables) ---
const MOCK_DB = {
    users: [
        { id: 1, name: 'Admin User', role: 'admin', department: 'IT Management', email: 'admin@ims.pro', status: 'active', avatar: 'https://i.pravatar.cc/150?u=1' },
        { id: 2, name: 'Somchai Staff', role: 'user', department: 'Sales Dept', email: 'somchai@ims.pro', status: 'active', avatar: 'https://i.pravatar.cc/150?u=8' },
        { id: 3, name: 'Somsri Accounting', role: 'user', department: 'Accounting', email: 'somsri@ims.pro', status: 'inactive', avatar: 'https://i.pravatar.cc/150?u=5' }
    ],
    inventory: [
        { id: 101, name: 'MacBook Pro M2', category: 'IT Equipment', type: 'durable', serial: 'MBP-2023-001', status: 'available', image: '💻', stock: 1 },
        { id: 102, name: 'Projector Epson', category: 'Audio Visual', type: 'durable', serial: 'PJ-EPS-099', status: 'borrowed', image: '📽️', stock: 1 },
        { id: 103, name: 'Canon DSLR 80D', category: 'Camera', type: 'durable', serial: 'CAM-80D-005', status: 'available', image: '📷', stock: 1 },
        { id: 104, name: 'A4 Paper (Double A)', category: 'Office Supply', type: 'consumable', serial: 'SUP-A4-001', status: 'available', image: '📄', stock: 50 },
        { id: 105, name: 'Microphone Shure', category: 'Audio Visual', type: 'durable', serial: 'MIC-SH-001', status: 'available', image: '🎤', stock: 1 },
        { id: 106, name: 'Blue Pen Box', category: 'Office Supply', type: 'consumable', serial: 'SUP-PEN-022', status: 'available', image: '🖊️', stock: 20 },
        { id: 107, name: 'Dell Monitor 24"', category: 'IT Equipment', type: 'durable', serial: 'DEL-24-112', status: 'maintenance', image: '🖥️', stock: 1 },
    ],
    myAssets: [
        { id: 1, itemId: 102, name: 'Projector Epson', serial: 'PJ-EPS-099', borrowDate: '2023-10-20', lastCheckDate: '2023-10-20', status: 'normal' },
        { id: 2, itemId: 101, name: 'MacBook Pro M2 (Old)', serial: 'MBP-2021-OLD', borrowDate: '2023-10-01', lastCheckDate: '2023-10-08', status: 'warning' }
    ],
    requests: [
        { id: 1, user: 'Somchai Staff', items: 'A4 Paper (x2)', date: '2023-10-26', status: 'pending', type: 'withdraw' },
        { id: 2, user: 'Somchai Staff', items: 'Canon DSLR 80D', date: '2023-10-26', status: 'pending', type: 'borrow' },
        { id: 3, user: 'Somchai Staff', items: 'Dell Monitor 24"', date: '2023-10-27', status: 'pending', type: 'return', assetId: 999 }
    ],
    history: [
        { id: 1, date: '2023-10-25', user: 'Somchai Staff', action: 'Borrow', item: 'Projector Epson', status: 'Active' },
        { id: 2, date: '2023-10-24', user: 'Admin User', action: 'Restock', item: 'A4 Paper', status: 'Completed' },
        { id: 3, date: '2023-10-20', user: 'Somchai Staff', action: 'Return', item: 'Microphone Shure', status: 'Completed' }
    ],
    notifications: [
        { id: 1, text: 'New request from Somchai Staff', time: '10 min ago', read: false },
        { id: 2, text: 'Printer HP-01 maintenance due', time: '2 hours ago', read: false },
        { id: 3, text: 'Your request #REQ-005 approved', time: '1 day ago', read: true },
    ],
    settings: {
        orgName: 'IMS Corporation',
        borrowLimit: 7,
        checkInterval: 7,
        maintenanceAlert: true
    }
};

// --- Custom Hook for Font ---
const useThaiFont = () => {
    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        return () => document.head.removeChild(link);
    }, []);
};

// --- Main Component ---
export default function App() {
    useThaiFont();
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isInventoryExpanded, setIsInventoryExpanded] = useState(true);
    const [cart, setCart] = useState([]);

    // Safe initialization
    const [inventory, setInventory] = useState(MOCK_DB.inventory || []);
    const [users, setUsers] = useState(MOCK_DB.users || []);
    const [myAssets, setMyAssets] = useState(MOCK_DB.myAssets || []);
    const [requests, setRequests] = useState(MOCK_DB.requests || []);
    const [notifications, setNotifications] = useState(MOCK_DB.notifications || []);
    const [settings, setSettings] = useState(MOCK_DB.settings);
    const [showNotifications, setShowNotifications] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');

    // Actions
    const handleLogin = (user) => {
        setCurrentUser(user);
        setActiveTab('dashboard');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setActiveTab('dashboard');
        setCart([]);
    };

    const addToCart = (item) => {
        if (item.status !== 'available' && item.stock <= 0) return;
        if (!cart.find(c => c.id === item.id)) {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(c => c.id !== id));
    };

    // --- CRUD & Operations ---
    const handleRestock = (item) => {
        const amount = prompt(`Enter amount to restock for ${item.name}:`, "10");
        if (amount) {
            const qty = parseInt(amount);
            if (!isNaN(qty)) {
                setInventory(inventory.map(i => i.id === item.id ? { ...i, stock: i.stock + qty } : i));
                alert(`Successfully added ${qty} to ${item.name}. New Stock: ${item.stock + qty}`);
            }
        }
    };

    const handleCheckIn = (assetId) => {
        const today = new Date().toISOString().split('T')[0];
        const updated = myAssets.map(asset =>
            asset.id === assetId ? { ...asset, lastCheckDate: today, status: 'normal' } : asset
        );
        setMyAssets(updated);
        alert('Asset verified successfully! Next check in 7 days.');
    };

    const handleReturnRequest = (asset) => {
        if (window.confirm(`Confirm returning item: ${asset.name}?`)) {
            const newRequest = {
                id: requests.length + 100,
                user: currentUser.name,
                items: asset.name,
                date: new Date().toISOString().split('T')[0],
                status: 'pending',
                type: 'return',
                assetId: asset.id
            };
            setRequests([newRequest, ...requests]);
            setMyAssets(myAssets.map(a => a.id === asset.id ? { ...a, status: 'returning' } : a));
            alert('Return request submitted. Please wait for Admin to receive the item.');
        }
    }

    const handleReportIssue = (asset) => {
        const issue = prompt("Please describe the issue:", "Broken screen");
        if (issue) {
            setMyAssets(myAssets.map(a => a.id === asset.id ? { ...a, status: 'issue_reported' } : a));

            // Ideally create a maintenance request here
            const newMaintenanceItem = {
                ...inventory.find(i => i.id === asset.itemId),
                status: 'maintenance',
                serial: asset.serial,
                name: asset.name,
                id: inventory.length + 999
            };
            // In a real app, you'd link this properly. Here we just alert.
            alert(`Issue reported: "${issue}". IT Team has been notified.`);
        }
    }

    const handleScanSuccess = (code) => {
        const found = inventory.find(i => i.serial === code || i.id.toString() === code);
        if (found) {
            addToCart(found);
            alert(`Scanned: ${found.name}`);
        } else {
            alert(`Item not found for code: ${code}`);
        }
    };

    const handleRequestAction = (reqId, action) => {
        const targetRequest = requests.find(r => r.id === reqId);
        setRequests(requests.map(r => r.id === reqId ? { ...r, status: action } : r));

        if (action === 'approved') {
            if (targetRequest.type === 'return') {
                if (targetRequest.assetId) {
                    setMyAssets(myAssets.filter(a => a.id !== targetRequest.assetId));
                }
                alert(`Item returned successfully. Added back to stock.`);
            } else {
                alert(`Request Approved.`);
            }
        } else {
            alert(`Request Rejected.`);
        }
    };

    const toggleNotifications = () => setShowNotifications(!showNotifications);

    const handleInventoryMenuClick = () => {
        if (isSidebarOpen) {
            if (!activeTab.startsWith('inventory')) {
                setActiveTab('inventory-all');
                setIsInventoryExpanded(true);
            } else {
                setIsInventoryExpanded(!isInventoryExpanded);
            }
        } else {
            setActiveTab('inventory-all');
        }
    };

    // --- Render Views ---
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardView inventory={inventory} currentUser={currentUser} myAssets={myAssets} requests={requests} />;

            // Inventory Views
            case 'inventory-all':
                return <InventoryView inventory={inventory} addToCart={addToCart} searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} filterType="all" title="คลังพัสดุทั้งหมด (All Inventory)" onRestock={handleRestock} />;
            case 'inventory-durable':
                return <InventoryView inventory={inventory} addToCart={addToCart} searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} filterType="durable" title="รายการยืม (Borrow Items)" onRestock={handleRestock} />;
            case 'inventory-consumable':
                return <InventoryView inventory={inventory} addToCart={addToCart} searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} filterType="consumable" title="รายการเบิก (Withdraw Items)" onRestock={handleRestock} />;

            case 'requests': return <RequestsView requests={requests} onAction={handleRequestAction} />;
            case 'reports': return <ReportsView />;
            case 'users': return <UserManagementView users={users} setUsers={setUsers} />;
            case 'my-assets': return <MyAssetsView myAssets={myAssets} onCheckIn={handleCheckIn} onReturn={handleReturnRequest} onReport={handleReportIssue} />; // Updated with Report
            case 'history': return <HistoryView history={MOCK_DB.history} />;
            case 'maintenance': return <MaintenanceView inventory={inventory} />;
            case 'scan': return <ScannerView onScan={handleScanSuccess} />;
            case 'tags': return <TagGeneratorView inventory={inventory} />;
            case 'settings': return <SettingsView settings={settings} setSettings={setSettings} />; // Added Settings View
            case 'cart': return <CartView cart={cart} removeFromCart={removeFromCart} setCart={setCart} />;
            default: return <DashboardView inventory={inventory} currentUser={currentUser} myAssets={myAssets} />;
        }
    };

    // --- Login Screen Render ---
    if (!currentUser) {
        return (
            <div className="flex h-screen bg-[#0f172a] font-['Noto_Sans_Thai'] relative overflow-hidden items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#1e1b4b] to-[#172554] opacity-100 z-0 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0 pointer-events-none mix-blend-overlay"></div>
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px] animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] animate-pulse delay-700"></div>

                <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center animate-fade-in-up">
                    <div className="mx-auto mb-8 bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl w-24 h-24 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-4 ring-white/5">
                        <Package size={48} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">IMS.Pro</h1>
                    <p className="text-blue-200 mb-8 font-light">Smart Inventory Management System</p>

                    <div className="space-y-4">
                        <button
                            onClick={() => handleLogin(MOCK_DB.users[0])}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-3 group border border-indigo-500/50"
                        >
                            <div className="p-1 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                                <Shield size={20} className="text-white" />
                            </div>
                            <span>Login as Admin</span>
                        </button>

                        <button
                            onClick={() => handleLogin(MOCK_DB.users[1])}
                            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl transition-all border border-white/10 flex items-center justify-center gap-3 group"
                        >
                            <div className="p-1 bg-white/10 rounded-lg group-hover:scale-110 transition-transform">
                                <User size={20} className="text-blue-200" />
                            </div>
                            <span>Login as User</span>
                        </button>
                    </div>

                    <p className="mt-8 text-xs text-slate-500">
                        System Version 4.0.0 (Full Cycle)
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-50 font-['Noto_Sans_Thai'] text-slate-800 overflow-hidden">
            {/* --- SCROLLBAR STYLES --- */}
            <style>{`
        .sidebar-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .sidebar-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 20px; }
        .sidebar-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        .main-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .main-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .main-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .main-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

            {/* Dark Modern Sidebar */}
            <aside
                className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-[#0f172a] text-white transition-all duration-500 ease-in-out flex flex-col z-20 shadow-2xl relative overflow-hidden border-r border-white/5`}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#1e1b4b] to-[#172554] opacity-100 z-0 pointer-events-none"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 z-0 pointer-events-none mix-blend-overlay"></div>

                <div className="h-24 flex items-center justify-center relative z-10 border-b border-white/10 mx-4">
                    <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
                            <Package size={24} className="text-white" />
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col animate-fade-in">
                                <span className="font-bold text-xl tracking-wide text-white">IMS.Pro</span>
                                <span className="text-[10px] text-blue-300 uppercase tracking-widest font-semibold">Inventory System</span>
                            </div>
                        )}
                    </div>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-2 relative z-10 overflow-y-auto sidebar-scrollbar">
                    <SidebarItem icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isOpen={isSidebarOpen} />

                    <div className={`transition-all duration-300 ${!isSidebarOpen ? 'flex flex-col items-center' : ''}`}>
                        <SidebarItem
                            icon={<Layers />}
                            label="คลังพัสดุ (Inventory)"
                            active={!isSidebarOpen && activeTab.startsWith('inventory')}
                            onClick={handleInventoryMenuClick}
                            isOpen={isSidebarOpen}
                            hasSubMenu={true}
                            isExpanded={isInventoryExpanded}
                        />

                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isInventoryExpanded && isSidebarOpen ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                            <SidebarItem icon={<Box />} label="ทั้งหมด (All Items)" active={activeTab === 'inventory-all'} onClick={() => setActiveTab('inventory-all')} isOpen={isSidebarOpen} isSubItem={true} />
                            <SidebarItem icon={<History />} label="ยืม (Borrow)" active={activeTab === 'inventory-durable'} onClick={() => setActiveTab('inventory-durable')} isOpen={isSidebarOpen} isSubItem={true} />
                            <SidebarItem icon={<ClipboardList />} label="เบิก (Withdraw)" active={activeTab === 'inventory-consumable'} onClick={() => setActiveTab('inventory-consumable')} isOpen={isSidebarOpen} isSubItem={true} />
                        </div>
                    </div>

                    <div className="my-4 border-t border-white/10 mx-2"></div>

                    {currentUser.role === 'admin' && (
                        <SidebarItem icon={<FileText />} label="อนุมัติคำขอ (Requests)" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} isOpen={isSidebarOpen} count={requests.filter(r => r.status === 'pending').length} />
                    )}

                    {currentUser.role === 'user' && (
                        <SidebarItem icon={<Briefcase />} label="ทรัพย์สินของฉัน (Assets)" active={activeTab === 'my-assets'} onClick={() => setActiveTab('my-assets')} isOpen={isSidebarOpen} count={myAssets.filter(a => a.status === 'warning').length} />
                    )}

                    <SidebarItem icon={<Calendar />} label="ประวัติ (History)" active={activeTab === 'history'} onClick={() => setActiveTab('history')} isOpen={isSidebarOpen} />
                    <SidebarItem icon={<Wrench />} label="แจ้งซ่อม (Maintenance)" active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} isOpen={isSidebarOpen} count={inventory.filter(i => i.status === 'maintenance').length} />

                    {currentUser.role === 'admin' && (
                        <SidebarItem icon={<FileBarChart />} label="รายงาน (Reports)" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} isOpen={isSidebarOpen} />
                    )}

                    {currentUser.role === 'admin' && (
                        <SidebarItem icon={<Printer />} label="Asset Tags" active={activeTab === 'tags'} onClick={() => setActiveTab('tags')} isOpen={isSidebarOpen} />
                    )}

                    <SidebarItem icon={<QrCode />} label="Scan Device" active={activeTab === 'scan'} onClick={() => setActiveTab('scan')} isOpen={isSidebarOpen} />
                    <SidebarItem icon={<ShoppingCart />} label="Cart" active={activeTab === 'cart'} onClick={() => setActiveTab('cart')} isOpen={isSidebarOpen} count={cart.length} />

                    {currentUser.role === 'admin' && (
                        <div className="pt-6 mt-6 border-t border-white/10">
                            <div className={`px-4 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider ${!isSidebarOpen && 'hidden'}`}>Admin Tools</div>
                            <SidebarItem icon={<Users />} label="จัดการผู้ใช้ (Users)" active={activeTab === 'users'} onClick={() => setActiveTab('users')} isOpen={isSidebarOpen} />
                            <SidebarItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} isOpen={isSidebarOpen} />
                        </div>
                    )}
                </nav>

                <div className="p-4 relative z-10 border-t border-white/10 bg-black/10 backdrop-blur-sm">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 text-slate-400 hover:text-white hover:bg-white/5 p-3 rounded-xl transition-all w-full justify-center group"
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                        {isSidebarOpen && <span className="font-medium">Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative bg-slate-50/50">
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 z-10 sticky top-0">
                    <div className="flex items-center">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors mr-4">
                            <Menu size={20} />
                        </button>
                        <h1 className="text-xl font-bold text-slate-800 hidden md:block">
                            {activeTab === 'dashboard' && 'Dashboard Overview'}
                            {(activeTab.startsWith('inventory')) && 'Inventory Management'}
                            {activeTab === 'requests' && 'Approval Requests'}
                            {activeTab === 'history' && 'Transaction History'}
                            {activeTab === 'maintenance' && 'Maintenance & Repairs'}
                            {activeTab === 'my-assets' && 'My Active Assets'}
                            {activeTab === 'tags' && 'Asset Tag Generator'}
                            {activeTab === 'reports' && 'Reports & Analytics'}
                            {activeTab === 'cart' && 'Request Cart'}
                            {activeTab === 'users' && 'User Management'}
                            {activeTab === 'settings' && 'System Configuration'}
                        </h1>
                    </div>

                    <div className="flex items-center space-x-6">
                        {/* Notification Center */}
                        <div className="relative">
                            <button onClick={toggleNotifications} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 relative transition-colors">
                                <Bell size={20} />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                                )}
                            </button>
                            {/* Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in-up">
                                    <div className="px-4 py-2 border-b border-slate-50 flex justify-between items-center">
                                        <span className="font-bold text-slate-800 text-sm">Notifications</span>
                                        <span className="text-xs text-indigo-600 cursor-pointer hover:underline">Mark all read</span>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto main-scrollbar">
                                        {notifications.length > 0 ? notifications.map(notif => (
                                            <div key={notif.id} className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-indigo-50/50' : ''}`}>
                                                <p className="text-sm text-slate-700 font-medium">{notif.text}</p>
                                                <p className="text-xs text-slate-400 mt-1">{notif.time}</p>
                                            </div>
                                        )) : <div className="p-4 text-center text-slate-400 text-sm">No notifications</div>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
                            <div className="text-right hidden sm:block">
                                <div className="text-sm font-bold text-slate-800">{currentUser.name}</div>
                                <div className="text-xs text-slate-500">{currentUser.department}</div>
                            </div>
                            <div className="p-0.5 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500">
                                <img src={currentUser.avatar} alt="Profile" className="w-10 h-10 rounded-full border-2 border-white" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area with Main Scrollbar */}
                <div className="flex-1 overflow-auto p-8 relative scroll-smooth main-scrollbar">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}

// --- Sub Components ---

const SidebarItem = ({ icon, label, active, onClick, isOpen, count, isSubItem, hasSubMenu, isExpanded }) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full p-3.5 rounded-xl transition-all duration-300 group relative my-1
      ${active
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'}
      ${isSubItem ? 'pl-11 text-sm' : ''}
    `}
    >
        <div className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-blue-300 transition-colors'} ${!isOpen && 'mx-auto'}`}>
            {React.cloneElement(icon, { size: isSubItem ? 18 : 22 })}
        </div>

        {isOpen && (
            <div className="flex-1 flex justify-between items-center ml-4 overflow-hidden">
                <span className={`font-medium tracking-wide whitespace-nowrap ${isSubItem ? 'font-normal text-slate-300' : ''}`}>{label}</span>
                {hasSubMenu ? (
                    <ChevronRight size={16} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                ) : (
                    null
                )}
            </div>
        )}

        {count > 0 && (
            <span className={`absolute ${isOpen ? 'right-2 top-1/2 -translate-y-1/2' : 'top-1 right-1'} bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-md border border-rose-400 min-w-[1.25rem]`}>
                {count}
            </span>
        )}
    </button>
);

// --- New: Settings View ---
const SettingsView = ({ settings, setSettings }) => {
    return (
        <div className="space-y-6 animate-fade-in-up max-w-4xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">System Configuration</h2>
                    <p className="text-slate-500">Manage global settings for the Inventory System.</p>
                </div>
                <button onClick={() => alert('Settings Saved!')} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-md">
                    <Save size={18} /> Save Changes
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-700 border-b border-slate-100 pb-2">General Info</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Organization Name</label>
                            <input type="text" className="w-full p-3 border border-slate-200 rounded-xl" defaultValue={settings?.orgName} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Admin Contact Email</label>
                            <input type="email" className="w-full p-3 border border-slate-200 rounded-xl" defaultValue="admin@ims.pro" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-700 border-b border-slate-100 pb-2">Borrowing Rules</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Max Borrow Duration (Days)</label>
                            <input type="number" className="w-full p-3 border border-slate-200 rounded-xl" defaultValue={settings?.borrowLimit} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Re-check Interval (Days)</label>
                            <input type="number" className="w-full p-3 border border-slate-200 rounded-xl" defaultValue={settings?.checkInterval} />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-lg text-slate-700 border-b border-slate-100 pb-2">Notifications</h3>
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="maintAlert" className="w-5 h-5 text-indigo-600 rounded" defaultChecked={settings?.maintenanceAlert} />
                        <label htmlFor="maintAlert" className="text-slate-600">Enable Email Alerts for Maintenance</label>
                    </div>
                    <div className="flex items-center gap-3">
                        <input type="checkbox" id="lineAlert" className="w-5 h-5 text-indigo-600 rounded" defaultChecked={true} />
                        <label htmlFor="lineAlert" className="text-slate-600">Enable LINE Notify Integration</label>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Updated Inventory View with Restock ---
const InventoryView = ({ inventory = [], addToCart, searchQuery, setSearchQuery, currentUser, filterType = 'all', title = 'Inventory Items', onRestock }) => {
    const filtered = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.serial.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
                    <p className="text-sm text-slate-500">
                        {filterType === 'all' && 'Viewing all Consumables and Durables.'}
                        {filterType === 'durable' && 'Viewing only Durable items (For Borrowing).'}
                        {filterType === 'consumable' && 'Viewing only Consumable items (For Withdrawal).'}
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search items..."
                            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 text-slate-400">
                    <Package size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No items found in this category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map(item => (
                        <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
                            <div className="h-44 bg-slate-50/50 flex items-center justify-center text-6xl relative">
                                {item.image}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border
                    ${item.type === 'consumable' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}
                  `}>
                                        {item.type === 'consumable' ? 'เบิก (Withdraw)' : 'ยืม (Borrow)'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                                    {item.type === 'consumable' && <span className="text-xs font-bold text-slate-600">Stock: {item.stock}</span>}
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight">{item.name}</h3>
                                <p className="text-xs text-slate-400 font-mono mb-4">{item.serial}</p>

                                <div className="mt-auto space-y-2">
                                    <button
                                        onClick={() => addToCart(item)}
                                        disabled={item.status !== 'available' && item.stock <= 0}
                                        className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all
                       ${(item.status === 'available' || item.stock > 0)
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                                    >
                                        {item.type === 'consumable' ? 'Request' : 'Borrow'}
                                    </button>

                                    {/* Admin Restock Button */}
                                    {currentUser.role === 'admin' && item.type === 'consumable' && (
                                        <button
                                            onClick={() => onRestock(item)}
                                            className="w-full py-2 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs transition-all border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        >
                                            <Edit size={14} /> Adjust Stock
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Updated MyAssets View with Report Issue ---
const MyAssetsView = ({ myAssets = [], onCheckIn, onReturn, onReport }) => {
    return (
        <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">My Active Assets</h2>
                    <p className="text-slate-500 mt-1">Items currently borrowed by you. Please verify status every 7 days.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {myAssets.map((asset) => {
                    const isWarning = asset.status === 'warning';
                    return (
                        <div key={asset.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${isWarning ? 'border-red-200 bg-red-50/30' : 'border-slate-100'} flex flex-col md:flex-row items-center justify-between`}>
                            <div className="flex items-center gap-4 mb-4 md:mb-0">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isWarning ? 'bg-red-100' : 'bg-slate-100'}`}>
                                    📦
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{asset.name}</h3>
                                    <p className="text-sm text-slate-500 font-mono">SN: {asset.serial}</p>
                                    <div className="flex gap-4 mt-2 text-xs">
                                        <span className="text-slate-500">Borrowed: {asset.borrowDate}</span>
                                        <span className={`${isWarning ? 'text-red-600 font-bold' : 'text-emerald-600'}`}>Last Check: {asset.lastCheckDate}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {isWarning ? (
                                    <button
                                        onClick={() => onCheckIn(asset.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2 text-sm"
                                    >
                                        <CheckCircle size={16} /> Verify
                                    </button>
                                ) : (
                                    <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold flex items-center border border-emerald-100">
                                        <CheckCircle size={16} className="mr-2" /> Verified
                                    </div>
                                )}

                                {asset.status === 'returning' ? (
                                    <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-bold border border-amber-100">
                                        Returning...
                                    </div>
                                ) : asset.status === 'issue_reported' ? (
                                    <div className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-bold border border-red-100">
                                        Issue Reported
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => onReport(asset)}
                                            className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-sm"
                                            title="Report Broken/Issue"
                                        >
                                            <AlertTriangle size={16} /> Report
                                        </button>
                                        <button
                                            onClick={() => onReturn(asset)}
                                            className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 text-sm"
                                        >
                                            <ArrowLeftRight size={16} /> Return
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ... (Rest of components: UserManagementView, RequestsView, HistoryView, MaintenanceView, DashboardView, CartView, ScannerView, TagGeneratorView, StatusBadge, ReportsView - Keep existing) ...
const UserManagementView = ({ users = [], setUsers }) => {
    const handleEdit = (id) => alert(`Edit User ID: ${id}`);
    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setUsers(users.filter(u => u.id !== id));
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
                    <p className="text-slate-500">Manage system access and roles.</p>
                </div>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md">
                    <Plus size={18} /> Add New User
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto main-scrollbar">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">User Info</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={user.avatar} alt="" className="w-10 h-10 rounded-full border border-slate-200" />
                                            <div>
                                                <div className="font-bold text-slate-800">{user.name}</div>
                                                <div className="text-xs text-slate-400">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{user.department}</td>
                                    <td className="px-6 py-4">
                                        <span className={`flex items-center gap-1.5 text-xs font-bold ${user.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                            {user.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(user.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(user.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const RequestsView = ({ requests = [], onAction }) => {
    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Pending Requests</h2>
                    <p className="text-slate-500">Approve or reject inventory requests from users.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto main-scrollbar">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {requests.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">{req.date}</td>
                                    <td className="px-6 py-4 font-bold">{req.user}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase 
                      ${req.type === 'withdraw' ? 'bg-blue-100 text-blue-700' :
                                                req.type === 'return' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {req.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{req.items}</td>
                                    <td className="px-6 py-4 text-center">
                                        {req.status === 'pending' ? (
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => onAction(req.id, 'approved')} className="px-3 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-xs font-bold">
                                                    {req.type === 'return' ? 'Receive' : 'Approve'}
                                                </button>
                                                <button onClick={() => onAction(req.id, 'rejected')} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs font-bold">Reject</button>
                                            </div>
                                        ) : (
                                            <span className={`font-bold uppercase text-xs ${req.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}`}>{req.status}</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const HistoryView = ({ history = [] }) => {
    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800">Transaction History</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto main-scrollbar">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Item</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono text-slate-400">{log.date}</td>
                                    <td className="px-6 py-4 font-bold">{log.user}</td>
                                    <td className="px-6 py-4">{log.action}</td>
                                    <td className="px-6 py-4">{log.item}</td>
                                    <td className="px-6 py-4"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{log.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const MaintenanceView = ({ inventory = [] }) => {
    const maintenanceItems = inventory.filter(i => i.status === 'maintenance');
    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800">Maintenance & Repairs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {maintenanceItems.length > 0 ? maintenanceItems.map(item => (
                    <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 flex items-start gap-4">
                        <div className="bg-red-50 p-3 rounded-xl text-red-500 text-2xl">{item.image}</div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">{item.name}</h3>
                            <p className="text-xs text-slate-500 font-mono mb-2">{item.serial}</p>
                            <div className="flex justify-between items-center mt-4">
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">In Repair</span>
                                <button className="text-xs text-indigo-600 hover:underline">Update Status</button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-3 text-center p-12 text-slate-400">No items currently in maintenance.</div>
                )}
            </div>
        </div>
    );
};

const DashboardView = ({ inventory = [], currentUser, myAssets = [], requests = [] }) => {
    const adminStats = [
        { title: 'Total Assets', value: inventory.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: <Box /> },
        { title: 'Pending Requests', value: requests.filter(r => r.status === 'pending').length, color: 'text-purple-600', bg: 'bg-purple-50', icon: <FileText /> },
        { title: 'Maintenance', value: inventory.filter(i => i.status === 'maintenance').length, color: 'text-red-600', bg: 'bg-red-50', icon: <Wrench /> },
        { title: 'Borrowed Active', value: inventory.filter(i => i.status === 'borrowed').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle /> },
    ];

    const userStats = [
        { title: 'My Borrowed Items', value: myAssets.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: <Briefcase /> },
        { title: 'Need Verification', value: myAssets.filter(a => a.status === 'warning').length, color: 'text-red-600', bg: 'bg-red-50', icon: <RefreshCw /> },
    ];

    const stats = currentUser.role === 'admin' ? adminStats : userStats;

    return (
        <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
                <p className="text-slate-500 mt-1">Welcome back, {currentUser.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{stat.title}</p>
                            <h3 className="text-4xl font-extrabold text-slate-800">{stat.value}</h3>
                        </div>
                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} shadow-inner`}>
                            {React.cloneElement(stat.icon, { size: 28 })}
                        </div>
                    </div>
                ))}
            </div>

            {currentUser.role === 'admin' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Pending Asset Verification (Over 7 Days)</h3>
                    <div className="overflow-x-auto main-scrollbar">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">User</th>
                                    <th className="px-4 py-3">Asset Name</th>
                                    <th className="px-4 py-3">Last Checked</th>
                                    <th className="px-4 py-3 rounded-r-lg">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-slate-50">
                                    <td className="px-4 py-3 font-bold">Somchai Staff</td>
                                    <td className="px-4 py-3">MacBook Pro M2 (Old)</td>
                                    <td className="px-4 py-3 text-red-500">8 days ago</td>
                                    <td className="px-4 py-3"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Overdue</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {currentUser.role === 'user' && myAssets.some(a => a.status === 'warning') && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
                    <div className="bg-red-100 p-2 rounded-full text-red-600"><AlertCircle /></div>
                    <div>
                        <h3 className="font-bold text-red-800 text-lg">Action Required: Asset Verification</h3>
                        <p className="text-red-600 text-sm mt-1">You have items that haven't been verified for over 7 days. Please go to "My Assets" to confirm you still possess them.</p>
                        <button onClick={() => document.querySelector('button[label="My Assets (Check)"]')?.click()} className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors">
                            Go to Verify
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const CartView = ({ cart, removeFromCart, setCart }) => {
    const consumables = cart.filter(i => i.type === 'consumable');
    const durables = cart.filter(i => i.type === 'durable');

    return (
        <div className="max-w-5xl mx-auto animate-fade-in-up">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Request Cart Summary</h2>

            {cart.length === 0 ? (
                <div className="p-20 text-center bg-white rounded-3xl border border-slate-100">
                    <p className="text-slate-400">Cart is empty.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {consumables.length > 0 && (
                        <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden">
                            <div className="bg-blue-50 p-4 border-b border-blue-100 flex items-center gap-2">
                                <ClipboardList className="text-blue-600" size={20} />
                                <h3 className="font-bold text-blue-800">รายการเบิกวัสดุ (Withdrawal - No Return)</h3>
                            </div>
                            {consumables.map((item, idx) => (
                                <div key={idx} className="p-4 flex justify-between items-center border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl">{item.image}</div>
                                        <div>
                                            <div className="font-bold text-slate-700">{item.name}</div>
                                            <div className="text-xs text-slate-400">Qty: 1 (Mock)</div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    {durables.length > 0 && (
                        <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
                            <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center gap-2">
                                <History className="text-purple-600" size={20} />
                                <h3 className="font-bold text-purple-800">รายการยืมครุภัณฑ์ (Borrow - Must Return)</h3>
                            </div>
                            {durables.map((item, idx) => (
                                <div key={idx} className="p-4 flex justify-between items-center border-b border-slate-50 last:border-0">
                                    <div className="flex items-center gap-4">
                                        <div className="text-2xl">{item.image}</div>
                                        <div>
                                            <div className="font-bold text-slate-700">{item.name}</div>
                                            <div className="text-xs text-slate-400">Serial: {item.serial}</div>
                                            <div className="text-[10px] text-purple-500 bg-purple-50 inline-block px-1 rounded mt-1">Requires 7-day Check</div>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button onClick={() => { alert('Request Sent!'); setCart([]); }} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                        Confirm All Requests
                    </button>
                </div>
            )}
        </div>
    );
};

const ScannerView = ({ onScan }) => {
    const [code, setCode] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (code) {
            onScan(code);
            setCode('');
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center animate-fade-in-up">
            <div className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 text-center max-w-lg w-full relative overflow-hidden">
                {/* Scanning Animation Element */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[scan_2s_ease-in-out_infinite]"></div>

                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-8 text-indigo-600 ring-8 ring-indigo-50/50">
                    <ScanLine size={48} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Device Scanner</h2>
                <p className="text-slate-500 mb-10">Use your handheld scanner or manually enter the SN.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full pl-5 pr-12 py-4 text-xl border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-center text-slate-700 placeholder-slate-300"
                            placeholder="Waiting for input..."
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                        <QrCode className="absolute right-5 top-1/2 transform -translate-y-1/2 text-slate-400" size={24} />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-lg">
                        Process Scan
                    </button>
                </form>

                <div className="mt-10 pt-6 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                    <span>Status: <span className="text-green-500 font-bold">Ready</span></span>
                    <span>USB HID Mode</span>
                </div>
            </div>
        </div>
    );
};

const TagGeneratorView = ({ inventory = [] }) => {
    const [selectedItem, setSelectedItem] = useState(null);

    const handlePrint = () => {
        alert('Printing Tag for: ' + selectedItem.name + '\nSending to printer...');
    };

    return (
        <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto h-full flex flex-col">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Asset Tag Generator</h2>
                <p className="text-slate-500 mt-1">Generate and print QR codes/Barcodes for your inventory.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
                {/* List */}
                <div className="lg:flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <input type="text" placeholder="Search item to generate tag..." className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm" />
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 main-scrollbar"> {/* Added Scrollbar */}
                        {inventory.map(item => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border mb-2
                    ${selectedItem?.id === item.id
                                        ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                            >
                                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl border border-slate-100">
                                    {item.image}
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm ${selectedItem?.id === item.id ? 'text-indigo-700' : 'text-slate-700'}`}>{item.name}</h4>
                                    <span className="text-xs text-slate-400 font-mono">{item.serial}</span>
                                </div>
                                {selectedItem?.id === item.id && <div className="ml-auto text-indigo-600"><CheckCircle size={18} /></div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="lg:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col">
                    <div className="p-6 border-b border-slate-100 text-center bg-slate-50/30">
                        <h3 className="font-bold text-slate-800">Tag Preview</h3>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                        {selectedItem ? (
                            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 text-center w-full max-w-[280px]">
                                <div className="mb-4">
                                    {/* QR Code Simulation */}
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedItem.serial}`}
                                        alt="QR Code"
                                        className="mx-auto w-40 h-40 mix-blend-multiply"
                                    />
                                </div>
                                <div className="font-bold text-slate-800 text-lg mb-1">{selectedItem.name}</div>
                                <div className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-1 rounded">{selectedItem.serial}</div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest">
                                    <span>IMS Asset</span>
                                    <span>Property of IT Dept</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400">
                                <QrCode size={48} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Select an item to preview tag</p>
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50">
                        <button
                            disabled={!selectedItem}
                            onClick={handlePrint}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Printer size={18} /> Print Label
                        </button>
                        <button
                            disabled={!selectedItem}
                            className="w-full mt-3 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 border border-slate-200 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={18} /> Download PNG
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ReportsView = () => {
    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Reports & Analytics</h2>
                    <p className="text-slate-500">System usage summary and monthly reports.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-bold">
                        <Calendar size={16} /> Last 30 Days
                    </button>
                    <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-bold shadow-md">
                        <Download size={16} /> Export PDF
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Item Status Breakdown</h3>
                    <div className="flex items-center justify-center h-40 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <span className="text-slate-400 text-sm">Chart: Pie Status</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Monthly Usage (Consumables)</h3>
                    <div className="flex items-center justify-center h-40 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <span className="text-slate-400 text-sm">Chart: Bar Usage</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-700 mb-4">Budget Utilization</h3>
                    <div className="flex items-center justify-center h-40 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                        <span className="text-slate-400 text-sm">Chart: Line Budget</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="font-bold text-slate-700 mb-4">Detailed Transaction Log</h3>
                <div className="text-center text-slate-400 py-8 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    Table Data Placeholder
                </div>
            </div>
        </div>
    );
}

const StatusBadge = ({ status }) => {
    const styles = {
        available: 'bg-emerald-100 text-emerald-700 border-emerald-200 ring-emerald-50',
        borrowed: 'bg-amber-100 text-amber-700 border-amber-200 ring-amber-50',
        maintenance: 'bg-rose-100 text-rose-700 border-rose-200 ring-rose-50',
    };

    const labels = {
        available: 'Available',
        borrowed: 'Borrowed',
        maintenance: 'Repair'
    };

    return (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ring-2 uppercase tracking-wide shadow-sm ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
            {labels[status] || status}
        </span>
    );
};