'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteWarehouse } from '@/lib/actions/warehouse';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Warehouse as WarehouseIcon, Plus, Edit, Trash2, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { WarehouseDialog } from '@/components/settings/warehouse-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Warehouse } from '@/types/schema';

interface WarehouseClientProps {
    initialWarehouses: Warehouse[];
}

const ITEMS_PER_PAGE = 10;

export function WarehouseClient({ initialWarehouses }: WarehouseClientProps) {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            const res = await deleteWarehouse(deleteId);
            if (res.success) {
                toast.success('Warehouse deleted');
                router.refresh();
            } else {
                toast.error(res.error || 'Failed to delete');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setIsDeleting(false);
            setDeleteId(null);
        }
    };

    const filteredWarehouses = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return initialWarehouses;
        return initialWarehouses.filter(wh =>
            wh.name.toLowerCase().includes(query) ||
            wh.code.toLowerCase().includes(query)
        );
    }, [initialWarehouses, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredWarehouses.length / ITEMS_PER_PAGE);
    const paginatedWarehouses = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredWarehouses.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredWarehouses, currentPage]);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <WarehouseIcon className="text-blue-600" /> Warehouse Management
                    </h1>
                    <p className="text-slate-500">Configure warehouses and assign managers.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200" onClick={() => { setSelectedWarehouse(null); setDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Warehouse
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>All Warehouses</CardTitle>
                            <CardDescription>
                                List of registered warehouses in the system.
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name or code..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Managers</TableHead>
                                    <TableHead className="text-center">Items</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedWarehouses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                                            {searchQuery ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Search className="h-8 w-8 text-slate-300" />
                                                    <p>No warehouses found matching "{searchQuery}"</p>
                                                    <Button variant="link" onClick={() => setSearchQuery('')}>Clear search</Button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <WarehouseIcon className="h-8 w-8 text-slate-300" />
                                                    <p>No warehouses registered yet.</p>
                                                    <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                                                        Create your first warehouse
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedWarehouses.map((wh) => (
                                        <TableRow key={wh.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-mono text-xs font-medium">{wh.code}</TableCell>
                                            <TableCell className="font-medium">{wh.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    wh.type === 'main' ? 'default' :
                                                        wh.type === 'division' ? 'secondary' : 'outline'
                                                }>
                                                    {wh.type === 'main' ? 'Main' :
                                                        wh.type === 'division' ? 'Division' : 'Provincial'}
                                                </Badge>
                                                {wh.type === 'division' && wh.division && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {wh.division.name}
                                                    </div>
                                                )}
                                                {wh.type === 'provincial' && wh.province && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        {wh.province.name}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex -space-x-2">
                                                    {wh.managers?.map((m) => (
                                                        <Avatar key={m.id} className="h-6 w-6 border-2 border-white shadow-sm ring-1 ring-slate-100" title={m.name || 'User'}>
                                                            <AvatarImage src={m.avatar || undefined} />
                                                            <AvatarFallback className="text-[10px] bg-blue-50 text-blue-700">
                                                                {m.name?.substring(0, 2).toUpperCase() || 'UN'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    ))}
                                                    {(!wh.managers || wh.managers.length === 0) && (
                                                        <span className="text-slate-400 text-xs italic">Unassigned</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-xs font-medium">
                                                    {wh._count?.stockLevels || 0}
                                                    <span className="text-slate-400">items</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={() => { setSelectedWarehouse(wh); setDialogOpen(true); }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => setDeleteId(wh.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 px-2">
                            <p className="text-sm text-slate-500">
                                Page {currentPage} of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent >
            </Card >

            <WarehouseDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                warehouse={selectedWarehouse}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && !isDeleting && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Warehouse?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{initialWarehouses.find(w => w.id === deleteId)?.name}</strong> and all associated stock levels. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete(); }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                                </>
                            ) : (
                                'Delete Warehouse'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
