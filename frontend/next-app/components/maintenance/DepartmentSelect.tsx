'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Department picker for the maintenance request location field.
 * PRP v6 Q6 — uses existing Department table via getDepartments Server Action.
 *
 * Lazy-loads departments on mount to keep the form bundle slim. Optional —
 * value can be undefined (request is location-agnostic).
 */

interface Department {
    id: number;
    name: string;
    abbr?: string | null;
}

interface DepartmentSelectProps {
    value: number | null;
    onChange: (id: number | null) => void;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

export function DepartmentSelect({
    value,
    onChange,
    disabled,
    className,
    placeholder = 'เลือกหน่วยงาน (ไม่บังคับ)',
}: DepartmentSelectProps) {
    const [departments, setDepartments] = useState<Department[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const { getDepartments } = await import('@/lib/actions/departments');
                const result = await getDepartments();
                if (cancelled) return;
                if (result && 'departments' in result && Array.isArray(result.departments)) {
                    setDepartments(result.departments as Department[]);
                } else {
                    setError('โหลดรายการหน่วยงานไม่สำเร็จ');
                }
            } catch {
                if (!cancelled) setError('โหลดรายการหน่วยงานไม่สำเร็จ');
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <select
                value={value ?? ''}
                onChange={(e) => {
                    const v = e.target.value;
                    onChange(v === '' ? null : Number.parseInt(v, 10));
                }}
                disabled={disabled || !departments}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
            >
                <option value="">{placeholder}</option>
                {departments?.map((d) => (
                    <option key={d.id} value={d.id}>
                        {d.abbr ? `${d.abbr} — ${d.name}` : d.name}
                    </option>
                ))}
            </select>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}
