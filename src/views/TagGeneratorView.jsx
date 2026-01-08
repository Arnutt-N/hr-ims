
import React, { useState } from 'react';
import { CheckCircle, QrCode, Printer, Download } from 'lucide-react';

const TagGeneratorView = ({ inventory = [] }) => {
    const [selectedItem, setSelectedItem] = useState(null);

    const handlePrint = () => {
        alert('Printing Tag for: ' + selectedItem.name + '\nSending to printer...');
    };

    return (
        <div className="space-y-8 animate-fade-in-up max-w-7xl mx-auto h-full flex flex-col">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Asset Tag Generator</h2>
                <p className="text-slate-500 mt-1">Generate and print QR codes/Barcodes for your inventory.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 flex-1 min-h-0">
                {/* List */}
                <div className="lg:flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <input type="text" placeholder="Search item to generate tag..." className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm" />
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 main-scrollbar"> {/* Added Scrollbar */}
                        {inventory.map(item => (
                            <div
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border mb-2
                    ${selectedItem?.id === item.id
                                        ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                            >
                                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl border border-slate-100">
                                    {item.image}
                                </div>
                                <div>
                                    <h4 className={`font-bold text-sm ${selectedItem?.id === item.id ? 'text-indigo-700' : 'text-slate-700'}`}>{item.name}</h4>
                                    <span className="text-xs text-slate-400 font-mono">{item.serial}</span>
                                </div>
                                {selectedItem?.id === item.id && <div className="ml-auto text-indigo-600"><CheckCircle size={18} /></div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="lg:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col">
                    <div className="p-6 border-b border-slate-100 text-center bg-slate-50/30">
                        <h3 className="font-bold text-slate-800">Tag Preview</h3>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                        {selectedItem ? (
                            <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 text-center w-full max-w-[280px]">
                                <div className="mb-4">
                                    {/* QR Code Simulation */}
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedItem.serial}`}
                                        alt="QR Code"
                                        className="mx-auto w-40 h-40 mix-blend-multiply"
                                    />
                                </div>
                                <div className="font-bold text-slate-800 text-lg mb-1">{selectedItem.name}</div>
                                <div className="text-xs text-slate-500 font-mono bg-slate-100 inline-block px-2 py-1 rounded">{selectedItem.serial}</div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest">
                                    <span>IMS Asset</span>
                                    <span>Property of IT Dept</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400">
                                <QrCode size={48} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm">Select an item to preview tag</p>
                            </div>
                        )}
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50">
                        <button
                            disabled={!selectedItem}
                            onClick={handlePrint}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Printer size={18} /> Print Label
                        </button>
                        <button
                            disabled={!selectedItem}
                            className="w-full mt-3 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600 border border-slate-200 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={18} /> Download PNG
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TagGeneratorView;
