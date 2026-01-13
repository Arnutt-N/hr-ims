import Pagination from '@/components/ui/pagination';
import Search from '@/components/ui/search';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { fetchInventoryItems, fetchInventoryPages } from '@/lib/actions/inventory';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, LayoutGrid, List, Layers, Package, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { InventoryCard } from '@/components/ui/inventory-card';
import { cn } from '@/lib/utils'; // You might need to make sure this exists or use standard class string

import InventoryRemoteControls from '@/components/inventory/InventoryRemoteControls';

import ImportItemsDialog from './ImportDialog';

export default async function InventoryPage({
    searchParams,
}: {
    searchParams?: {
        query?: string;
        page?: string;
        type?: string;
        view?: string;
        warehouse?: string;
    };
}) {
    const query = searchParams?.query || '';
    const currentPage = Number(searchParams?.page) || 1;
    const type = searchParams?.type || 'all';
    const view = searchParams?.view || 'grid';
    const warehouseId = searchParams?.warehouse ? Number(searchParams.warehouse) : undefined;

    const totalPages = await fetchInventoryPages(query, type);
    const items = await fetchInventoryItems(query, currentPage, type, warehouseId);

    const isGrid = view === 'grid';

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800">Inventory</h2>
                    <p className="text-slate-500">Manage your assets and stock items ({warehouseId ? 'Filtered' : 'All Warehouses'})</p>
                </div>
                <div className="flex items-center gap-2">
                    <ImportItemsDialog />
                    <Link href="/inventory/create">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-center justify-between">
                <div className="w-full md:w-2/3">
                    <InventoryRemoteControls />
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    {/* Type Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {[
                            { id: 'all', label: 'All', icon: Layers },
                            { id: 'durable', label: 'Borrow', icon: Package },
                            { id: 'consumable', label: 'Withdraw', icon: ClipboardList }
                        ].map(tab => (
                            <Link
                                key={tab.id}
                                href={`/inventory?type=${tab.id}&view=${view}&query=${query}`}
                                scroll={false}
                            >
                                <button className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                    type === tab.id
                                        ? "bg-white text-indigo-600 shadow-md transform scale-105"
                                        : "text-slate-500 hover:text-slate-700"
                                )}>
                                    <tab.icon size={16} />
                                    <span>{tab.label}</span>
                                </button>
                            </Link>
                        ))}
                    </div>

                    <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>

                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <Link href={`/inventory?view=grid&type=${type}&query=${query}`} scroll={false}>
                            <button className={cn(
                                "p-2 rounded-md transition-all",
                                isGrid ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}>
                                <LayoutGrid size={18} />
                            </button>
                        </Link>
                        <Link href={`/inventory?view=list&type=${type}&query=${query}`} scroll={false}>
                            <button className={cn(
                                "p-2 rounded-md transition-all",
                                !isGrid ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}>
                                <List size={18} />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <Package size={48} className="text-slate-200 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900">No items found</h3>
                        <p className="text-slate-500">Try adjusting your search or filter</p>
                    </div>
                ) : isGrid ? (
                    // Grid View
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in-up">
                        {items.map((item) => (
                            // @ts-ignore - Prisma types compatibility
                            <InventoryCard key={item.id} item={item} />
                        ))}
                    </div>
                ) : (
                    // List View
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in-up">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow>
                                    <TableHead className="w-[80px]">ID</TableHead>
                                    <TableHead>Asset Info</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                                        <TableCell className="font-mono text-xs text-slate-500">#{item.id}</TableCell>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium text-slate-900">{item.name}</div>
                                                <div className="text-xs text-slate-500 font-mono">{item.serial || '-'}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell><span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-md text-slate-600">{item.category}</span></TableCell>
                                        <TableCell className="capitalize text-slate-600">{item.type}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.status === 'available' ? 'success' : item.status === 'maintenance' ? 'destructive' : 'secondary'} className="rounded-md capitalize">
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{item.stock}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <div className="flex justify-center pt-4">
                <Pagination totalPages={totalPages} />
            </div>
        </div>
    );
}
