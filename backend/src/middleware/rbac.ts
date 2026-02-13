
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
    user?: any;
}

const parseRoles = (raw: unknown): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.map((r) => String(r).trim()).filter(Boolean);
    }
    return String(raw)
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
};

export const authorize = (roles: string[] = []) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // [2026-02-10] Modified by CodeX: support multi-role authorization
        const userRoles = req.user?.roles && req.user.roles.length > 0
            ? req.user.roles
            : parseRoles(req.user?.role);
        const hasRole = roles.length === 0 || userRoles.some((r: string) => roles.includes(r));

        if (!hasRole) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        next();
    };
};
