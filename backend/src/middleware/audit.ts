import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * Audit context middleware.
 *
 * Stamps a UUID `requestId` on every inbound request and stages a normalized
 * `auditContext` ({ ipAddress, userAgent, requestId }) on `req` so any
 * downstream controller writing to `AuditLog` can pull a consistent shape
 * without re-parsing headers.
 *
 * The `x-request-id` header is honored when an upstream proxy (e.g. Cloudflare
 * Tunnel) already minted one — useful for correlating logs across hops. When
 * absent we mint a fresh UUID.
 *
 * Mount AFTER `requireAuth` / `authenticateToken` so `req.user` is available;
 * controllers can then write:
 *
 *   await prisma.auditLog.create({
 *     data: {
 *       userId: req.user!.id,
 *       action: 'CREATE',
 *       entity: 'InventoryItem',
 *       entityId: created.id.toString(),
 *       ...req.auditContext,
 *     },
 *   });
 */
export type AuditContext = {
    ipAddress: string | null;
    userAgent: string | null;
    requestId: string;
};

declare global {
    // Augment Express Request without adding a /// reference everywhere.
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            auditContext?: AuditContext;
        }
    }
}

const HEADER_REQUEST_ID = 'x-request-id';

function pickIpAddress(req: Request): string | null {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
        return xff.split(',')[0].trim();
    }
    if (Array.isArray(xff) && xff.length > 0) {
        return xff[0].split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string') return realIp;
    return req.ip ?? null;
}

export function auditContext() {
    return (req: Request, res: Response, next: NextFunction) => {
        const incoming = req.headers[HEADER_REQUEST_ID];
        const requestId =
            (typeof incoming === 'string' && incoming.length > 0
                ? incoming
                : Array.isArray(incoming) && incoming.length > 0
                  ? incoming[0]
                  : null) ?? randomUUID();

        // Echo it back so callers can correlate.
        res.setHeader(HEADER_REQUEST_ID, requestId);

        const userAgent = req.headers['user-agent'];

        req.auditContext = {
            ipAddress: pickIpAddress(req),
            userAgent: typeof userAgent === 'string' ? userAgent : null,
            requestId,
        };

        next();
    };
}

/**
 * Convenience wrapper: build the `auditContext` shape from any request.
 * Useful for callers who want a one-shot read without mounting the
 * middleware (e.g. a non-Express job runner).
 */
export function buildAuditContext(req: Request): AuditContext {
    if (req.auditContext) return req.auditContext;
    const userAgent = req.headers['user-agent'];
    return {
        ipAddress: pickIpAddress(req),
        userAgent: typeof userAgent === 'string' ? userAgent : null,
        requestId: randomUUID(),
    };
}
