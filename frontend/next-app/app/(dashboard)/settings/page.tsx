'use client';

import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '@/lib/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Settings as SettingsIcon, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TestEmailButton } from '@/components/settings/test-email-button';

export default function SettingsPage() {
    const [settings, setSettings] = useState<any>(null);
    const [formData, setFormData] = useState({
        orgName: '',
        borrowLimit: 7,
        checkInterval: 7,
        maintenanceAlert: true,
        allowRegistration: false,
        footerText: ''
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (settings) {
            const changed =
                formData.orgName !== settings.orgName ||
                formData.borrowLimit !== settings.borrowLimit ||
                formData.checkInterval !== settings.checkInterval ||
                formData.maintenanceAlert !== settings.maintenanceAlert ||
                formData.allowRegistration !== settings.allowRegistration ||
                formData.footerText !== settings.footerText;
            setHasChanges(changed);
        }
    }, [formData, settings]);

    const loadSettings = async () => {
        setLoading(true);
        const res = await getSettings();
        if (res.success && res.settings) {
            setSettings(res.settings);
            setFormData({
                orgName: res.settings.orgName,
                borrowLimit: res.settings.borrowLimit,
                checkInterval: res.settings.checkInterval,
                maintenanceAlert: res.settings.maintenanceAlert,
                allowRegistration: res.settings.allowRegistration || false,
                footerText: res.settings.footerText || ''
            });
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!settings) return;

        setSubmitting(true);
        const res = await updateSettings(settings.id, formData);
        setSubmitting(false);

        if (res.success) {
            toast.success('Settings saved successfully!');
            setSettings({ ...settings, ...formData });
            setHasChanges(false);
        } else {
            toast.error(res.error || 'Failed to save settings');
        }
    };

    const handleReset = () => {
        if (settings) {
            setFormData({
                orgName: settings.orgName,
                borrowLimit: settings.borrowLimit,
                checkInterval: settings.checkInterval,
                maintenanceAlert: settings.maintenanceAlert,
                allowRegistration: settings.allowRegistration || false,
                footerText: settings.footerText || ''
            });
            setHasChanges(false);
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading settings...</div>;

    return (
        <div className="space-y-6 animate-fade-in-up max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <SettingsIcon size={32} className="text-indigo-600" />
                        System Configuration
                    </h2>
                    <p className="text-slate-500 mt-1">Manage application-wide settings and defaults.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings/sessions'}>
                        <Shield size={16} className="mr-2" />
                        Active Sessions
                    </Button>
                    <TestEmailButton />
                    {hasChanges && (
                        <Badge variant="secondary" className="animate-pulse">
                            Unsaved Changes
                        </Badge>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
                {/* Organization Name */}
                <div>
                    <Label htmlFor="orgName" className="text-sm font-bold text-slate-700 mb-2 block">
                        Organization Name *
                    </Label>
                    <Input
                        id="orgName"
                        type="text"
                        value={formData.orgName}
                        onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                        className="text-lg"
                        placeholder="e.g., IMS Corporation"
                    />
                    <p className="text-xs text-slate-500 mt-1">This name will appear in headers and reports.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Borrow Limit */}
                    <div>
                        <Label htmlFor="borrowLimit" className="text-sm font-bold text-slate-700 mb-2 block">
                            Borrow Limit (Days) *
                        </Label>
                        <Input
                            id="borrowLimit"
                            type="number"
                            min="1"
                            max="365"
                            value={formData.borrowLimit}
                            onChange={(e) => setFormData({ ...formData, borrowLimit: parseInt(e.target.value) || 1 })}
                        />
                        <p className="text-xs text-slate-500 mt-1">Maximum days an item can be borrowed.</p>
                    </div>

                    {/* Check Interval */}
                    <div>
                        <Label htmlFor="checkInterval" className="text-sm font-bold text-slate-700 mb-2 block">
                            Check-in Interval (Days) *
                        </Label>
                        <Input
                            id="checkInterval"
                            type="number"
                            min="1"
                            max="30"
                            value={formData.checkInterval}
                            onChange={(e) => setFormData({ ...formData, checkInterval: parseInt(e.target.value) || 1 })}
                        />
                        <p className="text-xs text-slate-500 mt-1">How often users must verify borrowed items.</p>
                    </div>
                </div>

                {/* Footer Text */}
                <div>
                    <Label htmlFor="footerText" className="text-sm font-bold text-slate-700 mb-2 block">
                        Footer Copyright Text
                    </Label>
                    <Input
                        id="footerText"
                        type="text"
                        value={formData.footerText}
                        onChange={(e) => setFormData({ ...formData, footerText: e.target.value })}
                        placeholder="e.g., © 2026 IMS Asset Management System"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Maintenance Alert Toggle */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                            type="checkbox"
                            id="maintenanceAlert"
                            checked={formData.maintenanceAlert}
                            onChange={(e) => setFormData({ ...formData, maintenanceAlert: e.target.checked })}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
                        />
                        <Label htmlFor="maintenanceAlert" className="text-sm font-bold text-slate-700 cursor-pointer">
                            Enable Maintenance Alerts
                        </Label>
                    </div>

                    {/* Registration Toggle */}
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                            type="checkbox"
                            id="allowRegistration"
                            checked={formData.allowRegistration}
                            onChange={(e) => setFormData({ ...formData, allowRegistration: e.target.checked })}
                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 cursor-pointer"
                        />
                        <Label htmlFor="allowRegistration" className="text-sm font-bold text-slate-700 cursor-pointer">
                            Allow User Registration
                        </Label>
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-100 flex gap-3">
                    <Button
                        type="submit"
                        disabled={submitting || !hasChanges}
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                    >
                        <Save size={18} className="mr-2" />
                        {submitting ? 'Saving...' : 'Save Configuration'}
                    </Button>
                    {hasChanges && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleReset}
                        >
                            Reset Changes
                        </Button>
                    )}
                </div>
            </form>

            {/* Info Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    💡 Configuration Guide
                </h3>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li><strong>Organization Name</strong>: Displayed in the application header and printed tags.</li>
                    <li><strong>Borrow Limit</strong>: Default maximum duration for borrowing durable assets.</li>
                    <li><strong>Check-in Interval</strong>: Users will be prompted to verify asset condition every X days.</li>
                    <li><strong>Maintenance Alerts</strong>: Send notifications when items require maintenance.</li>
                </ul>
            </div>
        </div>
    );
}
