
import React from 'react';
import {
    LayoutDashboard, Box, ShoppingCart, Users, FileText,
    History, Monitor, ScanLine, Tags, PenTool, BarChart3,
    Settings, LogOut, ChevronRight, Package
} from 'lucide-react';
import SidebarItem from './SidebarItem';

const Sidebar = ({
    isSidebarOpen,
    setIsSidebarOpen,
    activeTab,
    setActiveTab,
    isInventoryExpanded,
    setIsInventoryExpanded,
    currentUser,
    handleLogout,
    requests,
    myAssets,
    inventory,
    cart,
    handleInventoryMenuClick
}) => {

    // Helper to calculate counts
    const getPendingRequestsCount = () => requests.filter(r => r.status === 'pending').length;
    const getMyActiveAssetsCount = () => myAssets.length;
    const getCartCount = () => cart.length;

    return (
        <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-slate-900 h-full transition-all duration-300 ease-in-out flex flex-col shadow-2xl overflow-hidden ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'}`}>
            {/* Logo Area */}
            <div className="h-20 flex items-center px-6 border-b border-white/10 bg-slate-900 relative">
                <div className={`flex items-center gap-3 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100 lg:w-0 lg:overflow-hidden'}`}>
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Box className="text-white" size={24} />
                    </div>
                    <div className={`${!isSidebarOpen && 'hidden'}`}>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">IMS.Pro</h1>
                        <p className="text-[10px] text-slate-500 tracking-widest uppercase">Inventory System</p>
                    </div>
                </div>
                {/* Toggle Button for Desktop - Only visible when collapsed or expanded explicitly */}
                {/* This logic might need adjustment based on how the original toggle worked, 
                     but simplified for this component extraction to rely on parent props */}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 main-scrollbar">
                <div className="mb-4">
                    <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 transition-opacity ${!isSidebarOpen && 'opacity-0 text-center'}`}>Main Menu</p>
                    <SidebarItem icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} isOpen={isSidebarOpen} />
                </div>

                <div className="mb-4">
                    <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 transition-opacity ${!isSidebarOpen && 'opacity-0 text-center'}`}>Inventory</p>

                    {/* Inventory Dropdown Group */}
                    <SidebarItem
                        icon={<Package />}
                        label="Inventory Items"
                        active={activeTab === 'inventory' || activeTab === 'inventory-consumable' || activeTab === 'inventory-durable'}
                        onClick={handleInventoryMenuClick}
                        isOpen={isSidebarOpen}
                        hasSubMenu={true}
                        isExpanded={isInventoryExpanded}
                    />

                    {/* Submenu */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out space-y-1 ${isInventoryExpanded && isSidebarOpen ? 'max-h-40 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
                        <SidebarItem
                            icon={<Box />}
                            label="All Items"
                            active={activeTab === 'inventory'}
                            onClick={() => setActiveTab('inventory')}
                            isOpen={isSidebarOpen}
                            isSubItem
                        />
                        <SidebarItem
                            icon={<Box />} // Ideally differentiate icon
                            label="Consumables (Withraw)"
                            active={activeTab === 'inventory-consumable'}
                            onClick={() => setActiveTab('inventory-consumable')}
                            isOpen={isSidebarOpen}
                            isSubItem
                        />
                        <SidebarItem
                            icon={<Box />} // Ideally differentiate icon
                            label="Durables (Borrow)"
                            active={activeTab === 'inventory-durable'}
                            onClick={() => setActiveTab('inventory-durable')}
                            isOpen={isSidebarOpen}
                            isSubItem
                        />
                    </div>

                    <SidebarItem icon={<ShoppingCart />} label="My Cart" active={activeTab === 'cart'} onClick={() => setActiveTab('cart')} isOpen={isSidebarOpen} count={getCartCount()} />
                    {currentUser.role === 'user' && (
                        <SidebarItem icon={<Box />} label="My Assets" active={activeTab === 'my-assets'} onClick={() => setActiveTab('my-assets')} isOpen={isSidebarOpen} count={getMyActiveAssetsCount()} />
                    )}
                </div>

                <div className="mb-4">
                    <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 transition-opacity ${!isSidebarOpen && 'opacity-0 text-center'}`}>Management</p>
                    {currentUser.role === 'admin' && (
                        <>
                            <SidebarItem icon={<Users />} label="User Management" active={activeTab === 'users'} onClick={() => setActiveTab('users')} isOpen={isSidebarOpen} />
                            <SidebarItem icon={<FileText />} label="Requests" active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} isOpen={isSidebarOpen} count={getPendingRequestsCount()} />
                        </>
                    )}
                    <SidebarItem icon={<History />} label="History Logs" active={activeTab === 'history'} onClick={() => setActiveTab('history')} isOpen={isSidebarOpen} />
                    <SidebarItem icon={<Monitor />} label="Maintenance" active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} isOpen={isSidebarOpen} count={inventory.filter(i => i.status === 'maintenance').length} />
                </div>

                <div className="mb-4">
                    <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 transition-opacity ${!isSidebarOpen && 'opacity-0 text-center'}`}>Tools</p>
                    <SidebarItem icon={<ScanLine />} label="Scanner Mode" active={activeTab === 'scanner'} onClick={() => setActiveTab('scanner')} isOpen={isSidebarOpen} />
                    {currentUser.role === 'admin' && (
                        <SidebarItem icon={<Tags />} label="Tag Generator" active={activeTab === 'tags'} onClick={() => setActiveTab('tags')} isOpen={isSidebarOpen} />
                    )}
                    <SidebarItem icon={<BarChart3 />} label="Reports" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} isOpen={isSidebarOpen} />
                </div>
                <div className="mb-4">
                    <p className={`px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 transition-opacity ${!isSidebarOpen && 'opacity-0 text-center'}`}>System</p>
                    <SidebarItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} isOpen={isSidebarOpen} />
                </div>
            </nav>

            {/* Profile Footer */}
            <div className="p-4 border-t border-white/10 bg-slate-800/50">
                <div className={`flex items-center gap-3 transition-all ${!isSidebarOpen && 'justify-center'}`}>
                    <img src={currentUser.avatar} alt="Profile" className="w-10 h-10 rounded-full border-2 border-indigo-500" />
                    {isSidebarOpen && (
                        <div className="flex-1 overflow-hidden">
                            <h4 className="text-sm font-bold text-white truncate">{currentUser.name}</h4>
                            <p className="text-[10px] text-slate-400 truncate">{currentUser.role === 'admin' ? 'Administrator' : 'General User'}</p>
                        </div>
                    )}
                    {isSidebarOpen && (
                        <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Logout">
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
