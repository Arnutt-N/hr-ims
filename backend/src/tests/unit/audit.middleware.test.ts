import type { Request, Response } from 'express';
import { auditContext, buildAuditContext } from '../../middleware/audit';

describe('audit context middleware', () => {
    function makeReq(overrides: Partial<Request> = {}): Request {
        return {
            headers: {},
            ip: '127.0.0.1',
            ...overrides,
        } as Request;
    }

    function makeRes(): { res: Response; setHeader: jest.Mock } {
        const setHeader = jest.fn();
        const res = { setHeader } as unknown as Response;
        return { res, setHeader };
    }

    it('mints a UUID requestId when none is supplied', () => {
        const req = makeReq();
        const { res, setHeader } = makeRes();
        const next = jest.fn();

        auditContext()(req, res, next);

        expect(req.auditContext).toBeDefined();
        expect(req.auditContext!.requestId).toMatch(/^[0-9a-f-]{36}$/i);
        expect(setHeader).toHaveBeenCalledWith('x-request-id', req.auditContext!.requestId);
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('honours an inbound x-request-id and echoes it back', () => {
        const req = makeReq({ headers: { 'x-request-id': 'edge-trace-42' } });
        const { res, setHeader } = makeRes();

        auditContext()(req, res, jest.fn());

        expect(req.auditContext!.requestId).toBe('edge-trace-42');
        expect(setHeader).toHaveBeenCalledWith('x-request-id', 'edge-trace-42');
    });

    it('extracts client IP from x-forwarded-for (first hop)', () => {
        const req = makeReq({
            headers: {
                'x-forwarded-for': '203.0.113.5, 10.0.0.1',
                'user-agent': 'TestAgent/1.0',
            },
        });
        const { res } = makeRes();

        auditContext()(req, res, jest.fn());

        expect(req.auditContext!.ipAddress).toBe('203.0.113.5');
        expect(req.auditContext!.userAgent).toBe('TestAgent/1.0');
    });

    it('falls back to x-real-ip when x-forwarded-for is absent', () => {
        const req = makeReq({ headers: { 'x-real-ip': '198.51.100.10' } });
        auditContext()(req, makeRes().res, jest.fn());
        expect(req.auditContext!.ipAddress).toBe('198.51.100.10');
    });

    it('falls back to req.ip when no proxy headers present', () => {
        const req = makeReq({ ip: '10.0.0.42', headers: {} });
        auditContext()(req, makeRes().res, jest.fn());
        expect(req.auditContext!.ipAddress).toBe('10.0.0.42');
    });

    describe('buildAuditContext (one-shot helper)', () => {
        it('returns the existing req.auditContext when middleware already ran', () => {
            const req = makeReq();
            req.auditContext = { ipAddress: '1.2.3.4', userAgent: 'X', requestId: 'fixed' };
            expect(buildAuditContext(req)).toEqual(req.auditContext);
        });

        it('synthesises a context when middleware did NOT run', () => {
            const req = makeReq({
                ip: '10.0.0.7',
                headers: { 'user-agent': 'OneShot/1.0' },
            });
            const ctx = buildAuditContext(req);
            expect(ctx.ipAddress).toBe('10.0.0.7');
            expect(ctx.userAgent).toBe('OneShot/1.0');
            expect(ctx.requestId).toMatch(/^[0-9a-f-]{36}$/i);
        });
    });
});
