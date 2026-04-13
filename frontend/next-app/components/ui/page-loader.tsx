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
 * CSS-only animations — renders as a Server Component with no client runtime.
 * Respects `prefers-reduced-motion` via Tailwind's `motion-reduce:` variant.
 */
export function PageLoader({ label }: PageLoaderProps) {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="flex items-center justify-center min-h-[50vh] w-full"
        >
            <div className="flex flex-col items-center gap-4">
                <div className="relative h-14 w-14">
                    <div
                        className="absolute inset-0 rounded-full border-[3px] border-slate-200"
                        aria-hidden="true"
                    />
                    <div
                        className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-600 border-r-indigo-600 animate-spin motion-reduce:animate-none"
                        aria-hidden="true"
                    />
                </div>

                <div
                    className="flex items-center gap-1.5 motion-reduce:hidden"
                    aria-hidden="true"
                >
                    {[0, 150, 300].map((delay) => (
                        <span
                            key={delay}
                            className="block h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"
                            style={{ animationDelay: `${delay}ms` }}
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
