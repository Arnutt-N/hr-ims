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
import { Save, Loader2 } from "lucide-react";

const systemSettingsSchema = z.object({
    orgName: z.string().min(1, "Organization name is required"),
    footerText: z.string().optional(),
    borrowLimit: z.number().min(1).max(365),
    checkInterval: z.number().min(1).max(90),
    maintenanceAlert: z.boolean(),
    allowRegistration: z.boolean(),
});

type SystemSettingsFormData = z.infer<typeof systemSettingsSchema>;

export function SystemSettingsForm() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<SystemSettingsFormData>({
        resolver: zodResolver(systemSettingsSchema),
        defaultValues: {
            orgName: "IMS Corporation",
            footerText: "IMS Asset Management System",
            borrowLimit: 7,
            checkInterval: 7,
            maintenanceAlert: true,
            allowRegistration: false,
        },
    });

    // Load settings on mount
    useEffect(() => {
        async function loadSettings() {
            try {
                const response = await fetch("/api/settings");
                if (response.ok) {
                    const data = await response.json();
                    setValue("orgName", data.orgName);
                    setValue("footerText", data.footerText || "");
                    setValue("borrowLimit", data.borrowLimit);
                    setValue("checkInterval", data.checkInterval);
                    setValue("maintenanceAlert", data.maintenanceAlert);
                    setValue("allowRegistration", data.allowRegistration);
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

    const onSubmit = async (data: SystemSettingsFormData) => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                toast.success("Settings saved successfully");
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                    <CardDescription>ตั้งค่าทั่วไปของระบบ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="orgName">Organization Name</Label>
                        <Input
                            id="orgName"
                            {...register("orgName")}
                            placeholder="IMS Corporation"
                        />
                        {errors.orgName && (
                            <p className="text-sm text-red-500">{errors.orgName.message}</p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="footerText">Footer Text</Label>
                        <Input
                            id="footerText"
                            {...register("footerText")}
                            placeholder="IMS Asset Management System"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Borrow Settings</CardTitle>
                    <CardDescription>ตั้งค่าการยืมพัสดุ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="borrowLimit">Borrow Limit (Days)</Label>
                        <Input
                            id="borrowLimit"
                            type="number"
                            {...register("borrowLimit", { valueAsNumber: true })}
                        />
                        {errors.borrowLimit && (
                            <p className="text-sm text-red-500">{errors.borrowLimit.message}</p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="checkInterval">Check Interval (Days)</Label>
                        <Input
                            id="checkInterval"
                            type="number"
                            {...register("checkInterval", { valueAsNumber: true })}
                        />
                        {errors.checkInterval && (
                            <p className="text-sm text-red-500">{errors.checkInterval.message}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>System Features</CardTitle>
                    <CardDescription>เปิด/ปิดฟีเจอร์ต่างๆ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Maintenance Alert</Label>
                            <p className="text-sm text-slate-500">แจ้งเตือนเมื่อถึงกำหนดซ่อมบำรุง</p>
                        </div>
                        <Switch
                            checked={watch("maintenanceAlert")}
                            onCheckedChange={(checked) => setValue("maintenanceAlert", checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Allow Registration</Label>
                            <p className="text-sm text-slate-500">อนุญาตให้ผู้ใช้ลงทะเบียนใหม่ได้</p>
                        </div>
                        <Switch
                            checked={watch("allowRegistration")}
                            onCheckedChange={(checked) => setValue("allowRegistration", checked)}
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
    );
}
