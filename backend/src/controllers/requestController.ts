
import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';

interface AuthRequest extends Request {
    user?: any;
}

const requestSchema = z.object({
    items: z.string(),
    type: z.string(), // withdraw, borrow, return
    assetId: z.number().optional(),
});

export const getRequests = async (req: AuthRequest, res: Response) => {
    try {
        const { role, userId } = req.user;

        let where = {};
        if (role === 'user') {
            where = { userId };
        }

        const requests = await prisma.request.findMany({
            where,
            include: { user: { select: { name: true, email: true, department: true } } },
            orderBy: { date: 'desc' },
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching requests', error });
    }
};

export const createRequest = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.user;
        const data = requestSchema.parse(req.body);

        const request = await prisma.request.create({
            data: {
                ...data,
                userId,
            },
        });
        res.status(201).json(request);
    } catch (error) {
        res.status(400).json({ message: 'Error creating request', error });
    }
};

export const updateRequestStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const request = await prisma.request.update({
            where: { id: parseInt(id) },
            data: { status },
        });
        res.json(request);
    } catch (error) {
        res.status(400).json({ message: 'Error updating request', error });
    }
};
