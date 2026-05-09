'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

/**
 * Render a list of UploadThing photo URLs as a thumbnail grid with
 * lightbox preview on click. PRP v6 — Phase 3.
 *
 * Accepts the JSON-string form stored on MaintenanceRequest.photos OR
 * a parsed array. Empty/null input renders nothing (no placeholder).
 */

interface PhotoGalleryProps {
    photos: string | string[] | null | undefined;
    className?: string;
}

function parsePhotos(input: string | string[] | null | undefined): string[] {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    try {
        const parsed = JSON.parse(input);
        return Array.isArray(parsed) ? parsed.filter((u): u is string => typeof u === 'string') : [];
    } catch {
        return [];
    }
}

export function PhotoGallery({ photos, className }: PhotoGalleryProps) {
    const urls = parsePhotos(photos);
    const [lightbox, setLightbox] = useState<string | null>(null);

    if (urls.length === 0) return null;

    return (
        <>
            <div className={cn('flex flex-wrap gap-2', className)}>
                {urls.map((url, idx) => (
                    <button
                        key={url}
                        type="button"
                        onClick={() => setLightbox(url)}
                        className="group relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition hover:border-indigo-400"
                        aria-label={`ดูรูปที่ ${idx + 1}`}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={url}
                            alt={`ภาพประกอบ ${idx + 1}`}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                    </button>
                ))}
            </div>

            {lightbox && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setLightbox(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="แสดงภาพขนาดเต็ม"
                >
                    <button
                        type="button"
                        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            setLightbox(null);
                        }}
                        aria-label="ปิดภาพ"
                    >
                        <X size={20} />
                    </button>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={lightbox}
                        alt="ภาพขนาดเต็ม"
                        className="max-h-full max-w-full rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
}
