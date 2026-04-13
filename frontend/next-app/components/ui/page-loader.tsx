/**
 * Full-area centered loading indicator for page transitions.
 *
 * Spinner-only. Renders as a Server Component with no client runtime.
 * Respects `prefers-reduced-motion` via Tailwind's `motion-reduce:` variant.
 */
export function PageLoader() {
    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className="flex items-center justify-center min-h-[50vh] w-full"
        >
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
            <span className="sr-only">Loading</span>
        </div>
    );
}
