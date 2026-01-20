'use client';

import { useState } from 'react';
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
import { Warehouse, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { WarehouseDialog } from '@/components/settings/warehouse-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

interface WarehouseClientProps {
    initialWarehouses: any[];
}

export function WarehouseClient({ initialWarehouses }: WarehouseClientProps) {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        const res = await deleteWarehouse(deleteId);
        if (res.success) {
            toast.success('Warehouse deleted');
            router.refresh();
        } else {
            toast.error(res.error || 'Failed to delete');
        }
        setIsDeleting(false);
        setDeleteId(null);
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Warehouse className="text-blue-600" /> Warehouse Management
                    </h1>
                    <p className="text-slate-500">Configure warehouses and assign managers.</p>
                </div>
                <Button onClick={() => { setSelectedWarehouse(null); setDialogOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Add Warehouse
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Warehouses</CardTitle>
                    <CardDescription>
                        List of registered warehouses in the system.
                    </CardDescription>
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
                                {initialWarehouses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                            No warehouses found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    initialWarehouses.map((wh) => (
                                        <TableRow key={wh.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-mono text-xs">{wh.code}</TableCell>
                                            <TableCell className="font-medium">{wh.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="uppercase text-[10px]">
                                                    {wh.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex -space-x-2">
                                                    {wh.managers?.map((m: any) => (
                                                        <Avatar key={m.id} className="h-6 w-6 border-2 border-white shadow-sm">
                                                            <AvatarImage src={m.avatar} />
                                                            <AvatarFallback className="text-[10px] bg-blue-50 text-blue-700">{m.name?.substring(0, 2)}</AvatarFallback>
                                                        </Avatar>
                                                    ))}
                                                    {(!wh.managers || wh.managers.length === 0) && <span className="text-slate-400 text-xs italic">Unassigned</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="rounded-full">
                                                    {wh._count?.stockLevels || 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={() => { setSelectedWarehouse(wh); setDialogOpen(true); }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="hover:text-red-600 hover:bg-red-50"
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
                </CardContent>
            </Card>

            <WarehouseDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                warehouse={selectedWarehouse}
                onSuccess={() => router.refresh()}
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && !isDeleting && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the warehouse and cascade delete all associated stock levels.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete(); }}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
