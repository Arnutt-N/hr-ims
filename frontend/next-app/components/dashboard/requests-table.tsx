'use client';

import { useState } from 'react';
import { formatThaiDateShort } from '@/lib/date-utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { updateRequestStatus } from '@/lib/actions/requests';
import { Check, X, Clock, ArrowRightLeft, Package, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function RequestsTable({ initialRequests }: { initialRequests: any[] }) {
    const [requests, setRequests] = useState(initialRequests);
    const [loadingId, setLoadingId] = useState<number | null>(null);

    // Approval Dialog State
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [dueDate, setDueDate] = useState<string>('');

    const handleApproveClick = (req: any) => {
        if (req.type === 'borrow') {
            setSelectedRequest(req);
            // Default due date: 7 days from now
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            setDueDate(nextWeek.toISOString().split('T')[0]);
            setApproveDialogOpen(true);
        } else {
            handleAction(req.id, 'approved');
        }
    };

    const confirmApprove = () => {
        if (selectedRequest) {
            handleAction(selectedRequest.id, 'approved', new Date(dueDate));
            setApproveDialogOpen(false);
            setSelectedRequest(null);
        }
    };

    const handleAction = async (id: number, status: 'approved' | 'rejected', date?: Date) => {
        setLoadingId(id);
        const result = await updateRequestStatus(id, status, date);
        setLoadingId(null);

        if (result.success) {
            toast.success(`Request ${status} successfully`);
            // Optimistic update
            setRequests(requests.map((r: any) =>
                r.id === id ? { ...r, status: status } : r
            ));
        } else {
            toast.error(result.error || 'Operation failed');
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'withdraw': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'return': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-purple-100 text-purple-700 border-purple-200';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    if (requests.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="text-slate-300" size={32} />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No requests found</h3>
                <p className="text-slate-500">There are no pending inventory requests.</p>
            </div>
        );
    }

    return (
        <>
            {/* Approval Dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Borrow Request</DialogTitle>
                        <DialogDescription>
                            Set a due date for this borrow request.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="due-date" className="text-right">
                                Due Date
                            </Label>
                            <Input
                                id="due-date"
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={confirmApprove}>Confirm Approval</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                <AnimatePresence>
                    {requests.map((req: any) => (
                        <motion.div
                            key={req.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                        >
                            {/* Card Header */}
                            <div className="p-4 pb-3 border-b border-slate-100 flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white shadow-sm flex-shrink-0">
                                        {req.user?.name?.[0] || 'U'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-800 text-sm truncate">{req.user?.name || 'Unknown'}</div>
                                        <div className="text-xs text-slate-500 truncate">{req.user?.department || 'General'}</div>
                                    </div>
                                </div>
                                <Badge variant="outline" className={`${getStatusColor(req.status)} capitalize shadow-none flex-shrink-0`}>
                                    {req.status === 'pending' && <Clock size={12} className="mr-1" />}
                                    {req.status}
                                </Badge>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Type</span>
                                    <Badge variant="outline" className={`${getTypeColor(req.type)} capitalize shadow-none`}>
                                        {req.type}
                                    </Badge>
                                </div>

                                <div>
                                    <div className="text-slate-500 text-sm mb-2">Items</div>
                                    <div className="space-y-1.5">
                                        {req.requestItems.map((item: any, idx: number) => (
                                            <div key={idx} className="text-sm text-slate-700 flex items-start gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0"></span>
                                                <span className="flex-1">
                                                    {item.item.name}
                                                    <span className="text-slate-500 ml-1">×{item.quantity}</span>
                                                </span>
                                            </div>
                                        ))}
                                        {req.items && !req.requestItems.length && (
                                            <div className="text-sm text-slate-500 italic bg-slate-50 px-3 py-2 rounded-lg">{req.items}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
                                    <span className="text-slate-500">Date</span>
                                    <span className="font-medium text-slate-700">{formatThaiDateShort(req.date)}</span>
                                </div>
                            </div>

                            {/* Card Actions */}
                            {req.status === 'pending' ? (
                                <div className="p-4 pt-0 flex gap-2">
                                    <Button
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white min-h-[48px]"
                                        onClick={() => handleApproveClick(req)}
                                        disabled={loadingId === req.id}
                                    >
                                        {loadingId === req.id ? (
                                            'Processing...'
                                        ) : (
                                            <>
                                                <Check size={18} className="mr-2" />
                                                Approve
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        className="flex-1 min-h-[48px]"
                                        onClick={() => handleAction(req.id, 'rejected')}
                                        disabled={loadingId === req.id}
                                    >
                                        {loadingId === req.id ? (
                                            'Processing...'
                                        ) : (
                                            <>
                                                <X size={18} className="mr-2" />
                                                Reject
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="px-4 pb-4">
                                    <div className="text-center text-sm text-slate-400 font-medium italic py-2 bg-slate-50 rounded-lg">
                                        {req.status === 'approved' ? '✓ Completed' : '✗ Closed'}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AnimatePresence>
                            {requests.map((req: any) => (
                                <motion.tr
                                    key={req.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="group hover:bg-slate-50/50 transition-colors"
                                    layoutId={`req-${req.id}`}
                                >
                                    <TableCell className="font-medium text-slate-600">
                                        {formatThaiDateShort(req.date)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm">
                                                {req.user?.name?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-700 text-sm">{req.user?.name || 'Unknown'}</div>
                                                <div className="text-xs text-slate-400">{req.user?.department || 'General'}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${getTypeColor(req.type)} capitalize shadow-none`}>
                                            {req.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            {req.requestItems.map((item: any, idx: number) => (
                                                <div key={idx} className="text-sm text-slate-600 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                    <span>{item.item.name} <span className="text-slate-400 text-xs">x{item.quantity}</span></span>
                                                </div>
                                            ))}
                                            {req.items && !req.requestItems.length && (
                                                <span className="text-sm text-slate-500 italic">{req.items}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={`${getStatusColor(req.status)} capitalize shadow-none`}>
                                            {req.status === 'pending' && <Clock size={12} className="mr-1" />}
                                            {req.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {req.status === 'pending' ? (
                                            <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                                                <Button
                                                    size="sm"
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 px-3"
                                                    onClick={() => handleApproveClick(req)}
                                                    disabled={loadingId === req.id}
                                                >
                                                    {loadingId === req.id ? '...' : <Check size={16} />}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-8 px-3"
                                                    onClick={() => handleAction(req.id, 'rejected')}
                                                    disabled={loadingId === req.id}
                                                >
                                                    {loadingId === req.id ? '...' : <X size={16} />}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-400 font-medium italic pr-2">
                                                {req.status === 'approved' ? 'Completed' : 'Closed'}
                                            </div>
                                        )}
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
