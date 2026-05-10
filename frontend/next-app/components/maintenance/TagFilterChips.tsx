'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface TagFilterChipsProps {
    selected: string[];
    onChange: (tags: string[]) => void;
    className?: string;
}

/**
 * Toggle-on-click tag filter chips for /maintenance list page.
 * Loads available tags from getMaintenanceTags on mount; shows selected
 * (highlighted) + suggested (muted) chips. PRP v6 Phase 3 commit #2.
 */
export function TagFilterChips({ selected, onChange, className }: TagFilterChipsProps) {
    const [available, setAvailable] = useState<string[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const { getMaintenanceTags } = await import('@/lib/actions/maintenance');
                const result = await getMaintenanceTags();
                if (cancelled) return;
                if (result && 'tags' in result && Array.isArray(result.tags)) {
                    setAvailable(result.tags);
                }
            } catch {
                // ignore — silently degrade to no chips
            } finally {
                if (!cancelled) setLoaded(true);
            }
        }
        void load();
        return () => {
            cancelled = true;
        };
    }, []);

    const toggle = (tag: string) => {
        if (selected.includes(tag)) {
            onChange(selected.filter((t) => t !== tag));
        } else {
            onChange([...selected, tag]);
        }
    };

    const merged = Array.from(new Set([...selected, ...available]));

    if (!loaded || merged.length === 0) return null;

    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
            <span className="text-xs font-medium text-slate-600">ป้าย:</span>
            {merged.map((tag) => {
                const isSelected = selected.includes(tag);
                return (
                    <button
                        key={tag}
                        type="button"
                        onClick={() => toggle(tag)}
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition',
                            isSelected
                                ? 'bg-indigo-600 text-white ring-indigo-600 hover:bg-indigo-700'
                                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50',
                        )}
                    >
                        {tag}
                        {isSelected && <X size={12} />}
                    </button>
                );
            })}
            {selected.length > 0 && (
                <button
                    type="button"
                    onClick={() => onChange([])}
                    className="text-xs text-slate-500 underline-offset-2 hover:underline"
                >
                    ล้างทั้งหมด
                </button>
            )}
        </div>
    );
}
