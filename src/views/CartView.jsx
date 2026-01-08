
import React from 'react';
import { ClipboardList, Trash2, History } from 'lucide-react';

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

export default CartView;
