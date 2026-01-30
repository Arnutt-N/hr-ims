"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Loader2, FileText } from "lucide-react";

const loggingSettingsSchema = z.object({
    loggingEnabled: z.boolean(),
    logLevel: z.enum(["debug", "info", "warn", "error"]),
    logRetentionDays: z.number().min(7).max(365),
    auditLogEnabled: z.boolean(),
});

type LoggingSettingsFormData = z.infer<typeof loggingSettingsSchema>;

export function LoggingSettingsForm() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<LoggingSettingsFormData>({
        resolver: zodResolver(loggingSettingsSchema),
        defaultValues: {
            loggingEnabled: true,
            logLevel: "info",
            logRetentionDays: 30,
            auditLogEnabled: true,
        },
    });

    // Load settings on mount
    useEffect(() => {
        async function loadSettings() {
            try {
                const response = await fetch("/api/settings");
                if (response.ok) {
                    const data = await response.json();
                    setValue("loggingEnabled", data.loggingEnabled);
                    setValue("logLevel", data.logLevel);
                    setValue("logRetentionDays", data.logRetentionDays);
                    setValue("auditLogEnabled", data.auditLogEnabled);
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
                toast.error("Failed to load settings");
            } finally {
                setIsLoading(false);
            }
        }
        loadSettings();
    }, [setValue]);

    const onSubmit = async (data: LoggingSettingsFormData) => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                toast.success("Logging settings saved successfully");
            } else {
                const error = await response.json();
                toast.error(error.message || "Failed to save settings");
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const fetchLogs = async () => {
        try {
            // TODO: Implement API endpoint to fetch logs
            toast.info("Log viewer coming soon");
        } catch (error) {
            toast.error("Failed to fetch logs");
        }
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
                        <CardTitle>Logging Configuration</CardTitle>
                        <CardDescription>ตั้งค่าการบันทึก Log</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Enable Logging</Label>
                                <p className="text-sm text-slate-500">เปิดใช้งานการบันทึก Log</p>
                            </div>
                            <Switch
                                checked={watch("loggingEnabled")}
                                onCheckedChange={(checked: boolean) => setValue("loggingEnabled", checked)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="logLevel">Log Level</Label>
                            <select
                                id="logLevel"
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                {...register("logLevel")}
                            >
                                <option value="debug">Debug</option>
                                <option value="info">Info</option>
                                <option value="warn">Warning</option>
                                <option value="error">Error</option>
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="logRetentionDays">Log Retention (Days)</Label>
                            <Input
                                id="logRetentionDays"
                                type="number"
                                {...register("logRetentionDays", { valueAsNumber: true })}
                            />
                            {errors.logRetentionDays && (
                                <p className="text-sm text-red-500">{errors.logRetentionDays.message}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Enable Audit Log</Label>
                                <p className="text-sm text-slate-500">บันทึกการเปลี่ยนแปลงข้อมูล (CREATE, UPDATE, DELETE)</p>
                            </div>
                            <Switch
                                checked={watch("auditLogEnabled")}
                                onCheckedChange={(checked: boolean) => setValue("auditLogEnabled", checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
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
                    <CardTitle>Log Viewer</CardTitle>
                    <CardDescription>ดู Log ล่าสุด (Coming Soon)</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" onClick={fetchLogs} disabled>
                        <FileText className="mr-2 h-4 w-4" />
                        View Logs
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
