export type ActionResult<T = unknown> =
    | { success: true; data?: T }
    | { success: false; error: string };

export function logActionError(context: string, error: unknown): void {
    console.error(`[ActionError:${context}]`, error);
}
