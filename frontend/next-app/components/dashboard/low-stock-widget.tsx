'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { checkLowStock } from '@/lib/actions/notifications'; // We can reuse this or create a specific fetcher
// fast fetcher for widget
import { getLowStockItems } from '@/lib/actions/dashboard'; // Assuming we create this

export function LowStockWidget() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                // Temporary: call checkLowStock to "refresh" data then fetch? 
                // Better to have a direct fetch function.
                // Let's assume we create getLowStockItems in dashboard actions.
                const res = await getLowStockItems();
                setItems(res || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (loading) return <div className="h-[350px] flex items-center justify-center text-slate-400">Loading...</div>;

    return (
        <Card className="col-span-1 shadow-sm border-slate-200">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="text-amber-500 h-4 w-4" />
                            Low Stock Alert
                        </CardTitle>
                        <CardDescription className="text-xs">Items below minimum stock level</CardDescription>
                    </div>
                    <Badge variant={items.length > 0 ? "destructive" : "outline"}>
                        {items.length} Issues
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[250px] pr-4">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-slate-400">
                            <Package className="h-10 w-10 mb-2 opacity-50" />
                            <p className="text-sm">Everything looks good!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between group">
                                    <div className="flex items-start gap-3">
                                        {item.item.image ? (
                                            <div className="w-10 h-10 rounded-md bg-slate-100 overflow-hidden shrink-0">
                                                <img src={item.item.image} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                                                <Package size={18} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 line-clamp-1">{item.item.name}</p>
                                            <p className="text-xs text-slate-500">{item.warehouse.name}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-red-600">{item.quantity} left</p>
                                        <p className="text-[10px] text-slate-400">Min: {item.minStock}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                {items.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <Link href="/inventory" className="w-full block">
                            <Button variant="outline" size="sm" className="w-full text-xs h-8">
                                Manage Inventory
                            </Button>
                        </Link>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
