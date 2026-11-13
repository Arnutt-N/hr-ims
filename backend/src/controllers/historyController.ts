
import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

const HISTORY_ALL_ROLES = ['superadmin', 'admin', 'auditor'];

export const getHistory = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id ?? req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const roles = req.user?.roles && req.user.roles.length > 0
            ? req.user.roles
            : [req.user?.role].filter((r): r is string => Boolean(r));

        const canViewAll = roles.some((r) => HISTORY_ALL_ROLES.includes(r));
        const where = canViewAll ? {} : { userId };

        const history = await prisma.history.findMany({
            where,
            include: { user: { select: { name: true } } },
            orderBy: { date: 'desc' },
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching history', error });
    }
};
