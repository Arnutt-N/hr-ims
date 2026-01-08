
import React from 'react';
import { Search, Package, Edit } from 'lucide-react';

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
                            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-sm transition-all"
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

export default InventoryView;
