'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Send, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface EmailSettings {
    emailVerificationEnabled: boolean;
    emailSmtpHost: string;
    emailSmtpPort: number;
    emailSmtpUser: string;
    emailSmtpPass: string;
    emailFromAddress: string;
}

interface VerificationStatus {
    verified: boolean;
    verifiedAt?: string;
    pending?: boolean;
}

export default function EmailSettingsPage() {
    const [settings, setSettings] = useState<EmailSettings>({
        emailVerificationEnabled: false,
        emailSmtpHost: '',
        emailSmtpPort: 587,
        emailSmtpUser: '',
        emailSmtpPass: '',
        emailFromAddress: 'noreply@hr-ims.local',
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [sending, setSending] = useState(false);
    const [testEmail, setTestEmail] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);

    useEffect(() => {
        fetchSettings();
        fetchVerificationStatus();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setSettings({
                emailVerificationEnabled: data.emailVerificationEnabled ?? false,
                emailSmtpHost: data.emailSmtpHost ?? '',
                emailSmtpPort: data.emailSmtpPort ?? 587,
                emailSmtpUser: data.emailSmtpUser ?? '',
                emailSmtpPass: data.emailSmtpPass ?? '',
                emailFromAddress: data.emailFromAddress ?? 'noreply@hr-ims.local',
            });
        } catch (error) {
            toast.error('Failed to load settings');
        }
    };

    const fetchVerificationStatus = async () => {
        try {
            const res = await fetch('/api/email/status');
            if (res.ok) {
                const data = await res.json();
                setVerificationStatus(data);
            }
        } catch (error) {
            console.error('Failed to fetch verification status:', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });

            if (res.ok) {
                toast.success('Settings saved successfully');
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setConnectionStatus(null);
        try {
            const res = await fetch('/api/email/verify-connection');
            const data = await res.json();
            setConnectionStatus(data);

            if (data.success) {
                toast.success('Connection successful');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Failed to test connection');
        } finally {
            setTesting(false);
        }
    };

    const handleSendTestEmail = async () => {
        if (!testEmail) {
            toast.error('Please enter an email address');
            return;
        }

        setTesting(true);
        try {
            const res = await fetch('/api/email/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testEmail }),
            });

            if (res.ok) {
                toast.success('Test email sent successfully');
                setTestEmail('');
            } else {
                throw new Error('Failed to send test email');
            }
        } catch (error) {
            toast.error('Failed to send test email');
        } finally {
            setTesting(false);
        }
    };

    const handleSendVerification = async () => {
        setSending(true);
        try {
            const res = await fetch('/api/email/send-verification', {
                method: 'POST',
            });

            if (res.ok) {
                toast.success('Verification email sent');
                fetchVerificationStatus();
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Failed to send verification email');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to send verification email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Email Settings</h1>
                <p className="text-muted-foreground">
                    Configure email server and verification settings
                </p>
            </div>

            {/* Verification Status */}
            {verificationStatus && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Email Verification Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            {verificationStatus.verified ? (
                                <>
                                    <Badge variant="success" className="gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        Verified
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        Verified at: {new Date(verificationStatus.verifiedAt!).toLocaleString()}
                                    </span>
                                </>
                            ) : verificationStatus.pending ? (
                                <>
                                    <Badge variant="warning" className="gap-1">
                                        <RefreshCw className="h-3 w-3" />
                                        Pending
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        Verification email sent. Please check your inbox.
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Badge variant="destructive" className="gap-1">
                                        <XCircle className="h-3 w-3" />
                                        Not Verified
                                    </Badge>
                                    <Button
                                        size="sm"
                                        onClick={handleSendVerification}
                                        disabled={sending || !settings.emailVerificationEnabled}
                                    >
                                        {sending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4 mr-2" />
                                        )}
                                        Send Verification Email
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* SMTP Configuration */}
            <Card>
                <CardHeader>
                    <CardTitle>SMTP Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="smtpHost">SMTP Host</Label>
                            <Input
                                id="smtpHost"
                                value={settings.emailSmtpHost}
                                onChange={(e) => setSettings({ ...settings, emailSmtpHost: e.target.value })}
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtpPort">SMTP Port</Label>
                            <Input
                                id="smtpPort"
                                type="number"
                                value={settings.emailSmtpPort}
                                onChange={(e) => setSettings({ ...settings, emailSmtpPort: parseInt(e.target.value) || 587 })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="smtpUser">SMTP Username</Label>
                            <Input
                                id="smtpUser"
                                value={settings.emailSmtpUser}
                                onChange={(e) => setSettings({ ...settings, emailSmtpUser: e.target.value })}
                                placeholder="your-email@gmail.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="smtpPass">SMTP Password</Label>
                            <Input
                                id="smtpPass"
                                type="password"
                                value={settings.emailSmtpPass}
                                onChange={(e) => setSettings({ ...settings, emailSmtpPass: e.target.value })}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fromAddress">From Address</Label>
                        <Input
                            id="fromAddress"
                            value={settings.emailFromAddress}
                            onChange={(e) => setSettings({ ...settings, emailFromAddress: e.target.value })}
                            placeholder="noreply@yourdomain.com"
                        />
                    </div>

                    <div className="border-t my-4" />

                    {/* Connection Test */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                onClick={handleTestConnection}
                                disabled={testing}
                            >
                                {testing ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Test Connection
                            </Button>

                            {connectionStatus && (
                                <Badge variant={connectionStatus.success ? 'success' : 'destructive'}>
                                    {connectionStatus.success ? 'Connected' : 'Failed'}
                                </Badge>
                            )}
                        </div>

                        {/* Test Email */}
                        <div className="flex items-end gap-4">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="testEmail">Send Test Email To</Label>
                                <Input
                                    id="testEmail"
                                    type="email"
                                    value={testEmail}
                                    onChange={(e) => setTestEmail(e.target.value)}
                                    placeholder="test@example.com"
                                />
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleSendTestEmail}
                                disabled={testing || !testEmail}
                            >
                                {testing ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Send className="h-4 w-4 mr-2" />
                                )}
                                Send Test
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Feature Toggle */}
            <Card>
                <CardHeader>
                    <CardTitle>Features</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Email Verification</Label>
                            <p className="text-sm text-muted-foreground">
                                Require users to verify their email before accessing the system
                            </p>
                        </div>
                        <Switch
                            checked={settings.emailVerificationEnabled}
                            onCheckedChange={(checked) =>
                                setSettings({ ...settings, emailVerificationEnabled: checked })
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Save Settings
                </Button>
            </div>
        </div>
    );
}
