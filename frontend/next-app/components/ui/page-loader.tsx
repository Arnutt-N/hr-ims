'use client';

import { motion } from 'framer-motion';

type PageLoaderProps = {
    /** Optional label displayed below the spinner. Localized by caller. */
    label?: string;
};

/**
 * Full-area centered loading indicator for page transitions.
 *
 * Usage: place inside a `loading.tsx` file adjacent to `page.tsx`. Next.js
 * App Router automatically wraps the page in a Suspense boundary with this
 * as the fallback, so it shows instantly while the page compiles/streams.
 */
export function PageLoader({ label }: PageLoaderProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            className="flex flex-1 items-center justify-center min-h-[50vh] w-full"
        >
            <div className="flex flex-col items-center gap-4">
                {/* Dual-ring spinner — outer track + animated arc */}
                <div className="relative h-14 w-14">
                    <motion.div
                        className="absolute inset-0 rounded-full border-[3px] border-slate-200"
                        aria-hidden="true"
                    />
                    <motion.div
                        className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-600 border-r-indigo-600"
                        animate={{ rotate: 360 }}
                        transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            ease: 'linear',
                        }}
                        aria-hidden="true"
                    />
                </div>

                {/* Three-dot pulse under the spinner */}
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
