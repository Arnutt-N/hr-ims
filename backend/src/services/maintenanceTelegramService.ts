/**
 * Backend telegram alert for maintenance escalation events.
 * PRP v6 Phase 5 — env-gated; mirrors frontend lib/maintenance/telegram-service.ts
 * but lives in backend because the cron worker runs server-side here, not in
 * the Next.js process.
 */

import { logError } from '../utils/logger';

interface EscalationAlertPayload {
    requestId: number;
    title: string;
    severity: string;
    assigneeName: string;
    hoursOverdue: number;
}

const MAX_TG_LEN = 4096;

function formatEscalationMessage(p: EscalationAlertPayload): string {
    const msg = [
        `⏰ *MAINTENANCE ESCALATION — Request #${p.requestId}*`,
        ``,
        `*${p.title}*`,
        ``,
        `Severity: ${p.severity.toUpperCase()}`,
        `Assigned to: ${p.assigneeName}`,
        `Overdue: ~${p.hoursOverdue.toFixed(1)} hours`,
        ``,
        `Action required: reassign or follow up.`,
    ].join('\n');
    return msg.length > MAX_TG_LEN ? msg.slice(0, MAX_TG_LEN - 4) + '\n...' : msg;
}

export async function sendEscalationAlert(payload: EscalationAlertPayload): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!token || !chatId) {
        // Env-gated no-op — expected in dev/CI without secrets
        return false;
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: formatEscalationMessage(payload),
                parse_mode: 'Markdown',
            }),
        });

        if (!response.ok) {
            await logError(
                `[telegram] sendEscalationAlert failed: HTTP ${response.status}`,
                new Error(response.statusText),
            );
            return false;
        }
        return true;
    } catch (err) {
        await logError('[telegram] sendEscalationAlert threw', err as Error);
        return false;
    }
}
