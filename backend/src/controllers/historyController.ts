
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

interface AuthRequest extends Request {
    user?: any;
}

export const getHistory = async (req: AuthRequest, res: Response) => {
    try {
        const { role, userId } = req.user;

        let where = {};
        if (role === 'user') {
            where = { userId };
        }

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
