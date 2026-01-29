import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SystemSettingsForm } from "./SystemSettingsForm";

export default async function SystemSettingsPage() {
    const session = await auth();

    if (!session?.user || session.user.role !== "superadmin") {
        redirect("/dashboard");
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">System Configuration</h1>
                <p className="text-slate-500">ตั้งค่าระบบหลักและการทำงานทั่วไป</p>
            </div>

            <SystemSettingsForm />
        </div>
    );
}
