'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileDown, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { importInventoryItems } from '@/lib/actions/inventory';
import { toast } from 'sonner';

export default function ImportItemsDialog() {
    const [open, setOpen] = useState(false);
    const [csvData, setCsvData] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const handleImport = async () => {
        if (!csvData.trim()) {
            toast.error('Please enter CSV data.');
            return;
        }

        setIsLoading(true);
        try {
            // Simple CSV Parser
            const lines = csvData.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            // Validate headers
            const requiredFields = ['name', 'category', 'type'];
            const missing = requiredFields.filter(f => !headers.includes(f));
            if (missing.length > 0) {
                toast.error(`Missing headers: ${missing.join(', ')}`);
                setIsLoading(false);
                return;
            }

            const items: any[] = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',').map(v => v.trim());
                if (values.length !== headers.length) {
                    // Check for simple mismatch, skip or warn?
                    // Skipping for robustness
                    continue;
                }

                const item: any = {};
                headers.forEach((h, index) => {
                    item[h] = values[index];
                });
                items.push(item);
            }

            if (items.length === 0) {
                toast.error('No valid items found.');
                setIsLoading(false);
                return;
            }

            const result = await importInventoryItems(items);

            if (result.success) {
                toast.success(`Successfully imported ${result.count} items.`);
                setOpen(false);
                setCsvData('');
            } else {
                toast.error(result.error || 'Import failed.');
            }
        } catch (error) {
            toast.error('Failed to parse CSV.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadTemplate = () => {
        setCsvData('name, category, type, serial, warehouseId, quantity, minStock\nLaptop, IT, durable, SN001, 1, 10, 2');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Upload size={16} /> Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Bulk Import Items</DialogTitle>
                    <DialogDescription>
                        Copy and paste your CSV data below. First row must be headers.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex justify-between items-center text-sm text-slate-500">
                        <p>Req: name, category, type</p>
                        <Button variant="ghost" size="sm" onClick={loadTemplate} className="text-indigo-600 h-auto p-0 hover:bg-transparent">
                            Load Example
                        </Button>
                    </div>

                    <Textarea
                        value={csvData}
                        onChange={(e) => setCsvData(e.target.value)}
                        placeholder="name, category, type, serial, ..."
                        className="h-[200px] font-mono text-xs"
                    />

                    <div className="bg-slate-50 p-3 rounded-md border border-slate-100 text-xs text-slate-500">
                        <p className="font-bold flex items-center gap-1"><AlertCircle size={12} /> Notes:</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                            <li>Supported fields: name, category, type, serial, image, warehouseId, quantity, minStock</li>
                            <li>Warehouse ID must be valid number if provided.</li>
                            <li>Type: 'durable' or 'consumable'.</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleImport} disabled={isLoading || !csvData}>
                        {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : <CheckCircle className="mr-2" size={16} />}
                        Import Items
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
