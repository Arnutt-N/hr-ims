import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BackupSettingsForm } from "./BackupSettingsForm";

export default async function BackupSettingsPage() {
    const session = await auth();

    if (!session?.user || session.user.role !== "superadmin") {
        redirect("/dashboard");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Backup & Restore</h1>
                <p className="text-slate-500">ตั้งค่าการสำรองและกู้คืนข้อมูล</p>
            </div>

            <BackupSettingsForm />
        </div>
    );
}
