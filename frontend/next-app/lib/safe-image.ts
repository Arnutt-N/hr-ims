export function getSafeImageSrc(src?: string | null): string | null {
    const value = src?.trim();
    if (!value) return null;

    if (/^(https?:\/\/|\/|data:image\/|blob:)/i.test(value)) {
        return value;
    }

    return null;
}
