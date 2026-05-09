'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const TAG_PATTERN = /^[a-zA-Z0-9-]+$/;
const MAX_TAGS = 10;
const MAX_TAG_LEN = 32;

interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    disabled?: boolean;
    placeholder?: string;
    className?: string;
}

export function TagInput({
    value,
    onChange,
    disabled,
    placeholder = 'พิมพ์แล้วกด Enter เพื่อเพิ่ม',
    className,
}: TagInputProps) {
    const [draft, setDraft] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!draft) {
            setSuggestions([]);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const { getMaintenanceTags } = await import('@/lib/actions/maintenance');
                const result = await getMaintenanceTags(draft);
                if (cancelled) return;
                if (result && 'tags' in result && Array.isArray(result.tags)) {
                    setSuggestions(result.tags.filter((t) => !value.includes(t)));
                }
            } catch {
                // ignore — autocomplete is best-effort
            }
        }, 200);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [draft, value]);

    const addTag = (raw: string) => {
        const tag = raw.trim().toLowerCase();
        if (!tag) return;
        if (value.length >= MAX_TAGS) {
            setError(`เพิ่มได้สูงสุด ${MAX_TAGS} ป้าย`);
            return;
        }
        if (tag.length > MAX_TAG_LEN) {
            setError(`ป้ายยาวเกิน ${MAX_TAG_LEN} ตัวอักษร`);
            return;
        }
        if (!TAG_PATTERN.test(tag)) {
            setError('ใช้ได้เฉพาะ a-z, 0-9, และขีด -');
            return;
        }
        if (value.includes(tag)) {
            setError('ป้ายซ้ำ');
            return;
        }
        onChange([...value, tag]);
        setDraft('');
        setError(null);
        setShowSuggestions(false);
    };

    const removeTag = (tag: string) => {
        onChange(value.filter((t) => t !== tag));
    };

    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <div
                className="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white p-2 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500"
                onClick={() => inputRef.current?.focus()}
            >
                {value.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(tag);
                            }}
                            disabled={disabled}
                            className="hover:text-indigo-900"
                            aria-label={`ลบป้าย ${tag}`}
                        >
                            <X size={12} />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => {
                        setDraft(e.target.value);
                        setError(null);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addTag(draft);
                        } else if (e.key === 'Backspace' && !draft && value.length > 0) {
                            removeTag(value[value.length - 1]);
                        }
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    onFocus={() => setShowSuggestions(true)}
                    disabled={disabled || value.length >= MAX_TAGS}
                    placeholder={value.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[8rem] border-0 bg-transparent text-sm focus:outline-none focus:ring-0"
                />
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="relative">
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                        {suggestions.slice(0, 8).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    addTag(s);
                                }}
                                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}
            <p className="text-xs text-slate-500">
                {value.length}/{MAX_TAGS} ป้าย • a-z, 0-9, -
            </p>
        </div>
    );
}
