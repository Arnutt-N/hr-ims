'use client';

import { useState, useRef, useEffect } from 'react';
import { getItemBySN, getRecentScans } from '@/lib/actions/scanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ScanLine, QrCode, Package, AlertCircle, Wrench, ShoppingCart, Clock, Camera, X } from 'lucide-react';
import { formatThaiDateShort } from '@/lib/date-utils';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function ScannerPage() {
    const [code, setCode] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scannedItem, setScannedItem] = useState<any>(null);
    const [recentScans, setRecentScans] = useState<any[]>([]);
    const [useCamera, setUseCamera] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (!useCamera && inputRef.current) inputRef.current.focus();
        loadRecentScans();

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
            }
        };
    }, [useCamera]);

    useEffect(() => {
        if (useCamera) {
            // Give time for DOM to render
            setTimeout(() => {
                if (!scannerRef.current) {
                    const scanner = new Html5QrcodeScanner(
                        "reader",
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        /* verbose= */ false
                    );
                    scannerRef.current = scanner;
                    scanner.render(onScanSuccess, onScanFailure);
                }
            }, 100);
        } else {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
                scannerRef.current = null;
            }
        }
    }, [useCamera]);

    const onScanSuccess = (decodedText: string, decodedResult: any) => {
        // Handle success
        setCode(decodedText);
        setUseCamera(false); // Close camera on success
        processScan(decodedText);
    };

    const onScanFailure = (error: any) => {
        // handle scan failure, usually better to ignore and keep scanning.
        // console.warn(`Code scan error = ${error}`);
    };

    const loadRecentScans = async () => {
        const res = await getRecentScans();
        if (res.success) {
            setRecentScans(res.scans || []);
        }
    };

    const playSound = (success: boolean) => {
        const audio = new Audio(success ? '/sounds/success.mp3' : '/sounds/error.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
            // Fallback: use browser beep or silent fail
        });
    };

    const processScan = async (scanCode: string) => {
        if (!scanCode.trim()) return;

        setScanning(true);
        const res = await getItemBySN(scanCode.trim());
        setScanning(false);

        if (res.success && res.item) {
            setScannedItem(res.item);
            playSound(true);
            toast.success('Item scanned successfully!');
            loadRecentScans();
        } else {
            playSound(false);
            toast.error(res.error || 'Item not found');
            setScannedItem(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        processScan(code);
        setCode('');
        if (inputRef.current) inputRef.current.focus();
    };

    const handleQuickBorrow = () => {
        toast.info('Redirecting to cart...');
        // Could call addToCart action here
    };

    const handleReportIssue = () => {
        toast.info('Opening issue report...');
        // Could open a dialog
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6 animate-fade-in-up">
            {/* Main Scanner */}
            <div className="flex-1 flex flex-col items-center justify-center">
                <div className="bg-white p-6 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 text-center max-w-lg w-full relative overflow-hidden">
                    {/* Scanning Animation */}
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent ${scanning ? 'animate-[scan_2s_ease-in-out_infinite]' : 'opacity-0'}`}></div>

                    {useCamera ? (
                        <div className="mb-8 w-full max-w-full md:max-w-[300px] mx-auto overflow-hidden rounded-xl border-2 border-slate-200">
                            <div id="reader"></div>
                            <Button variant="ghost" size="sm" onClick={() => setUseCamera(false)} className="mt-2 w-full text-red-500 hover:text-red-600 hover:bg-red-50 min-h-[48px]">
                                <X size={16} className="mr-2" /> Close Camera
                            </Button>
                        </div>
                    ) : (
                        <div className="w-24 h-24 md:w-24 md:h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-8 text-indigo-600 ring-8 ring-indigo-50/50 relative cursor-pointer hover:bg-indigo-100 transition-colors active:scale-95" onClick={() => setUseCamera(true)}>
                            <ScanLine size={48} />
                            <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2 rounded-full shadow-md">
                                <Camera size={16} />
                            </div>
                        </div>
                    )}

                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">Device Scanner</h2>
                    <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-10">Use your handheld scanner, <button onClick={() => setUseCamera(true)} className="text-indigo-600 font-bold hover:underline">enable camera</button>, or manually enter SN.</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-5 pr-12 py-4 md:py-4 text-lg md:text-xl border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-center text-slate-700 placeholder-slate-300 min-h-[48px]"
                                placeholder={useCamera ? "Camera active..." : "Waiting for input..."}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                disabled={scanning || useCamera}
                            />
                            <QrCode className="absolute right-5 top-1/2 transform -translate-y-1/2 text-slate-400" size={24} />
                        </div>
                        <Button
                            type="submit"
                            disabled={scanning || !code.trim()}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/30 text-base md:text-lg min-h-[48px]"
                        >
                            {scanning ? 'Processing...' : 'Process Scan'}
                        </Button>
                    </form>

                    <div className="mt-6 md:mt-10 pt-6 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                        <span>Status: <span className={scanning ? "text-amber-500 font-bold" : "text-green-500 font-bold"}>{scanning ? 'Processing...' : 'Ready'}</span></span>
                        <span className="hidden md:inline">{useCamera ? 'Camera Mode' : 'USB HID Mode'}</span>
                    </div>
                </div>

                {/* Scanned Item Detail */}
                {scannedItem && (
                    <div className="mt-6 w-full max-w-lg bg-white rounded-2xl shadow-lg border border-slate-100 p-4 md:p-6 animate-fade-in-up">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
                                {scannedItem.image || '📦'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg md:text-xl font-bold text-slate-800 truncate">{scannedItem.name}</h3>
                                <p className="text-sm text-slate-500 font-mono truncate">{scannedItem.serial}</p>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    <Badge variant={scannedItem.status === 'available' ? 'default' : 'secondary'}>
                                        {scannedItem.status}
                                    </Badge>
                                    <Badge variant="outline">{scannedItem.category}</Badge>
                                </div>
                            </div>
                        </div>

                        {scannedItem.currentHolder && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                                <div className="flex items-center gap-2 text-amber-700 text-sm">
                                    <AlertCircle size={16} className="flex-shrink-0" />
                                    <span className="font-bold">Currently held by:</span>
                                    <span className="truncate">{scannedItem.currentHolder.name}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={handleQuickBorrow}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 min-h-[48px]"
                                disabled={scannedItem.status !== 'available'}
                            >
                                <ShoppingCart size={16} className="mr-2" /> Quick Borrow
                            </Button>
                            <Button
                                onClick={handleReportIssue}
                                variant="outline"
                                className="flex-1 min-h-[48px]"
                            >
                                <Wrench size={16} className="mr-2" /> Report Issue
                            </Button>
                        </div>
                    </div>
                )}

                {/* Recent Scans - Mobile Chips (below scanner) */}
                {recentScans.length > 0 && (
                    <div className="mt-6 w-full max-w-lg lg:hidden">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Clock size={18} className="text-slate-400" />
                            <h3 className="font-semibold text-slate-700 text-sm">Recent Scans</h3>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 px-1 -mx-1">
                            {recentScans.map((scan) => (
                                <button
                                    key={scan.id}
                                    onClick={() => { setCode(scan.item.split(' ')[0]); processScan(scan.item.split(' ')[0]); }}
                                    className="flex-shrink-0 px-4 py-2 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 rounded-full border border-slate-200 transition-colors min-h-[48px] flex items-center gap-2"
                                >
                                    <Package size={14} className="text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{scan.item.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Scans Sidebar - Desktop Only */}
            <div className="hidden lg:block lg:w-80 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Clock size={20} className="text-slate-400" />
                    <h3 className="font-bold text-slate-800">Recent Scans</h3>
                </div>

                {recentScans.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                        <Package size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No recent scans</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentScans.map((scan) => (
                            <div
                                key={scan.id}
                                className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-100 cursor-pointer transition-colors"
                                onClick={() => setCode(scan.item.split(' ')[0])} // Simplistic extraction
                            >
                                <div className="font-medium text-slate-700 text-sm">{scan.item}</div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {formatThaiDateShort(scan.date)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
