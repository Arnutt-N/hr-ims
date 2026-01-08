
import React from 'react';
import { Save } from 'lucide-react';

const SettingsView = ({ settings, setSettings }) => {
    return (
        <div className="space-y-6 animate-fade-in-up max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800">System Configuration</h2>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Organization Name</label>
                    <input
                        type="text"
                        value={settings.orgName}
                        onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Borrow Limit (Days)</label>
                        <input
                            type="number"
                            value={settings.borrowLimit}
                            onChange={(e) => setSettings({ ...settings, borrowLimit: parseInt(e.target.value) })}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Check Interval (Days)</label>
                        <input
                            type="number"
                            value={settings.checkInterval}
                            onChange={(e) => setSettings({ ...settings, checkInterval: parseInt(e.target.value) })}
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                    <input
                        type="checkbox"
                        checked={settings.maintenanceAlert}
                        onChange={(e) => setSettings({ ...settings, maintenanceAlert: e.target.checked })}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                    />
                    <label className="text-sm font-bold text-slate-700">Enable Maintenance Alerts</label>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <button onClick={() => alert('Settings Saved!')} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2">
                        <Save size={18} /> Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
