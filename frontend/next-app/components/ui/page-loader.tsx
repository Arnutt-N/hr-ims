'use client';

import { motion, useReducedMotion } from 'framer-motion';

type PageLoaderProps = {
    /** Optional visible + sr-only label. Pass a translated string from the caller. */
    label?: string;
};

/**
 * Full-area centered loading indicator for page transitions.
 *
 * Usage: place inside a `loading.tsx` file adjacent to `page.tsx`. Next.js
 * App Router automatically wraps the page in a Suspense boundary with this
 * as the fallback, so it shows instantly while the page compiles/streams.
 *
 * Respects `prefers-reduced-motion` — falls back to a static indicator.
 */
export function PageLoader({ label }: PageLoaderProps) {
    const shouldReduceMotion = useReducedMotion();

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="flex items-center justify-center min-h-[60vh] w-full"
        >
            <div className="flex flex-col items-center gap-4">
                {/* Dual-ring spinner — outer track + animated arc */}
                <div className="relative h-14 w-14">
                    <div
                        className="absolute inset-0 rounded-full border-[3px] border-slate-200"
                        aria-hidden="true"
                    />
                    <motion.div
                        className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-600 border-r-indigo-600"
                        animate={shouldReduceMotion ? undefined : { rotate: 360 }}
                        transition={
                            shouldReduceMotion
                                ? undefined
                                : { duration: 0.9, repeat: Infinity, ease: 'linear' }
                        }
                        aria-hidden="true"
                    />
                </div>

                {/* Three-dot pulse (suppressed under reduced motion) */}
                {!shouldReduceMotion && (
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                        {[0, 1, 2].map((i) => (
                            <motion.span
                                key={i}
                                className="block h-1.5 w-1.5 rounded-full bg-slate-400"
                                animate={{
                                    opacity: [0.3, 1, 0.3],
                                    y: [0, -2, 0],
                                }}
                                transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    delay: i * 0.15,
                                    ease: 'easeInOut',
                                }}
                            />
                        ))}
                    </div>
                )}

                {label ? (
                    <span className="text-sm font-medium text-slate-500">
                        {label}
                    </span>
                ) : (
                    <span className="sr-only">Loading</span>
                )}
            </div>
        </div>
    );
}
