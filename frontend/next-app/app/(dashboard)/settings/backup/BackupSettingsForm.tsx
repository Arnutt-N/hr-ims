"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, Database, Download, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";

const backupSettingsSchema = z.object({
    backupEnabled: z.boolean(),
    backupSchedule: z.string().regex(/^\d+\s+\d+\s+\*\s+\*\s+\*$/),
    backupRetentionCount: z.number().min(1).max(30),
    backupStoragePath: z.string().min(1),
    backupIncludeUploads: z.boolean(),
});

type BackupSettingsFormData = z.infer<typeof backupSettingsSchema>;

export function BackupSettingsForm() {
    const { t } = useI18n();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [downloadingBackup, setDownloadingBackup] = useState<string | null>(null);
    const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
    const [backups, setBackups] = useState<Array<{
        filename: string;
        size: number;
        createdAt: string;
    }>>([]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<BackupSettingsFormData>({
        resolver: zodResolver(backupSettingsSchema),
        defaultValues: {
            backupEnabled: true,
            backupSchedule: "0 2 * * *",
            backupRetentionCount: 7,
            backupStoragePath: "./backups",
            backupIncludeUploads: true,
        },
    });

    const loadBackups = useCallback(async () => {
        const response = await fetch("/api/settings/backups");
        if (!response.ok) {
            throw new Error("Failed to load backups");
        }

        const data = await response.json();
        setBackups(data.backups || []);
    }, []);

    const loadData = useCallback(async () => {
        const settingsRes = await fetch("/api/settings");

        if (settingsRes.ok) {
            const data = await settingsRes.json();
            setValue("backupEnabled", data.backupEnabled);
            setValue("backupSchedule", data.backupSchedule);
            setValue("backupRetentionCount", data.backupRetentionCount);
            setValue("backupStoragePath", data.backupStoragePath);
            setValue("backupIncludeUploads", data.backupIncludeUploads);
        }

        await loadBackups();
    }, [loadBackups, setValue]);

    // Load settings and backups on mount
    useEffect(() => {
        async function initialize() {
            try {
                await loadData();
            } catch (error) {
                console.error("Failed to load data:", error);
                toast.error("Failed to load data");
            } finally {
                setIsLoading(false);
            }
        }

        initialize();
    }, [loadData]);

    const onSubmit = async (data: BackupSettingsFormData) => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const payload = await response.json().catch(() => ({}));

            if (response.ok) {
                toast.success(payload.message || "Backup settings saved successfully");
            } else {
                toast.error(payload.error || payload.message || "Failed to save settings");
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackupNow = async () => {
        setIsBackingUp(true);
        try {
            const response = await fetch("/api/settings/backup-now", {
                method: "POST"
            });
            const payload = await response.json().catch(() => ({}));

            if (response.ok) {
                toast.success(payload.message || "Backup completed successfully");
                await loadBackups();
            } else {
                toast.error(payload.error || payload.message || "Failed to run backup");
            }
        } catch (error) {
            console.error("Failed to start backup:", error);
            toast.error("Failed to run backup");
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleDownloadBackup = async (filename: string) => {
        setDownloadingBackup(filename);
        try {
            const response = await fetch(`/api/settings/backups/${encodeURIComponent(filename)}/download`);

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                toast.error(payload.error || payload.message || "Failed to download backup");
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Backup download started");
        } catch (error) {
            console.error("Failed to download backup:", error);
            toast.error("Failed to download backup");
        } finally {
            setDownloadingBackup(null);
        }
    };

    const handleRestoreBackup = async (filename: string) => {
        if (!window.confirm(`Restore backup "${filename}"? This will replace the current database.`)) {
            return;
        }

        setRestoringBackup(filename);
        try {
            const response = await fetch("/api/settings/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ backupPath: filename }),
            });
            const payload = await response.json().catch(() => ({}));

            if (response.ok) {
                toast.success(payload.message || "Backup restored successfully");
                await loadData();
                return;
            }

            toast.error(payload.error || payload.message || "Failed to restore backup");
        } catch (error) {
            console.error("Failed to restore backup:", error);
            toast.error("Failed to restore backup");
        } finally {
            setRestoringBackup(null);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-8">
                    <div className="flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('settings.backup.form.config')}</CardTitle>
                        <CardDescription>ตั้งค่าการสำรองข้อมูลอัตโนมัติ</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Enable Auto Backup</Label>
                                <p className="text-sm text-slate-500">เปิดใช้งานการสำรองข้อมูลอัตโนมัติ</p>
                            </div>
                            <Switch
                                checked={watch("backupEnabled")}
                                onCheckedChange={(checked: boolean) => setValue("backupEnabled", checked)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="backupSchedule">Schedule (Cron)</Label>
                            <Input
                                id="backupSchedule"
                                {...register("backupSchedule")}
                                placeholder="0 2 * * *"
                            />
                            <p className="text-sm text-slate-500">
                                ตัวอย่าง: 0 2 * * * = ทุกวันเวลา 02:00 น.
                            </p>
                            {errors.backupSchedule && (
                                <p className="text-sm text-red-500">{errors.backupSchedule.message}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="backupRetentionCount">Keep Backups (Count)</Label>
                            <Input
                                id="backupRetentionCount"
                                type="number"
                                {...register("backupRetentionCount", { valueAsNumber: true })}
                            />
                            {errors.backupRetentionCount && (
                                <p className="text-sm text-red-500">{errors.backupRetentionCount.message}</p>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="backupStoragePath">Storage Path</Label>
                            <Input
                                id="backupStoragePath"
                                {...register("backupStoragePath")}
                            />
                            {errors.backupStoragePath && (
                                <p className="text-sm text-red-500">{errors.backupStoragePath.message}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Include Uploads</Label>
                                <p className="text-sm text-slate-500">รวมไฟล์แนบในการสำรองข้อมูล</p>
                            </div>
                            <Switch
                                checked={watch("backupIncludeUploads")}
                                onCheckedChange={(checked: boolean) => setValue("backupIncludeUploads", checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleBackupNow}
                        disabled={isBackingUp}
                    >
                        {isBackingUp ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Backing up...
                            </>
                        ) : (
                            <>
                                <Database className="mr-2 h-4 w-4" />
                                Backup Now
                            </>
                        )}
                    </Button>

                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Settings
                            </>
                        )}
                    </Button>
                </div>
            </form>

            <Card>
                <CardHeader>
                    <CardTitle>{t('settings.backup.form.history')}</CardTitle>
                    <CardDescription>รายการสำรองข้อมูลล่าสุด</CardDescription>
                </CardHeader>
                <CardContent>
                    {backups.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">No backups found</p>
                    ) : (
                        <div className="space-y-2">
                            {backups.map((backup) => (
                                <div
                                    key={backup.filename}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                >
                                    <div>
                                        <p className="font-medium">{backup.filename}</p>
                                        <p className="text-sm text-slate-500">
                                            {formatSize(backup.size)} • {new Date(backup.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownloadBackup(backup.filename)}
                                            disabled={downloadingBackup === backup.filename || restoringBackup === backup.filename}
                                        >
                                            {downloadingBackup === backup.filename ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Download className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRestoreBackup(backup.filename)}
                                            disabled={downloadingBackup === backup.filename || restoringBackup === backup.filename}
                                        >
                                            {restoringBackup === backup.filename ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <RotateCcw className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
