import { requireRole } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const createRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('Auth middleware', () => {
    test('requireAuth parses multi-role header', () => {
        process.env.INTERNAL_API_KEY = 'test-internal-key';
        jest.resetModules();
        const { requireAuth } = require('../../middleware/auth');

        const req: any = {
            headers: {
                'x-user-id': '123',
                'x-user-role': 'admin, approver',
                'x-internal-key': 'test-internal-key',
            }
        };
        const res = createRes();
        const next = jest.fn();

        requireAuth(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.role).toBe('admin');
        expect(req.user.roles).toEqual(['admin', 'approver']);
    });

    test('requireRole allows when any role matches', () => {
        const req: any = {
            user: {
                role: 'user',
                roles: ['user', 'admin']
            }
        };
        const res = createRes();
        const next = jest.fn();

        const middleware = requireRole(['admin']);
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('requireRole blocks when no role matches', () => {
        const req: any = {
            user: {
                role: 'user',
                roles: ['user']
            }
        };
        const res = createRes();
        const next = jest.fn();

        const middleware = requireRole(['admin']);
        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('requireAuth returns 401 when INTERNAL_API_KEY is unset even if x-internal-key is absent (F-002)', () => {
        const prevKey = process.env.INTERNAL_API_KEY;
        delete process.env.INTERNAL_API_KEY;
        try {
            const { requireAuth } = require('../../middleware/auth');
            const req: any = {
                headers: {
                    'x-user-id': '1',
                    'x-user-role': 'superadmin'
                }
            };
            const res = createRes();
            const next = jest.fn();

            requireAuth(req, res, next);

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(401);
        } finally {
            if (prevKey !== undefined) {
                process.env.INTERNAL_API_KEY = prevKey;
            }
        }
    });

    test('authenticateToken normalizes userId into req.user.id and req.user.userId (F-003)', () => {
        const jwt = require('jsonwebtoken');
        process.env.JWT_SECRET = 'test-secret';
        const token = jwt.sign({ userId: 42, role: 'technician' }, 'test-secret');
        const { authenticateToken } = require('../../middleware/auth');

        const req: any = { headers: { authorization: `Bearer ${token}` } };
        const res = createRes();
        const next = jest.fn();

        authenticateToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user.id).toBe(42);
        expect(req.user.userId).toBe(42);
    });

    test('historyController.getHistory scopes non-admin technician to own userId (F-019)', async () => {
        jest.resetModules();
        const findManyMock = jest.fn().mockResolvedValue([]);
        jest.doMock('../../utils/prisma', () => ({
            __esModule: true,
            default: { history: { findMany: findManyMock } }
        }));
        const { getHistory } = require('../../controllers/historyController');

        const req: any = { user: { id: 77, userId: 77, role: 'technician', roles: ['technician'] } };
        const res = createRes();
        await getHistory(req, res);

        expect(findManyMock).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 77 } })
        );
        expect(res.json).toHaveBeenCalledWith([]);
    });
});

describe('requireAuth fail-closed', () => {
    test('returns 401 for every request when INTERNAL_API_KEY is unset', () => {
        const prevKey = process.env.INTERNAL_API_KEY;
        delete process.env.INTERNAL_API_KEY;
        jest.resetModules();
        const { requireAuth } = require('../../middleware/auth');

        const req: any = {
            headers: {
                'x-user-id': '123',
                'x-user-role': 'superadmin',
            },
        };
        const res = createRes();
        const next = jest.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: 'Unauthorized' }),
        );

        if (prevKey === undefined) {
            delete process.env.INTERNAL_API_KEY;
        } else {
            process.env.INTERNAL_API_KEY = prevKey;
        }
    });

    test('rejects a spoofed key even if it matches the old hardcoded fallback', () => {
        const prevKey = process.env.INTERNAL_API_KEY;
        delete process.env.INTERNAL_API_KEY;
        jest.resetModules();
        const { requireAuth } = require('../../middleware/auth');

        const req: any = {
            headers: {
                'x-user-id': '123',
                'x-user-role': 'admin',
                'x-internal-key': 'test-internal-key',
            },
        };
        const res = createRes();
        const next = jest.fn();

        requireAuth(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();

        if (prevKey === undefined) {
            delete process.env.INTERNAL_API_KEY;
        } else {
            process.env.INTERNAL_API_KEY = prevKey;
        }
    });
});

describe('RBAC authorize middleware', () => {
    test('authorize allows when any role matches', () => {
        const req: any = {
            user: {
                role: 'user',
                roles: ['approver', 'admin']
            }
        };
        const res = createRes();
        const next = jest.fn();

        const middleware = authorize(['admin']);
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    test('authorize blocks when no role matches', () => {
        const req: any = {
            user: {
                role: 'user',
                roles: ['user']
            }
        };
        const res = createRes();
        const next = jest.fn();

        const middleware = authorize(['admin']);
        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
