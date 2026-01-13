
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: number;
        role: string;
        email?: string;
    };
}

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
        req.user = user;
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

    // Attach user info to request
    req.user = {
        id: parseInt(userId),
        role: userRole
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

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
            });
        }

        next();
    };
};
