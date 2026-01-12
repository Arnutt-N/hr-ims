/**
 * Thai Date Utilities (พ.ศ. - Buddhist Era)
 * Converts Gregorian dates to Buddhist calendar format
 */

import { format } from 'date-fns';
import { th } from 'date-fns/locale';

/**
 * Format date as "12 มกราคม 2569"
 */
export function formatThaiDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const buddhistYear = d.getFullYear() + 543;
    return format(d, 'd MMMM', { locale: th }) + ' ' + buddhistYear;
}

/**
 * Format date as "12/01/69"
 */
export function formatThaiDateShort(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const buddhistYear = (d.getFullYear() + 543).toString().slice(-2);
    return format(d, 'dd/MM/') + buddhistYear;
}

/**
 * Format date as "12 ม.ค. 2569, 14:30 น."
 */
export function formatThaiDateTime(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const buddhistYear = d.getFullYear() + 543;
    return format(d, 'd MMM', { locale: th }) + ' ' + buddhistYear +
        ', ' + format(d, 'HH:mm') + ' น.';
}

/**
 * Format relative time: "2 ชั่วโมงที่แล้ว"
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return formatThaiDateShort(d);
}

/**
 * Get Buddhist year from date
 */
export function getBuddhistYear(date: Date | string): number {
    const d = new Date(date);
    return d.getFullYear() + 543;
}
