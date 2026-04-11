import { redirect } from "next/navigation";
import { LoggingSettingsForm } from "./LoggingSettingsForm";
import { getServerT } from "@/lib/i18n/server";
import { requireRole, SUPERADMIN_ONLY } from "@/lib/auth-guards";

export default async function LoggingSettingsPage() {
    const session = await requireRole(...SUPERADMIN_ONLY);

    if (!session?.user) {
        redirect("/dashboard");
    }

    const { t } = await getServerT();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">{t('settings.logging.title')}</h1>
                <p className="text-slate-500">{t('settings.logging.subtitle')}</p>
            </div>

            <LoggingSettingsForm />
        </div>
    );
}
