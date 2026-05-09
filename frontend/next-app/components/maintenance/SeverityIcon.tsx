import { cn } from '@/lib/utils';
import { AlertTriangle, AlertCircle, AlertOctagon, Info } from 'lucide-react';
import type { Severity, Priority } from '@/lib/maintenance/types';

const SEVERITY_CONFIG: Record<Severity, { icon: typeof Info; color: string; label: string }> = {
    low: { icon: Info, color: 'text-slate-500', label: 'ผลกระทบต่ำ' },
    medium: { icon: AlertCircle, color: 'text-yellow-600', label: 'ผลกระทบกลาง' },
    high: { icon: AlertTriangle, color: 'text-orange-600', label: 'ผลกระทบสูง' },
    critical: { icon: AlertOctagon, color: 'text-red-600', label: 'ผลกระทบวิกฤต' },
};

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
    low: { color: 'bg-slate-100 text-slate-700 ring-slate-200', label: 'ความเร่งด่วนต่ำ' },
    normal: { color: 'bg-blue-100 text-blue-700 ring-blue-200', label: 'ปกติ' },
    high: { color: 'bg-orange-100 text-orange-700 ring-orange-200', label: 'เร่งด่วน' },
    urgent: { color: 'bg-red-100 text-red-700 ring-red-200', label: 'ด่วนมาก' },
};

interface SeverityIconProps {
    severity: Severity;
    showLabel?: boolean;
    className?: string;
}

export function SeverityIcon({ severity, showLabel = false, className }: SeverityIconProps) {
    const cfg = SEVERITY_CONFIG[severity];
    const Icon = cfg.icon;
    return (
        <span
            className={cn('inline-flex items-center gap-1.5', cfg.color, className)}
            title={cfg.label}
        >
            <Icon size={16} />
            {showLabel && <span className="text-xs font-medium">{cfg.label}</span>}
        </span>
    );
}

interface PriorityBadgeProps {
    priority: Priority;
    className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
    const cfg = PRIORITY_CONFIG[priority];
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                cfg.color,
                className,
            )}
        >
            {cfg.label}
        </span>
    );
}
