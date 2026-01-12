'use client';

import { useState, useEffect } from 'react';
import { getMaintenanceItems, updateMaintenanceStatus } from '@/lib/actions/maintenance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Wrench, CheckCircle, Package } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function MaintenancePage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [repairNotes, setRepairNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setLoading(true);
        const res = await getMaintenanceItems();
        if (res.success) {
            setItems(res.items || []);
        }
        setLoading(false);
    };

    const handleComplete = async () => {
        if (!selectedItem) return;

        setSubmitting(true);
        const res = await updateMaintenanceStatus(
            selectedItem.id,
            'available',
            repairNotes || 'Repaired and returned to stock'
        );
        setSubmitting(false);

        if (res.success) {
            toast.success('Item marked as repaired');
            setSelectedItem(null);
            setRepairNotes('');
            loadItems();
        } else {
            toast.error(res.error || 'Failed to update');
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading maintenance items...</div>;

    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Maintenance & Repairs</h2>
                    <p className="text-slate-500 mt-1">Manage items requiring repair or maintenance.</p>
                </div>
                <div className="bg-slate-100 px-4 py-2 rounded-full font-bold text-slate-600">
                    {items.length} Item{items.length !== 1 ? 's' : ''}
                </div>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-emerald-500" size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">All Clear!</h3>
                    <p className="text-slate-400 mb-8 mt-2">No items currently in maintenance.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start gap-4">
                                <div className="bg-red-50 p-3 rounded-xl text-red-500 text-2xl shrink-0">
                                    {item.image || '🔧'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 truncate">{item.name}</h3>
                                    <p className="text-xs text-slate-500 font-mono mb-2">{item.serial || 'NO-SERIAL'}</p>

                                    <Badge variant="destructive" className="text-xs mb-3">
                                        {item.status === 'maintenance' ? 'In Repair' : 'Issue Reported'}
                                    </Badge>

                                    {item.repairNotes && (
                                        <div className="bg-slate-50 p-2 rounded-lg mb-3 text-xs text-slate-600 border border-slate-100">
                                            <div className="font-bold text-slate-500 mb-1">Notes:</div>
                                            {item.repairNotes}
                                        </div>
                                    )}

                                    {item.currentHolder && (
                                        <div className="text-xs text-slate-500 mb-3">
                                            Last held by: <span className="font-bold text-slate-700">{item.currentHolder.name}</span>
                                        </div>
                                    )}

                                    <Button
                                        size="sm"
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        <CheckCircle size={16} className="mr-2" /> Mark as Repaired
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Repair Complete Dialog */}
            <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Complete Repair</DialogTitle>
                        <DialogDescription>
                            Mark <strong>{selectedItem?.name}</strong> as repaired and return to inventory.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-2 block">
                                Repair Notes <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <Textarea
                                placeholder="Describe what was fixed or replaced..."
                                value={repairNotes}
                                onChange={(e) => setRepairNotes(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedItem(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleComplete}
                            disabled={submitting}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {submitting ? 'Updating...' : 'Complete Repair'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
