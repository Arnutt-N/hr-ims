
import React from 'react';

const MaintenanceView = ({ inventory = [] }) => {
    const maintenanceItems = inventory.filter(i => i.status === 'maintenance');
    return (
        <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800">Maintenance & Repairs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {maintenanceItems.length > 0 ? maintenanceItems.map(item => (
                    <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 flex items-start gap-4">
                        <div className="bg-red-50 p-3 rounded-xl text-red-500 text-2xl">{item.image}</div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800">{item.name}</h3>
                            <p className="text-xs text-slate-500 font-mono mb-2">{item.serial}</p>
                            <div className="flex justify-between items-center mt-4">
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">In Repair</span>
                                <button className="text-xs text-indigo-600 hover:underline">Update Status</button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-3 text-center p-12 text-slate-400">No items currently in maintenance.</div>
                )}
            </div>
        </div>
    );
};

export default MaintenanceView;
