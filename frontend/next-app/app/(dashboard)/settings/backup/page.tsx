import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BackupSettingsForm } from "./BackupSettingsForm";
import { getServerT } from "@/lib/i18n/server";

export default async function BackupSettingsPage() {
    const session = await auth();

    if (!session?.user || session.user.role !== "superadmin") {
        redirect("/dashboard");
    }

    const { t } = await getServerT();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('settings.backup.title')}</h1>
                <p className="text-slate-500">{t('settings.backup.subtitle')}</p>
            </div>

            <BackupSettingsForm />
        </div>
    );
}
