
import { Request, Response } from 'express';
import prisma from '../utils/prisma';

interface AuthRequest extends Request {
    user?: any;
}

export const getMyAssets = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.user;

        // For now, we simulate assets based on 'borrow' requests that are 'approved'
        // in a real app, you might have a dedicated Asset model linked to user
        // or status on InventoryItem itself.

        // Let's query requests for now as a proxy, or ideally use the Request model
        // to find items currently borrowed by this user.

        const borrowedRequests = await prisma.request.findMany({
            where: {
                userId,
                status: 'approved',
                type: 'borrow'
            },
            orderBy: { date: 'desc' }
        });

        // Transform into "My Assets" format expected by frontend
        const assets = borrowedRequests.map((req: any) => ({
            id: req.id,
            name: req.items, // Simplification
            status: 'normal', // Default
            borrowDate: req.date,
        }));

        res.json(assets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assets', error });
    }
};
