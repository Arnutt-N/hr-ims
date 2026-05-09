import "server-only";

import type { Severity } from "./types";

/**
 * Telegram alert for critical maintenance requests (PRP v6 Q11).
 *
 * Env-gated: if TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is unset,
 * `sendMaintenanceAlert` is a silent no-op (returns false). This lets local
 * dev and CI run without Telegram credentials; production sets both env
 * vars in Vercel.
 *
 * Failures (network, 4xx/5xx from Telegram API) are logged via console.error
 * and swallowed — alerting is best-effort, must NEVER block the upstream
 * Server Action that creates a request.
 */

interface MaintenanceAlertPayload {
    requestId: number;
    title: string;
    description: string;
    severity: Severity;
    reporterName: string;
    itemNames: string[]; // up to 20 (PRP createMaintenanceRequest cap)
    locationName?: string | null;
}

const MAX_TELEGRAM_MESSAGE_LENGTH = 4096; // Telegram hard limit

function formatAlertMessage(payload: MaintenanceAlertPayload): string {
    const sevEmoji =
        payload.severity === "critical" ? "🚨" : payload.severity === "high" ? "⚠️" : "ℹ️";
    const items = payload.itemNames.slice(0, 5).join(", ");
    const itemSuffix = payload.itemNames.length > 5 ? ` (+${payload.itemNames.length - 5} more)` : "";
    const location = payload.locationName ? `\n📍 Location: ${payload.locationName}` : "";

    const msg = [
        `${sevEmoji} *${payload.severity.toUpperCase()} Maintenance Request #${payload.requestId}*`,
        ``,
        `*${payload.title}*`,
        ``,
        payload.description,
        ``,
        `🔧 Items: ${items}${itemSuffix}`,
        `👤 Reporter: ${payload.reporterName}${location}`,
    ].join("\n");

    return msg.length > MAX_TELEGRAM_MESSAGE_LENGTH
        ? msg.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH - 4) + "\n..."
        : msg;
}

export async function sendMaintenanceAlert(
    payload: MaintenanceAlertPayload,
): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || !chatId) {
        // Env-gated no-op — expected in dev/CI without secrets
        return false;
    }

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: formatAlertMessage(payload),
                    parse_mode: "Markdown",
                }),
            },
        );

        if (!response.ok) {
            console.error(
                `[telegram] sendMaintenanceAlert failed: HTTP ${response.status} ${response.statusText}`,
            );
            return false;
        }
        return true;
    } catch (err) {
        console.error("[telegram] sendMaintenanceAlert threw:", err);
        return false;
    }
}
