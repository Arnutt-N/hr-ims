import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoggingSettingsForm } from "./LoggingSettingsForm";

export default async function LoggingSettingsPage() {
    const session = await auth();

    if (!session?.user || session.user.role !== "superadmin") {
        redirect("/dashboard");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Logging Settings</h1>
                <p className="text-slate-500">ตั้งค่าการบันทึก Log และการตรวจสอบระบบ</p>
            </div>

            <LoggingSettingsForm />
        </div>
    );
}
