import { requireAuth, requireRole } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const createRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('Auth middleware', () => {
    test('requireAuth parses multi-role header', () => {
        const req: any = {
            headers: {
                'x-user-id': '123',
                'x-user-role': 'admin, approver'
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
