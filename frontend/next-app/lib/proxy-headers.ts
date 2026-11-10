/**
 * Pure header-builder for proxy → backend requests.
 *
 * Security invariant: x-user-id / x-user-role / x-internal-key sent by the
 * browser are NEVER trusted. They are stripped unconditionally and rebuilt
 * from the server-side session only. Without the strip, a client could send
 * `x-user-role: superadmin` and have it forwarded verbatim.
 */

export type ProxySessionIdentity = {
    id?: string | number | null;
    roles?: string[];
};

const STRIPPED_HEADERS = ['x-user-id', 'x-user-role', 'x-internal-key'] as const;

export function buildBackendHeaders(
    reqHeaders: Headers,
    session: ProxySessionIdentity | null | undefined,
    internalKey: string | undefined,
): Headers {
    const headers = new Headers(reqHeaders);

    for (const name of STRIPPED_HEADERS) {
        headers.delete(name);
    }

    if (internalKey) {
        headers.set('x-internal-key', internalKey);
    }

    const userId = session?.id;
    const roles = session?.roles;
    if (userId != null && roles && roles.length > 0) {
        headers.set('x-user-id', String(userId));
        headers.set('x-user-role', roles.join(','));
    }

    return headers;
}
