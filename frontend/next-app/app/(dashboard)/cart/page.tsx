'use client';

import { useState, useEffect } from 'react';
import { getCart, removeFromCart, submitCart } from '@/lib/actions/cart';
import { getMyMapping } from '@/lib/actions/departments';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, ClipboardList, History, ArrowRight, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock types for now, ideally imported from Prisma client
type CartItem = {
    id: number;
    itemId: number;
    quantity: number;
    item: {
        id: number;
        name: string;
        type: string;
        image: string | null;
        serial: string | null;
    };
};

export default function CartPage() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [targetWarehouse, setTargetWarehouse] = useState<{ name: string } | null>(null);

    useEffect(() => {
        fetchCart();
        fetchWarehouse();
    }, []);

    const fetchWarehouse = async () => {
        const res = await getMyMapping();
        if (res && res.warehouse) {
            setTargetWarehouse(res.warehouse);
        }
    };

    const fetchCart = async () => {
        const res = await getCart();
        if (res.success && res.cart) {
            setCart(res.cart as any); // Type assertion fix
        }
        setLoading(false);
    };

    const handleRemove = async (id: number) => {
        const res = await removeFromCart(id);
        if (res.success) {
            setCart(prev => prev.filter(i => i.id !== id));
            toast.success('Item removed');
        } else {
            toast.error('Failed to remove item');
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const res = await submitCart();
        setSubmitting(false);
        if (res.success) {
            toast.success('Request submitted successfully!');
            setCart([]);
        } else {
            toast.error(res.error || 'Submission failed');
        }
    };

    const consumables = cart.filter(i => i.item.type === 'consumable');
    const durables = cart.filter(i => i.item.type === 'durable');

    if (loading) return <div className="p-8 text-center animate-pulse">Loading cart...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Your Cart</h1>
                    <p className="text-slate-500">Review items before requesting.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {targetWarehouse && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md shadow-sm text-sm text-indigo-600 font-medium mr-2">
                            <MapPin size={14} />
                            To: {targetWarehouse.name}
                        </div>
                    )}
                    <div className="px-3 py-1.5 font-bold text-slate-600 border-l border-slate-200 pl-4">
                        {cart.length} Items
                    </div>
                </div>
            </div>

            {cart.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ClipboardList className="text-slate-300" size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">Cart is empty</h3>
                    <p className="text-slate-400 mb-8 mt-2">Browse inventory to add items.</p>
                    <Button variant="outline" onClick={() => window.location.href = '/inventory'}>
                        Go to Inventory
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {consumables.length > 0 && (
                        <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
                            <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <ClipboardList size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-blue-900">Consumables (Withdrawal)</h3>
                                    <p className="text-xs text-blue-500">Items will be deducted from stock</p>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {consumables.map((item) => (
                                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-xl">
                                                {item.item.image || '📦'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-700">{item.item.name}</div>
                                                <div className="text-sm text-slate-500">Qty: {item.quantity}</div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => handleRemove(item.id)}
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {durables.length > 0 && (
                        <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden shadow-sm">
                            <div className="bg-purple-50/50 p-4 border-b border-purple-100 flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                    <History size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-purple-900">Durables (Borrow)</h3>
                                    <p className="text-xs text-purple-500">Must be returned within 7 days</p>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {durables.map((item) => (
                                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-xl">
                                                {item.item.image || '💻'}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-700">{item.item.name}</div>
                                                <div className="text-sm text-slate-500">Serial: {item.item.serial || '-'}</div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => handleRemove(item.id)}
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 min-w-[200px]"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : (
                                <>
                                    Confirm All Requests <ArrowRight size={18} className="ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
