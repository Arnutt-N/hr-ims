'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchInventoryItems } from '@/lib/actions/inventory';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, QrCode, Printer, Download, Barcode, Layers } from 'lucide-react';
import QRCode from 'react-qr-code';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type TemplateSize = 'small' | 'medium' | 'large';
type TagType = 'qr' | 'barcode' | 'both';

// Barcode Generator Component
const BarcodeGenerator = ({ value, width = 2 }: { value: string; width?: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current && value) {
            try {
                JsBarcode(canvasRef.current, value, {
                    format: 'CODE128',
                    width,
                    height: 50,
                    displayValue: true,
                    fontSize: 12,
                    margin: 5,
                });
            } catch (error) {
                console.error('Barcode generation failed:', error);
            }
        }
    }, [value, width]);

    return <canvas ref={canvasRef} />;
};

export default function TagGeneratorPage() {
    const [items, setItems] = useState<any[]>([]);
    const [filteredItems, setFilteredItems] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [templateSize, setTemplateSize] = useState<TemplateSize>('medium');
    const [tagType, setTagType] = useState<TagType>('qr');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

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

    const handleDownload = async () => {
        if (selectedItems.length === 0) {
            toast.error('Please select at least one item');
            return;
        }

        setDownloading(true);
        toast.info('Generating images...');

        try {
            // Create a temporary container for the tags
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '-9999px';
            container.style.display = 'flex';
            container.style.flexWrap = 'wrap';
            container.style.gap = '20px';
            container.style.padding = '20px';
            container.style.background = 'white';
            document.body.appendChild(container);

            // Generate tags for each selected item
            for (const item of selectedItems) {
                const tagElement = createTagElement(item);
                container.appendChild(tagElement);
            }

            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 100));

            // Capture the container
            const canvas = await html2canvas(container, {
                backgroundColor: '#ffffff',
                scale: 2,
            });

            // Clean up
            document.body.removeChild(container);

            // Download
            const link = document.createElement('a');
            link.download = `asset-tags-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            toast.success(`Downloaded ${selectedItems.length} tag(s) as PNG`);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to generate images. Try using Print to PDF instead.');
        } finally {
            setDownloading(false);
        }
    };

    const createTagElement = (item: any) => {
        const config = sizeConfig[templateSize];
        const div = document.createElement('div');
        div.style.cssText = `
            background: white;
            padding: ${config.padding};
            border: 2px solid #cbd5e1;
            border-radius: 8px;
            text-align: center;
            width: fit-content;
        `;

        const value = item.serial || item.name;

        // Add QR code if needed
        if (tagType === 'qr' || tagType === 'both') {
            const qrContainer = document.createElement('div');
            // Create SVG for QR code
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 116 116');
            svg.style.width = `${config.qrSize}px`;
            svg.style.height = `${config.qrSize}px`;
            svg.style.margin = '0 auto 16px';

            // Use a simple QR-like pattern (placeholder - real implementation would use react-qr-code's SVG)
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '116');
            rect.setAttribute('height', '116');
            rect.setAttribute('fill', '#4f46e5');
            svg.appendChild(rect);

            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', '58');
            text.setAttribute('y', '58');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', 'white');
            text.setAttribute('font-size', '10');
            text.textContent = 'QR';
            svg.appendChild(text);

            qrContainer.appendChild(svg);
            div.appendChild(qrContainer);
        }

        // Add barcode if needed
        if (tagType === 'barcode' || tagType === 'both') {
            const barcodeCanvas = document.createElement('canvas');
            try {
                JsBarcode(barcodeCanvas, value, {
                    format: 'CODE128',
                    width: 2,
                    height: 50,
                    displayValue: true,
                    fontSize: 12,
                    margin: 5,
                });
            } catch (e) {
                // Fallback for invalid barcode data
            }
            barcodeCanvas.style.margin = '0 auto 16px';
            div.appendChild(barcodeCanvas);
        }

        // Add item info
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = `font-weight: bold; color: #1e293b; margin-bottom: 4px; font-size: ${config.fontSize};`;
        nameDiv.textContent = item.name;
        div.appendChild(nameDiv);

        const serialDiv = document.createElement('div');
        serialDiv.style.cssText = 'font-size: 12px; color: #64748b; font-family: monospace; background: #f1f5f9; display: inline-block; padding: 4px 8px; border-radius: 4px;';
        serialDiv.textContent = item.serial || 'NO-SN';
        div.appendChild(serialDiv);

        // Add footer
        const footer = document.createElement('div');
        footer.style.cssText = 'margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;';
        footer.innerHTML = '<span>IMS Asset</span><span>Property of IT</span>';
        div.appendChild(footer);

        return div;
    };

    const sizeConfig = {
        small: { qrSize: 100, fontSize: '10px', padding: '12px' },
        medium: { qrSize: 150, fontSize: '14px', padding: '16px' },
        large: { qrSize: 200, fontSize: '18px', padding: '24px' }
    };

    const config = sizeConfig[templateSize];

    // Render a single tag for preview
    const renderTagPreview = (item: any) => {
        const value = item.serial || item.name;

        return (
            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 text-center" style={{ padding: config.padding }}>
                {(tagType === 'qr' || tagType === 'both') && (
                    <QRCode
                        value={value}
                        size={tagType === 'both' ? config.qrSize * 0.6 : config.qrSize}
                        className="mx-auto mb-4"
                    />
                )}
                {(tagType === 'barcode' || tagType === 'both') && (
                    <div className="mx-auto mb-4 flex justify-center">
                        <BarcodeGenerator
                            value={value}
                            width={tagType === 'both' ? 1.5 : 2}
                        />
                    </div>
                )}
                <div className="font-bold text-slate-800 mb-1" style={{ fontSize: config.fontSize }}>
                    {item.name}
                </div>
                <div className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-1 rounded">
                    {item.serial || 'NO-SN'}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest">
                    <span>IMS Asset</span>
                    <span>Property of IT</span>
                </div>
            </div>
        );
    };

    // Render a tag for print layout
    const renderPrintTag = (item: any) => {
        const value = item.serial || item.name;

        return (
            <div
                key={item.id}
                className="bg-white p-6 rounded-lg border-2 border-slate-300 text-center break-inside-avoid"
                style={{ padding: config.padding }}
            >
                {(tagType === 'qr' || tagType === 'both') && (
                    <QRCode
                        value={value}
                        size={tagType === 'both' ? config.qrSize * 0.6 : config.qrSize}
                        className="mx-auto mb-4"
                    />
                )}
                {(tagType === 'barcode' || tagType === 'both') && (
                    <div className="mx-auto mb-4 flex justify-center">
                        <BarcodeGenerator
                            value={value}
                            width={tagType === 'both' ? 1.5 : 2}
                        />
                    </div>
                )}
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
        );
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading items...</div>;

    return (
        <>
            {/* Screen UI */}
            <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto h-full flex flex-col print:hidden">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">Asset Tag Generator</h2>
                    <p className="text-slate-500 mt-1">Generate and print QR codes/Barcodes for your inventory.</p>
                </div>

                <div className="flex gap-4 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-bold text-slate-600 mb-2 block">SEARCH ITEMS</label>
                        <Input
                            placeholder="Search by name or serial..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="w-48">
                        <label className="text-xs font-bold text-slate-600 mb-2 block">TAG TYPE</label>
                        <Select value={tagType} onValueChange={(val: TagType) => setTagType(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="qr">
                                    <div className="flex items-center gap-2">
                                        <QrCode size={16} /> QR Code
                                    </div>
                                </SelectItem>
                                <SelectItem value="barcode">
                                    <div className="flex items-center gap-2">
                                        <Barcode size={16} /> Barcode
                                    </div>
                                </SelectItem>
                                <SelectItem value="both">
                                    <div className="flex items-center gap-2">
                                        <Layers size={16} /> QR + Barcode
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
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
                            <h3 className="font-bold text-slate-800">
                                Tag Preview ({templateSize})
                                <Badge variant="outline" className="ml-2">
                                    {tagType === 'qr' ? 'QR' : tagType === 'barcode' ? 'Barcode' : 'Both'}
                                </Badge>
                            </h3>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                            {selectedItems.length > 0 ? (
                                renderTagPreview(selectedItems[0])
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
                                disabled={selectedItems.length === 0 || downloading}
                                onClick={handleDownload}
                                variant="outline"
                                className="w-full"
                            >
                                <Download size={18} className="mr-2" />
                                {downloading ? 'Generating...' : 'Download PNG'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Print Layout */}
            <div ref={printRef} className="hidden print:grid print:grid-cols-2 print:gap-4 print:p-4">
                {selectedItems.map((item) => renderPrintTag(item))}
            </div>
        </>
    );
}
