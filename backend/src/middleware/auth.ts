
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        role: string;
        roles?: string[];
        email?: string;
    };
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

// JWT-based authentication (for direct API calls)
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        // [2026-02-10] Modified by CodeX: normalize roles from token payload
        const roles = parseRoles(user?.roles ?? user?.role);
        req.user = {
            ...user,
            roles,
            role: roles[0] || user?.role
        };
        next();
    });
};

// Header-based authentication (for Next.js proxy requests)
// Next.js middleware injects x-user-id and x-user-role headers
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;

    if (!userId || !userRole) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required. Missing user headers.'
        });
    }

    // [2026-02-10] Modified by CodeX: support comma-separated multi-role header
    const roles = parseRoles(userRole);

    // Attach user info to request
    req.user = {
        id: parseInt(userId),
        role: roles[0] || userRole,
        roles
    };

    next();
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required.'
            });
        }

        // [2026-02-10] Modified by CodeX: accept any of multiple roles
        const roles = req.user.roles && req.user.roles.length > 0
            ? req.user.roles
            : parseRoles(req.user.role);
        const hasRole = roles.some((role) => allowedRoles.includes(role));
        if (!hasRole) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
            });
        }

        next();
    };
};
