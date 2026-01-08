
import React, { useState, useEffect } from 'react';
import {
    Menu, Bell
} from 'lucide-react';

// Import Data
import { MOCK_DB } from './data/mockData';

// Import Hooks
import { useThaiFont } from './hooks/useThaiFont';

// Import Layout
import Sidebar from './layout/Sidebar';

// Import Views
import DashboardView from './views/DashboardView';
import InventoryView from './views/InventoryView';
import MyAssetsView from './views/MyAssetsView';
import RequestsView from './views/RequestsView';
import HistoryView from './views/HistoryView';
import MaintenanceView from './views/MaintenanceView';
import CartView from './views/CartView';
import ScannerView from './views/ScannerView';
import TagGeneratorView from './views/TagGeneratorView';
import ReportsView from './views/ReportsView';
import SettingsView from './views/SettingsView';
import UserManagementView from './views/UserManagementView';

const App = () => {
    // --- State Management ---
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [currentUser, setCurrentUser] = useState(null); // null = not logged in
    const [inventory, setInventory] = useState(MOCK_DB.inventory);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isInventoryExpanded, setIsInventoryExpanded] = useState(true);
    const [requests, setRequests] = useState(MOCK_DB.requests);
    const [myAssets, setMyAssets] = useState(MOCK_DB.myAssets);
    const [users, setUsers] = useState(MOCK_DB.users);
    const [history, setHistory] = useState(MOCK_DB.history); // Added
    const [settings, setSettings] = useState(MOCK_DB.settings); // Added
    const [notifications, setNotifications] = useState(MOCK_DB.notifications); // Added
    const [showNotifications, setShowNotifications] = useState(false);

    // --- Hooks ---
    useThaiFont();

    // --- Effects ---
    // Responsive Sidebar
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Handlers ---
    const handleLogin = (role) => {
        const user = users.find(u => u.role === role);
        setCurrentUser(user);
    };

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            setCurrentUser(null);
            setCart([]);
            setActiveTab('dashboard');
        }
    };

    const addToCart = (item) => {
        if (!cart.find(i => i.id === item.id)) {
            setCart([...cart, item]);
            // Logic to show toast/alert could go here
        }
    };

    const removeFromCart = (itemId) => {
        setCart(cart.filter(i => i.id !== itemId));
    };

    const handleAction = (id, status) => {
        setRequests(requests.map(req => req.id === id ? { ...req, status } : req));
    };

    const handleCheckIn = (id) => {
        setMyAssets(myAssets.map(a => a.id === id ? { ...a, status: 'normal', lastCheckDate: new Date().toISOString().split('T')[0] } : a));
        alert('Asset Verified Successfully!');
    };

    const handleReturnRequest = (asset) => {
        if (confirm(`Request to return: ${asset.name}?`)) {
            setMyAssets(myAssets.map(a => a.id === asset.id ? { ...a, status: 'returning' } : a));
        }
    };

    const handleReportIssue = (asset) => {
        const issue = prompt('Please describe the issue/problem:');
        if (issue) {
            setMyAssets(myAssets.map(a => a.id === asset.id ? { ...a, status: 'issue_reported' } : a));
            alert('Issue reported to admin.');
        }
    };

    const handleScanSuccess = (code) => {
        // Mock scan logic
        const found = inventory.find(i => i.serial === code || i.id.toString() === code);
        if (found) {
            alert(`Scanned Item: ${found.name}\nSerial: ${found.serial}\nStatus: ${found.status}`);
            addToCart(found);
        } else {
            alert('Item not found in database!');
        }
    };

    const handleRestock = (item) => {
        const amount = prompt(`Add stock for ${item.name} (Current: ${item.stock}):`, "10");
        if (amount && !isNaN(amount)) {
            setInventory(inventory.map(i => i.id === item.id ? { ...i, stock: i.stock + parseInt(amount) } : i));
        }
    };

    const handleInventoryMenuClick = () => {
        setIsInventoryExpanded(!isInventoryExpanded);
        setActiveTab('inventory');
        if (!isSidebarOpen) setIsSidebarOpen(true);
    };


    // --- Render Logic ---
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 font-sans text-slate-800">
                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center transform hover:scale-105 transition-transform duration-500">
                    <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/40">
                        {/* We can use Box icon here directly if needed, strictly speaking lucide icons are components */}
                        <div className="text-white text-4xl">📦</div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">IMS.Pro Login</h1>
                    <p className="text-slate-500 mb-8">Internal Inventory Management System</p>

                    <div className="space-y-4">
                        <button onClick={() => handleLogin('admin')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200">
                            Logic as Admin
                        </button>
                        <button onClick={() => handleLogin('user')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 p-4 rounded-xl font-bold transition-all">
                            Login as Staff
                        </button>
                    </div>
                    <p className="mt-8 text-xs text-slate-400">© 2023 IMS Corp. Secure System.</p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardView inventory={inventory} currentUser={currentUser} myAssets={myAssets} requests={requests} />;
            case 'inventory': return <InventoryView inventory={inventory} addToCart={addToCart} searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} filterType="all" title="All Inventory Items" onRestock={handleRestock} />;
            case 'inventory-consumable': return <InventoryView inventory={inventory} addToCart={addToCart} searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} filterType="consumable" title="Supplies & Consumables" onRestock={handleRestock} />;
            case 'inventory-durable': return <InventoryView inventory={inventory} addToCart={addToCart} searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} filterType="durable" title="Assets & Durables" onRestock={handleRestock} />;
            case 'my-assets': return <MyAssetsView myAssets={myAssets} onCheckIn={handleCheckIn} onReturn={handleReturnRequest} onReport={handleReportIssue} />;
            case 'requests': return <RequestsView requests={requests} onAction={handleAction} />; // Admin view mostly
            case 'history': return <HistoryView history={history} />;
            case 'maintenance': return <MaintenanceView inventory={inventory} />;
            case 'cart': return <CartView cart={cart} removeFromCart={removeFromCart} setCart={setCart} />;
            case 'scanner': return <ScannerView onScan={handleScanSuccess} />;
            case 'tags': return <TagGeneratorView inventory={inventory} />;
            case 'reports': return <ReportsView />;
            case 'settings': return <SettingsView settings={settings} setSettings={setSettings} />;
            case 'users': return <UserManagementView users={users} setUsers={setUsers} />;
            default: return <div className="p-10 text-center text-slate-400">Page under construction</div>;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">
            <Sidebar
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isInventoryExpanded={isInventoryExpanded}
                setIsInventoryExpanded={setIsInventoryExpanded}
                currentUser={currentUser}
                handleLogout={handleLogout}
                requests={requests}
                myAssets={myAssets}
                inventory={inventory}
                cart={cart}
                handleInventoryMenuClick={handleInventoryMenuClick}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex justify-between items-center px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden">
                            <Menu size={24} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800 hidden md:block capitalize">
                            {activeTab.replace('-', ' ')}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Notification Bell */}
                        <div className="relative">
                            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative">
                                <Bell size={20} />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in-up">
                                    <div className="px-4 py-2 border-b border-slate-50 flex justify-between items-center">
                                        <h3 className="font-bold text-sm text-slate-700">Notifications</h3>
                                        <button className="text-[10px] text-indigo-600 font-bold hover:underline">Mark all read</button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length > 0 ? notifications.map(n => (
                                            <div key={n.id} className={`px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 ${!n.read ? 'bg-indigo-50/30' : ''}`}>
                                                <p className="text-sm text-slate-600 mb-1">{n.text}</p>
                                                <span className="text-[10px] text-slate-400">{n.time}</span>
                                            </div>
                                        )) : (
                                            <div className="p-6 text-center text-slate-400 text-sm">No new notifications</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Profile Summary or other header items could go here */}
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative main-scrollbar">
                    <div className="max-w-7xl mx-auto h-full">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
