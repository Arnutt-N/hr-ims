
import React, { useState, useEffect } from 'react';
import {
    Menu, Bell
} from 'lucide-react';

// Import API
import { api } from './services/api';

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
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isInventoryExpanded, setIsInventoryExpanded] = useState(true);
    const [requests, setRequests] = useState([]);
    const [myAssets, setMyAssets] = useState([]);
    const [users, setUsers] = useState([]);
    const [history, setHistory] = useState([]);
    const [settings, setSettings] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- Hooks ---
    useThaiFont();

    // --- Effects ---
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Check for existing token
    useEffect(() => {
        // In a real app, verify token validity here
        const token = localStorage.getItem('token');
        if (token) {
            // This is a simplification. We should ideally hit an endpoint to get 'me'
            // For now, force re-login or just clear token if no persistence logic
            // localStorage.removeItem('token'); 
        }
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fetchedInventory, fetchedRequests, fetchedAssets, fetchedHistory, fetchedUsers] = await Promise.all([
                api.inventory.getAll(),
                api.requests.getAll(),
                api.assets.getMyAssets(),
                api.history.getAll(),
                api.users.getAll()
            ]);

            setInventory(fetchedInventory);
            setRequests(fetchedRequests);
            setMyAssets(fetchedAssets);
            setHistory(fetchedHistory);
            setUsers(fetchedUsers);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---
    const handleLogin = async (role) => {
        try {
            // Hardcoded credentials for demo buttons
            const email = role === 'admin' ? 'admin@ims.pro' : 'somchai@ims.pro';
            const password = 'password123';

            const data = await api.auth.login(email, password);
            setCurrentUser(data.user);
            fetchData();
        } catch (error) {
            alert('Login failed: ' + error.message);
        }
    };

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            setCurrentUser(null);
            setCart([]);
            setActiveTab('dashboard');
        }
    };

    const addToCart = (item) => {
        if (!cart.find(i => i.id === item.id)) {
            setCart([...cart, item]);
        }
    };

    const removeFromCart = (itemId) => {
        setCart(cart.filter(i => i.id !== itemId));
    };

    const handleAction = (id, status) => {
        // Implement API call for update status
        setRequests(requests.map(req => req.id === id ? { ...req, status } : req));
    };

    const handleCheckIn = (id) => {
        alert('Check-in feature pending API implementation');
    };

    const handleReturnRequest = (asset) => {
        if (confirm(`Request to return: ${asset.name}?`)) {
            // Implement API call
            alert('Return request sent (mock)');
        }
    };

    const handleReportIssue = (asset) => {
        const issue = prompt('Please describe the issue/problem:');
        if (issue) {
            alert('Issue reported to admin (mock)');
        }
    };

    const handleScanSuccess = (code) => {
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
            // Call API update
            // api.inventory.update(item.id, { stock: item.stock + parseInt(amount) }).then(newItem => ...);
            // Updating local state for responsiveness:
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
                        <div className="text-white text-4xl">📦</div>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">IMS.Pro Login</h1>
                    <p className="text-slate-500 mb-8">Internal Inventory Management System</p>

                    <div className="space-y-4">
                        <button onClick={() => handleLogin('admin')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200">
                            Login as Admin
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

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardView inventory={inventory} currentUser={currentUser} myAssets={myAssets} requests={requests} />;
            case 'inventory': return <InventoryView inventory={inventory} addToCart={addToCart} searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} filterType="all" title="All Inventory Items" onRestock={handleRestock} />;
            case 'inventory-consumable': return <InventoryView inventory={inventory} addToCart={addToCart} searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} filterType="consumable" title="Supplies & Consumables" onRestock={handleRestock} />;
            case 'inventory-durable': return <InventoryView inventory={inventory} addToCart={addToCart} searchQuery={searchQuery} setSearchQuery={setSearchQuery} currentUser={currentUser} filterType="durable" title="Assets & Durables" onRestock={handleRestock} />;
            case 'my-assets': return <MyAssetsView myAssets={myAssets} onCheckIn={handleCheckIn} onReturn={handleReturnRequest} onReport={handleReportIssue} />;
            case 'requests': return <RequestsView requests={requests} onAction={handleAction} />;
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

            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
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
                        <div className="relative">
                            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors relative">
                                <Bell size={20} />
                                {notifications.filter(n => !n.read).length > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                                )}
                            </button>
                        </div>
                    </div>
                </header>

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
