'use client';

import Link from 'next/link';

import { Package, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface InventoryItem {
    id: number;
    name: string;
    category: string;
    type: string;
    status: string;
    stock: number;
    image?: string;
    serial?: string;
}

import { addToCart } from '@/lib/actions/cart';
import { toast } from 'sonner';
import { useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';

// ... interface InventoryItem ...

interface InventoryCardProps {
    item: InventoryItem;
    onAction?: (item: InventoryItem) => void;
    isAdmin?: boolean;
}

export function InventoryCard({ item, onAction, isAdmin }: InventoryCardProps) {
    const [loading, setLoading] = useState(false);
    const isAvailable = item.status === 'available' || item.stock > 0;
    const isConsumable = item.type === 'consumable';

    const handleAction = async () => {
        if (!isAvailable) return;

        setLoading(true);
        // Call server action directly if no external handler provided
        if (!onAction) {
            const result = await addToCart(item.id, 1);
            if (result.success) {
                toast.success(`${item.name} added to cart`);
            } else {
                toast.error(result.error || 'Failed to add to cart');
            }
        } else {
            onAction(item);
        }
        setLoading(false);
    };

    return (
        <Link href={`/inventory/${item.id}`} className="block">
            <motion.div
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col cursor-pointer"
            >
                {/* Image Section */}
                <div className="h-48 bg-slate-50/50 flex items-center justify-center relative overflow-hidden group-hover:bg-slate-100/50 transition-colors">
                    {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                        <Package size={64} className="text-slate-200 group-hover:scale-110 transition-transform duration-500" />
                    )}

                    <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border shadow-sm
                            ${isConsumable
                                ? 'bg-blue-50 text-blue-600 border-blue-100'
                                : 'bg-purple-50 text-purple-600 border-purple-100'}`}
                        >
                            {isConsumable ? 'เบิก (withdraw)' : 'ยืม (borrow)'}
                        </span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-5 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                            {item.category}
                        </span>
                        {isConsumable && (
                            <span className={`text-xs font-bold ${item.stock > 10 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                Stock: {item.stock}
                            </span>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                        {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mb-4">{item.serial || 'NO-SERIAL'}</p>

                    {/* Status Indicator (for Durable */}
                    {!isConsumable && (
                        <div className="flex items-center gap-2 mb-4 text-xs font-medium text-slate-500">
                            {item.status === 'available' ? (
                                <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                                    <CheckCircle2 size={14} /> Available
                                </span>
                            ) : (
                                <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                                    <Clock size={14} /> {item.status}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-slate-50">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                handleAction();
                            }}
                            disabled={!isAvailable || loading}
                            className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-95
                                ${isAvailable
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            {loading ? 'Adding...' : (
                                <>
                                    {isConsumable ? <ShoppingCart size={16} /> : <CheckCircle2 size={16} />}
                                    {isConsumable ? 'Add to Cart' : 'Request Borrow'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
