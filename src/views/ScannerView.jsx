
import React, { useState, useRef, useEffect } from 'react';
import { ScanLine, QrCode } from 'lucide-react';

const ScannerView = ({ onScan }) => {
    const [code, setCode] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) inputRef.current.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (code) {
            onScan(code);
            setCode('');
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center animate-fade-in-up">
            <div className="bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 text-center max-w-lg w-full relative overflow-hidden">
                {/* Scanning Animation Element */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-[scan_2s_ease-in-out_infinite]"></div>

                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-8 text-indigo-600 ring-8 ring-indigo-50/50">
                    <ScanLine size={48} />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Device Scanner</h2>
                <p className="text-slate-500 mb-10">Use your handheld scanner or manually enter the SN.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full pl-5 pr-12 py-4 text-xl border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-mono text-center text-slate-700 placeholder-slate-300"
                            placeholder="Waiting for input..."
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />
                        <QrCode className="absolute right-5 top-1/2 transform -translate-y-1/2 text-slate-400" size={24} />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-lg">
                        Process Scan
                    </button>
                </form>

                <div className="mt-10 pt-6 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
                    <span>Status: <span className="text-green-500 font-bold">Ready</span></span>
                    <span>USB HID Mode</span>
                </div>
            </div>
        </div>
    );
};

export default ScannerView;
