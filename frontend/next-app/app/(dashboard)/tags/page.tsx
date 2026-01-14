'use client';

import { useState, useEffect } from 'react';
import { fetchInventoryItems } from '@/lib/actions/inventory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, QrCode, Printer, Download } from 'lucide-react';
import QRCode from 'react-qr-code';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type TemplateSize = 'small' | 'medium' | 'large';

export default function TagGeneratorPage() {
    const [items, setItems] = useState<any[]>([]);
    const [filteredItems, setFilteredItems] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [templateSize, setTemplateSize] = useState<TemplateSize>('medium');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadItems();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const filtered = items.filter(item =>
                item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.serial?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredItems(filtered);
        } else {
            setFilteredItems(items);
        }
    }, [searchQuery, items]);

    const loadItems = async () => {
        setLoading(true);
        const res = await fetchInventoryItems('', 1, 'all');
        setItems(res);
        setFilteredItems(res);
        setLoading(false);
    };

    const toggleItemSelection = (item: any) => {
        setSelectedItems(prev => {
            const exists = prev.find(i => i.id === item.id);
            if (exists) {
                return prev.filter(i => i.id !== item.id);
            } else {
                return [...prev, item];
            }
        });
    };

    const handlePrint = () => {
        if (selectedItems.length === 0) {
            toast.error('Please select at least one item');
            return;
        }
        window.print();
        toast.success(`Printing ${selectedItems.length} label(s)...`);
    };

    const handleDownload = () => {
        if (selectedItems.length === 0) {
            toast.error('Please select at least one item');
            return;
        }
        // Simplified: would need proper canvas export for production
        toast.info('Download feature: Use browser print to PDF');
    };

    const sizeConfig = {
        small: { qrSize: 100, fontSize: '10px', padding: '12px' },
        medium: { qrSize: 150, fontSize: '14px', padding: '16px' },
        large: { qrSize: 200, fontSize: '18px', padding: '24px' }
    };

    const config = sizeConfig[templateSize];

    if (loading) return <div className="p-8 text-center animate-pulse">Loading items...</div>;

    return (
        <>
            {/* Screen UI */}
            <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto h-full flex flex-col print:hidden">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Asset Tag Generator</h2>
                    <p className="text-slate-500 mt-1">Generate and print QR codes/Barcodes for your inventory.</p>
                </div>

                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-600 mb-2 block">SEARCH ITEMS</label>
                        <Input
                            placeholder="Search by name or serial..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="w-48">
                        <label className="text-xs font-bold text-slate-600 mb-2 block">LABEL SIZE</label>
                        <Select value={templateSize} onValueChange={(val: TemplateSize) => setTemplateSize(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="small">Small (100x100)</SelectItem>
                                <SelectItem value="medium">Medium (150x150)</SelectItem>
                                <SelectItem value="large">Large (200x200)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
                    {/* Items List */}
                    <div className="lg:flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <span className="text-sm font-bold text-slate-600">
                                {selectedItems.length} Selected
                            </span>
                            {selectedItems.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedItems([])}
                                >
                                    Clear All
                                </Button>
                            )}
                        </div>
                        <div className="overflow-y-auto flex-1 p-2">
                            {filteredItems.map(item => {
                                const isSelected = selectedItems.some(i => i.id === item.id);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => toggleItemSelection(item)}
                                        className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border mb-2
                                            ${isSelected
                                                ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                                : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                                    >
                                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl border border-slate-100">
                                            {item.image || '📦'}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                {item.name}
                                            </h4>
                                            <span className="text-xs text-slate-400 font-mono">{item.serial || 'NO-SN'}</span>
                                        </div>
                                        {isSelected && <div className="text-indigo-600"><CheckCircle size={18} /></div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preview Panel */}
                    <div className="lg:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col">
                        <div className="p-6 border-b border-slate-100 text-center bg-slate-50/30">
                            <h3 className="font-bold text-slate-800">Tag Preview ({templateSize})</h3>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                            {selectedItems.length > 0 ? (
                                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 text-center" style={{ padding: config.padding }}>
                                    <QRCode
                                        value={selectedItems[0].serial || selectedItems[0].name}
                                        size={config.qrSize}
                                        className="mx-auto mb-4"
                                    />
                                    <div className="font-bold text-slate-800 mb-1" style={{ fontSize: config.fontSize }}>
                                        {selectedItems[0].name}
                                    </div>
                                    <div className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-1 rounded">
                                        {selectedItems[0].serial || 'NO-SN'}
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest">
                                        <span>IMS Asset</span>
                                        <span>Property of IT</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400">
                                    <QrCode size={48} className="mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Select item(s) to preview tags</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-3">
                            <Button
                                disabled={selectedItems.length === 0}
                                onClick={handlePrint}
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                            >
                                <Printer size={18} className="mr-2" /> Print {selectedItems.length > 1 ? `${selectedItems.length} Labels` : 'Label'}
                            </Button>
                            <Button
                                disabled={selectedItems.length === 0}
                                onClick={handleDownload}
                                variant="outline"
                                className="w-full"
                            >
                                <Download size={18} className="mr-2" /> Download PNG
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Layout */}
            <div className="hidden print:grid print:grid-cols-2 print:gap-4 print:p-4">
                {selectedItems.map((item, index) => (
                    <div
                        key={item.id}
                        className="bg-white p-6 rounded-lg border-2 border-slate-300 text-center break-inside-avoid"
                        style={{ padding: config.padding }}
                    >
                        <QRCode
                            value={item.serial || item.name}
                            size={config.qrSize}
                            className="mx-auto mb-4"
                        />
                        <div className="font-bold text-slate-800 mb-1" style={{ fontSize: config.fontSize }}>
                            {item.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-1 rounded">
                            {item.serial || 'NO-SN'}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest">
                            <span>IMS Asset</span>
                            <span>Property of IT</span>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
